import { createHash } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { StorageProvider } from '@yikart/assets'
import { AccountType, AppException, ResponseCode } from '@yikart/common'
import { AccountRepository, AccountStatus, AssetRepository } from '@yikart/mongodb'
import { EnterpriseContentService } from './content.service'
import { EnterpriseConflictException } from './enterprise-conflict.exception'
import { getEnterpriseImageExtension } from './enterprise-media'
import { EnterprisePaginationDto } from './enterprise.dto'
import { EnterprisePublishStatus, EnterpriseResourceKind, EnterpriseRole } from './enterprise.enums'
import { ENTERPRISE_OPTIONS, EnterpriseOptions, EnterpriseService } from './enterprise.service'
import { CreatePublishJobDto, ManualPublishResultDto, RepublishEnterpriseJobDto, VerifyPublishResultDto, VersionActionDto } from './operations.dto'
import { EnterpriseOperationsRepository } from './operations.repository'
import { EnterpriseResourcesService } from './resources.service'

export function validateRednoteLink(link: string) {
  const url = new URL(link)
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hostname !== 'www.xiaohongshu.com' || !/^\/(?:explore|discovery\/item)\/[a-f\d]{24}\/?$/i.test(url.pathname))
    throw new AppException(ResponseCode.InvalidWorkLink)
  return url.toString()
}

@Injectable()
export class EnterprisePublishingService {
  constructor(
    private readonly access: EnterpriseService,
    private readonly repository: EnterpriseOperationsRepository,
    private readonly content: EnterpriseContentService,
    private readonly accounts: AccountRepository,
    private readonly assets: AssetRepository,
    private readonly storage: StorageProvider,
    private readonly resources: EnterpriseResourcesService,
    @Inject(ENTERPRISE_OPTIONS) private readonly options: EnterpriseOptions,
  ) {}

  async list(userId: string, enterpriseId: string, query: EnterprisePaginationDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator, EnterpriseRole.Reviewer])
    return (await this.repository.listByEnterprisePublishJobEnterpriseIdWithPagination(enterpriseId, query.page, query.pageSize)).map(job => ({ ...job, overdue: job.scheduledAt < new Date() && ![EnterprisePublishStatus.Published, EnterprisePublishStatus.Cancelled].includes(job.status) }))
  }

  async create(userId: string, enterpriseId: string, dto: CreatePublishJobDto, republication?: { originJobId: string, requestId: string }) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator])
    if (dto.mode !== 'manual' && !this.options.browserExecutionEnabled)
      throw new AppException(ResponseCode.EnterpriseCapabilityUnavailable)
    const revision = await this.content.approvedRevision(enterpriseId, dto.revisionId)
    if (!revision.imageAssetIds.length)
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const binding = await this.resources.authorizeResource(userId, enterpriseId, EnterpriseResourceKind.Account, dto.accountId)
    const account = await this.accounts.getByIdAndUserId(dto.accountId, binding.ownerUserId)
    if (!account || account.type !== AccountType.RedNote)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    if (account.status !== AccountStatus.NORMAL)
      throw new AppException(ResponseCode.ChannelAuthorizationExpired)
    const job = await this.repository.createEnterprisePublishJob({ ...dto, runKey: republication?.requestId || 'initial', originJobId: republication?.originJobId || '', enterpriseId, createdBy: userId, contentHash: revision.contentHash, status: dto.mode === 'manual' ? EnterprisePublishStatus.AwaitingConfirmation : EnterprisePublishStatus.Scheduled })
    await this.access.audit(enterpriseId, userId, 'publish.created', String(job._id))
    return job
  }

  async republish(userId: string, enterpriseId: string, id: string, dto: RepublishEnterpriseJobDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator])
    const original = await this.repository.getByEnterprisePublishJobIdAndEnterpriseId(id, enterpriseId)
    if (!original || original.status !== EnterprisePublishStatus.Published || original.version !== dto.expectedVersion)
      throw new EnterpriseConflictException()
    const job = await this.create(userId, enterpriseId, { revisionId: original.revisionId, accountId: original.accountId, mode: original.mode, scheduledAt: dto.scheduledAt }, { originJobId: id, requestId: dto.requestId })
    await this.access.audit(enterpriseId, userId, 'publish.republished', String(job._id), id)
    return job
  }

  async manualResult(userId: string, enterpriseId: string, id: string, dto: ManualPublishResultDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator])
    const job = await this.repository.getByEnterprisePublishJobIdAndEnterpriseId(id, enterpriseId)
    if (!job || !((job.mode === 'manual' && job.status === EnterprisePublishStatus.AwaitingConfirmation) || [EnterprisePublishStatus.Submitted, EnterprisePublishStatus.Unknown].includes(job.status)))
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    if (job.status === EnterprisePublishStatus.AwaitingConfirmation) {
      await this.resources.requireBinding(enterpriseId, EnterpriseResourceKind.Account, job.accountId)
      await this.content.approvedRevision(enterpriseId, job.revisionId)
    }
    const updated = await this.repository.updateByEnterprisePublishJobIdAndEnterpriseIdAndVersion(id, enterpriseId, dto.expectedVersion, { workLink: validateRednoteLink(dto.workLink), status: EnterprisePublishStatus.Submitted })
    if (!updated)
      throw new EnterpriseConflictException()
    await this.access.audit(enterpriseId, userId, 'publish.manual-result', id)
    return updated
  }

  async verify(userId: string, enterpriseId: string, id: string, dto: VerifyPublishResultDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Reviewer])
    const job = await this.repository.getByEnterprisePublishJobIdAndEnterpriseId(id, enterpriseId)
    if (!job || !job.workLink || job.status !== EnterprisePublishStatus.Submitted)
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const updated = await this.repository.updateByEnterprisePublishJobIdAndEnterpriseIdAndVersion(id, enterpriseId, dto.expectedVersion, { status: EnterprisePublishStatus.Published, evidence: dto.evidence, verifiedBy: userId, verificationMethod: 'manual' })
    if (!updated)
      throw new EnterpriseConflictException()
    await this.access.audit(enterpriseId, userId, 'publish.verified-manually', id, dto.evidence)
    return updated
  }

  async cancel(userId: string, enterpriseId: string, id: string, dto: VersionActionDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator])
    const job = await this.repository.getByEnterprisePublishJobIdAndEnterpriseId(id, enterpriseId)
    if (!job || ![EnterprisePublishStatus.Scheduled, EnterprisePublishStatus.WaitingExecutor, EnterprisePublishStatus.AwaitingConfirmation, EnterprisePublishStatus.Blocked].includes(job.status))
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const updated = await this.repository.updateByEnterprisePublishJobIdAndEnterpriseIdAndVersion(id, enterpriseId, dto.expectedVersion, { status: EnterprisePublishStatus.Cancelled })
    if (!updated)
      throw new EnterpriseConflictException()
    await this.access.audit(enterpriseId, userId, 'publish.cancelled', id, dto.reason)
    return updated
  }

  async materialPackage(userId: string, enterpriseId: string, id: string) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator, EnterpriseRole.Reviewer])
    const job = await this.repository.getByEnterprisePublishJobIdAndEnterpriseId(id, enterpriseId)
    if (!job)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    await this.resources.requireBinding(enterpriseId, EnterpriseResourceKind.Account, job.accountId)
    const revision = await this.content.approvedRevision(enterpriseId, job.revisionId)
    const files: { name: string, base64: string }[] = []
    let size = 0
    for (const [index, assetId] of revision.imageAssetIds.entries()) {
      const binding = await this.resources.requireBinding(enterpriseId, EnterpriseResourceKind.Asset, assetId)
      const asset = await this.assets.getByIdAndUserId(assetId, binding.ownerUserId)
      if (!asset)
        throw new AppException(ResponseCode.EnterpriseAccessDenied)
      const { buffer } = await this.storage.getObject(asset.path)
      if (!buffer || createHash('sha256').update(buffer).digest('hex') !== revision.imageHashes[index])
        throw new AppException(ResponseCode.EnterpriseContentNotApproved)
      size += buffer.length
      if (size > 50 * 1024 * 1024)
        throw new AppException(ResponseCode.AssetTooLarge)
      const extension = getEnterpriseImageExtension(asset.mimeType)
      if (!extension)
        throw new AppException(ResponseCode.ChannelPlatformMediaUnsupported)
      files.push({ name: `${String(index + 1).padStart(2, '0')}.${extension}`, base64: buffer.toString('base64') })
    }
    await this.access.audit(enterpriseId, userId, 'publish.material-exported', id)
    return { revisionId: String(revision._id), contentHash: revision.contentHash, title: revision.title, body: revision.body, topics: revision.topics, files, review: { reviewedBy: revision.reviewedBy, reason: revision.reviewReason } }
  }
}
