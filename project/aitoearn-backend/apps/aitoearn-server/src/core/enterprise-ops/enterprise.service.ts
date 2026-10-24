import { Inject, Injectable } from '@nestjs/common'
import { AppException, ResponseCode } from '@yikart/common'
import { UserRepository } from '@yikart/mongodb'
import { EnterpriseConflictException } from './enterprise-conflict.exception'
import { CreateEnterpriseDto, CreateMembershipDto, EnterprisePaginationDto, UpdateEnterpriseDto, UpdateMembershipDto } from './enterprise.dto'
import { EnterpriseRole } from './enterprise.enums'
import { EnterpriseRepository } from './enterprise.repository'
import { Enterprise } from './enterprise.schema'

export const ENTERPRISE_OPTIONS = Symbol('ENTERPRISE_OPTIONS')
export interface EnterpriseOptions { enabled: boolean, browserExecutionEnabled?: boolean }

@Injectable()
export class EnterpriseService {
  constructor(
    private readonly repository: EnterpriseRepository,
    private readonly users: UserRepository,
    @Inject(ENTERPRISE_OPTIONS) private readonly options: EnterpriseOptions,
  ) {}

  async authorize(userId: string, enterpriseId: string, roles: EnterpriseRole[] = [], allowDisabled = false) {
    if (!this.options.enabled)
      throw new AppException(ResponseCode.EnterpriseDisabled)
    const enterprise = await this.repository.getById(enterpriseId)
    if (!enterprise)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    const role = enterprise.ownerUserId === userId
      ? EnterpriseRole.Admin
      : (await this.repository.getByEnterpriseIdAndUserId(enterpriseId, userId))?.role
    if (!role || (roles.length > 0 && role !== EnterpriseRole.Admin && !roles.includes(role))) {
      await this.audit(enterpriseId, userId, 'access.denied', enterpriseId)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    }
    if (!enterprise.enabled && !allowDisabled)
      throw new AppException(ResponseCode.EnterpriseDisabled)
    return { enterprise, role }
  }

  async list(userId: string) {
    if (!this.options.enabled)
      return []
    const enterprises = await this.repository.listByUserId(userId)
    return Promise.all(enterprises.map(async enterprise => this.toView(enterprise, (await this.authorize(userId, String(enterprise._id), [], true)).role)))
  }

  async create(userId: string, dto: CreateEnterpriseDto) {
    if (!this.options.enabled)
      throw new AppException(ResponseCode.EnterpriseDisabled)
    const enterprise = await this.repository.create({ ...dto, ownerUserId: userId })
    await this.audit(String(enterprise._id), userId, 'enterprise.created', String(enterprise._id))
    return this.toView(enterprise, EnterpriseRole.Admin)
  }

  async update(userId: string, enterpriseId: string, dto: UpdateEnterpriseDto) {
    await this.authorize(userId, enterpriseId, [EnterpriseRole.Admin], true)
    const { expectedVersion, ...data } = dto
    const enterprise = await this.repository.updateByIdAndVersion(enterpriseId, expectedVersion, data)
    if (!enterprise)
      throw new EnterpriseConflictException()
    await this.audit(enterpriseId, userId, 'enterprise.updated', enterpriseId)
    return this.toView(enterprise, EnterpriseRole.Admin)
  }

  async listMembers(userId: string, enterpriseId: string) {
    const { enterprise } = await this.authorize(userId, enterpriseId, [EnterpriseRole.Admin])
    const members = await this.repository.listByEnterpriseId(enterpriseId)
    return [{ id: 'owner', userId: enterprise.ownerUserId, role: EnterpriseRole.Admin, active: true, version: 0 }, ...members.map(m => ({ ...m, id: String(m._id) }))]
  }

  async addMember(userId: string, enterpriseId: string, dto: CreateMembershipDto) {
    const { enterprise } = await this.authorize(userId, enterpriseId, [EnterpriseRole.Admin])
    if (dto.userId === enterprise.ownerUserId)
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const user = await this.users.getById(dto.userId)
    if (!user || user.isDelete)
      throw new AppException(ResponseCode.UserNotFound)
    const member = await this.repository.createMembership({ enterpriseId, ...dto, active: true })
    await this.audit(enterpriseId, userId, 'membership.created', String(member._id))
    return { ...member, id: String(member._id) }
  }

  async updateMember(userId: string, enterpriseId: string, id: string, dto: UpdateMembershipDto) {
    await this.authorize(userId, enterpriseId, [EnterpriseRole.Admin])
    const { expectedVersion, ...data } = dto
    const member = await this.repository.updateByMembershipIdAndEnterpriseIdAndVersion(id, enterpriseId, expectedVersion, data)
    if (!member)
      throw new EnterpriseConflictException()
    await this.audit(enterpriseId, userId, 'membership.updated', id)
    return { ...member, id: String(member._id) }
  }

  async listAudits(userId: string, enterpriseId: string, query: EnterprisePaginationDto) {
    await this.authorize(userId, enterpriseId, [EnterpriseRole.Admin])
    return (await this.repository.listByEnterpriseIdWithPagination(enterpriseId, query.page, query.pageSize)).map(e => ({ ...e, id: String(e._id) }))
  }

  async resourceAudit(userId: string, enterpriseId: string, resourceId: string) {
    await this.authorize(userId, enterpriseId, [EnterpriseRole.Operator, EnterpriseRole.Reviewer])
    return (await this.repository.listByEnterpriseIdAndResourceId(enterpriseId, resourceId)).map(event => ({ ...event, id: String(event._id) }))
  }

  async audit(enterpriseId: string, actorId: string, action: string, resourceId: string, reason = '') {
    await this.repository.createAudit({ enterpriseId, actorId, action, resourceId, reason })
  }

  toView(enterprise: Enterprise, role: EnterpriseRole) {
    return { id: String(enterprise._id), name: enterprise.name, industry: enterprise.industry, regions: enterprise.regions, timezone: enterprise.timezone, responseReminderMinutes: enterprise.responseReminderMinutes, allowSelfReview: enterprise.allowSelfReview, enabled: enterprise.enabled, version: enterprise.version, role }
  }
}
