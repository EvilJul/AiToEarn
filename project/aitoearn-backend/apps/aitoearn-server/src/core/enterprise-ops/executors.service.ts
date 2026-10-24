import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { AppException, ResponseCode } from '@yikart/common'
import { AccountRepository } from '@yikart/mongodb'
import { EnterpriseContentService } from './content.service'
import { EnterpriseConflictException } from './enterprise-conflict.exception'
import { EnterprisePublishStatus, EnterpriseResourceKind, EnterpriseRole } from './enterprise.enums'
import { ENTERPRISE_OPTIONS, EnterpriseOptions, EnterpriseService } from './enterprise.service'
import { ClaimEnterpriseJobDto, EnterpriseExecutorEventDto, EnterpriseLeaseDto, RegisterEnterpriseExecutorDto } from './executors.dto'
import { EnterpriseExecutorRepository } from './executors.repository'
import { EnterpriseOperationsRepository } from './operations.repository'
import { EnterprisePublishingService, validateRednoteLink } from './publishing.service'
import { EnterpriseResourcesService } from './resources.service'

@Injectable()
export class EnterpriseExecutorsService {
  private readonly leaseDurationMs = 90000

  constructor(
    private readonly access: EnterpriseService,
    private readonly repository: EnterpriseExecutorRepository,
    private readonly operations: EnterpriseOperationsRepository,
    private readonly content: EnterpriseContentService,
    private readonly publishing: EnterprisePublishingService,
    private readonly resources: EnterpriseResourcesService,
    private readonly accounts: AccountRepository,
    @Inject(ENTERPRISE_OPTIONS) private readonly options: EnterpriseOptions,
  ) {}

  async list(userId: string, enterpriseId: string) {
    await this.access.authorize(userId, enterpriseId)
    return (await this.repository.listByEnterpriseId(enterpriseId)).map(executor => ({ id: String(executor._id), deviceId: executor.deviceId, accountId: executor.accountId, pluginVersion: executor.pluginVersion, capabilities: executor.capabilities, lastHeartbeatAt: executor.lastHeartbeatAt, revoked: !!executor.revokedAt, online: !executor.revokedAt && executor.lastHeartbeatAt.getTime() > Date.now() - this.leaseDurationMs }))
  }

  async register(userId: string, enterpriseId: string, dto: RegisterEnterpriseExecutorDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator])
    const binding = await this.resources.requireBinding(enterpriseId, EnterpriseResourceKind.Account, dto.accountId)
    const account = await this.accounts.getByIdAndUserId(dto.accountId, binding.ownerUserId)
    if (!account || account.uid !== dto.observedAccountUid)
      throw new AppException(ResponseCode.WorkNotBelongToAccount)
    const data = { deviceId: dto.deviceId, accountId: dto.accountId, pluginVersion: dto.pluginVersion, capabilities: dto.capabilities }
    const executor = await this.repository.create({ ...data, enterpriseId, createdBy: userId, lastHeartbeatAt: new Date(), revokedAt: null })
    await this.access.audit(enterpriseId, userId, 'executor.registered', String(executor._id))
    return { id: String(executor._id) }
  }

  async heartbeat(userId: string, enterpriseId: string, id: string) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator])
    const executor = await this.repository.updateByIdAndEnterpriseIdAndUserId(id, enterpriseId, userId, { lastHeartbeatAt: new Date() })
    if (!executor)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    return { id: String(executor._id), lastHeartbeatAt: executor.lastHeartbeatAt }
  }

  async revoke(userId: string, enterpriseId: string, id: string) {
    const { role } = await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator])
    const executor = await this.repository.getByIdAndEnterpriseId(id, enterpriseId)
    if (!executor || (role !== EnterpriseRole.Admin && executor.createdBy !== userId))
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    await this.repository.updateByIdAndEnterpriseId(id, enterpriseId, { revokedAt: new Date() })
    await this.access.audit(enterpriseId, userId, 'executor.revoked', id)
    return { id }
  }

  async claim(userId: string, enterpriseId: string, id: string, dto: ClaimEnterpriseJobDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator])
    if (!this.options.browserExecutionEnabled)
      throw new AppException(ResponseCode.EnterpriseCapabilityUnavailable)
    await this.maintainTasks()
    const job = await this.operations.getByEnterprisePublishJobIdAndEnterpriseId(id, enterpriseId)
    const executor = await this.repository.getByIdAndEnterpriseId(dto.executorId, enterpriseId)
    if (!job || job.mode !== 'browser' || ![EnterprisePublishStatus.Scheduled, EnterprisePublishStatus.WaitingExecutor, EnterprisePublishStatus.AwaitingConfirmation].includes(job.status) || job.scheduledAt > new Date())
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    if (!executor || executor.createdBy !== userId || executor.revokedAt || executor.accountId !== job.accountId || executor.lastHeartbeatAt.getTime() <= Date.now() - this.leaseDurationMs || !['image_text', 'approval_gate', 'manual_confirmation'].every(capability => executor.capabilities.includes(capability)))
      throw new AppException(ResponseCode.EnterpriseCapabilityUnavailable)
    const payload = await this.publishing.materialPackage(userId, enterpriseId, id)
    const leaseToken = randomBytes(32).toString('hex')
    const attemptId = randomUUID()
    const expiresAt = new Date(Date.now() + this.leaseDurationMs)
    const lease = await this.repository.createLease(job.accountId, { enterpriseId, jobId: id, executorId: dto.executorId, attemptId, tokenHash: createHash('sha256').update(leaseToken).digest('hex'), expiresAt })
    if (!lease)
      throw new EnterpriseConflictException()
    const updated = await this.repository.updateByJobIdAndEnterpriseIdAndVersion(id, enterpriseId, job.version, { executorId: dto.executorId, attemptId, status: EnterprisePublishStatus.AwaitingConfirmation, leaseExpiresAt: expiresAt, processedEventIds: [], lastEventSequence: 0 })
    if (!updated) {
      await this.repository.updateByAccountIdAndAttemptId(job.accountId, attemptId, new Date(0))
      throw new EnterpriseConflictException()
    }
    await this.access.audit(enterpriseId, userId, 'executor.claimed', id)
    return { jobId: id, attemptId, leaseToken, expiresAt, payload }
  }

  async validateLease(userId: string, enterpriseId: string, id: string, dto: EnterpriseLeaseDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator])
    const job = await this.operations.getByEnterprisePublishJobIdAndEnterpriseId(id, enterpriseId)
    if (!job || job.attemptId !== dto.attemptId || job.executorId !== dto.executorId)
      throw new EnterpriseConflictException()
    const executor = await this.repository.getByIdAndEnterpriseId(dto.executorId, enterpriseId)
    const lease = await this.repository.getByAccountIdAndAttemptId(job.accountId, dto.attemptId)
    if (!executor || executor.revokedAt || executor.createdBy !== userId || !lease || lease.enterpriseId !== enterpriseId || lease.jobId !== id || lease.executorId !== dto.executorId || lease.expiresAt <= new Date() || !timingSafeEqual(Buffer.from(lease.tokenHash, 'hex'), createHash('sha256').update(dto.leaseToken).digest()))
      throw new EnterpriseConflictException()
    return { job, lease }
  }

  async renew(userId: string, enterpriseId: string, id: string, dto: EnterpriseLeaseDto) {
    if (!this.options.browserExecutionEnabled)
      throw new AppException(ResponseCode.EnterpriseCapabilityUnavailable)
    const { job } = await this.validateLease(userId, enterpriseId, id, dto)
    if (![EnterprisePublishStatus.AwaitingConfirmation, EnterprisePublishStatus.Submitting].includes(job.status))
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const expiresAt = new Date(Date.now() + this.leaseDurationMs)
    const updated = await this.repository.updateByJobIdAndEnterpriseIdAndVersion(id, enterpriseId, job.version, { leaseExpiresAt: expiresAt })
    if (!updated)
      throw new EnterpriseConflictException()
    await this.repository.updateByAccountIdAndAttemptId(job.accountId, dto.attemptId, expiresAt)
    return { expiresAt }
  }

  async authorizeSubmit(userId: string, enterpriseId: string, id: string, dto: EnterpriseLeaseDto) {
    if (!this.options.browserExecutionEnabled)
      throw new AppException(ResponseCode.EnterpriseCapabilityUnavailable)
    const { job } = await this.validateLease(userId, enterpriseId, id, dto)
    if (job.status !== EnterprisePublishStatus.AwaitingConfirmation)
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const revision = await this.content.approvedRevision(enterpriseId, job.revisionId)
    await this.resources.requireBinding(enterpriseId, EnterpriseResourceKind.Account, job.accountId)
    if (revision.contentHash !== job.contentHash)
      throw new AppException(ResponseCode.EnterpriseContentNotApproved)
    const current = await this.validateLease(userId, enterpriseId, id, dto)
    const updated = await this.repository.updateByJobIdAndEnterpriseIdAndVersion(id, enterpriseId, current.job.version, { status: EnterprisePublishStatus.Submitting })
    if (!updated)
      throw new EnterpriseConflictException()
    return { jobId: id, attemptId: dto.attemptId, accountId: job.accountId, contentHash: job.contentHash, expiresAt: current.lease.expiresAt }
  }

  async event(userId: string, enterpriseId: string, id: string, dto: EnterpriseExecutorEventDto) {
    const { job } = await this.validateLease(userId, enterpriseId, id, dto)
    if (job.processedEventIds.includes(dto.eventId))
      return { jobId: id, status: job.status }
    if (job.status !== EnterprisePublishStatus.Submitting)
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const status = dto.outcome === 'submitted' ? EnterprisePublishStatus.Submitted : dto.outcome === 'unknown' ? EnterprisePublishStatus.Unknown : EnterprisePublishStatus.Failed
    const updated = await this.repository.updateByJobIdAndAttemptIdAndVersion(id, enterpriseId, dto.attemptId, job.version, dto.eventId, dto.sequence, { status, workLink: dto.workLink ? validateRednoteLink(dto.workLink) : '' })
    if (!updated)
      throw new EnterpriseConflictException()
    await this.access.audit(enterpriseId, userId, `executor.${dto.outcome}`, id)
    return { jobId: id, status: updated.status }
  }

  @Interval(30000)
  async maintainTasks() {
    if (!this.options.enabled)
      return
    await this.repository.updateByExpiredLease()
    await this.repository.updateByScheduledAt()
  }
}
