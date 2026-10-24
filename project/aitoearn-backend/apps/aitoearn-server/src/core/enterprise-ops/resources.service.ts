import { Injectable } from '@nestjs/common'
import { AccountType, AppException, ResponseCode } from '@yikart/common'
import { AccountRepository, AssetRepository, AssetStatus } from '@yikart/mongodb'
import { EnterpriseResourceKind, EnterpriseRole } from './enterprise.enums'
import { EnterpriseService } from './enterprise.service'
import { EnterpriseResourceRepository } from './resources.repository'

@Injectable()
export class EnterpriseResourcesService {
  constructor(private readonly access: EnterpriseService, private readonly repository: EnterpriseResourceRepository, private readonly accounts: AccountRepository, private readonly assets: AssetRepository) {}

  async list(userId: string, enterpriseId: string) {
    await this.access.authorize(userId, enterpriseId)
    const bindings = await this.repository.listByEnterpriseId(enterpriseId)
    return Promise.all(bindings.map(async (binding) => {
      const resource = binding.kind === EnterpriseResourceKind.Account
        ? await this.accounts.getByIdAndUserId(binding.resourceId, binding.ownerUserId)
        : await this.assets.getByIdAndUserId(binding.resourceId, binding.ownerUserId)
      const name = resource && 'nickname' in resource ? resource.nickname : resource && 'filename' in resource ? resource.filename || binding.resourceId : binding.resourceId
      return { resourceId: binding.resourceId, kind: binding.kind, name, active: binding.active }
    }))
  }

  async bind(userId: string, enterpriseId: string, kind: EnterpriseResourceKind, resourceId: string) {
    await this.access.authorize(userId, enterpriseId, kind === EnterpriseResourceKind.Account ? [EnterpriseRole.Operator] : [EnterpriseRole.Operator, EnterpriseRole.Reviewer])
    const resource = kind === EnterpriseResourceKind.Account
      ? await this.accounts.getByIdAndUserId(resourceId, userId)
      : await this.assets.getByIdAndUserId(resourceId, userId)
    if (!resource)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    if (kind === EnterpriseResourceKind.Account && 'type' in resource && resource.type !== AccountType.RedNote)
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    if (kind === EnterpriseResourceKind.Asset && 'status' in resource && resource.status !== AssetStatus.Confirmed)
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    await this.repository.create({ enterpriseId, kind, resourceId, ownerUserId: userId })
    await this.access.audit(enterpriseId, userId, `resource.${kind}.bound`, resourceId)
    return { resourceId, kind, active: true }
  }

  async authorizeResource(userId: string, enterpriseId: string, kind: EnterpriseResourceKind, resourceId: string) {
    await this.access.authorize(userId, enterpriseId, kind === EnterpriseResourceKind.Account ? [EnterpriseRole.Operator] : [EnterpriseRole.Operator, EnterpriseRole.Reviewer])
    const binding = await this.repository.getByEnterpriseIdAndKindAndResourceId(enterpriseId, kind, resourceId)
    if (binding)
      return binding
    await this.bind(userId, enterpriseId, kind, resourceId)
    return this.requireBinding(enterpriseId, kind, resourceId)
  }

  async listAuthorizedAssets(userId: string, enterpriseId: string) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator, EnterpriseRole.Reviewer])
    const bindings = (await this.repository.listByEnterpriseId(enterpriseId)).filter(binding => binding.kind === EnterpriseResourceKind.Asset)
    const assets = await Promise.all(bindings.map(binding => this.assets.getByIdAndUserId(binding.resourceId, binding.ownerUserId)))
    return assets.filter(asset => asset !== null)
  }

  async requireBinding(enterpriseId: string, kind: EnterpriseResourceKind, resourceId: string) {
    const binding = await this.repository.getByEnterpriseIdAndKindAndResourceId(enterpriseId, kind, resourceId)
    if (!binding)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    return binding
  }

  async revoke(userId: string, enterpriseId: string, kind: EnterpriseResourceKind, resourceId: string) {
    const { role } = await this.access.authorize(userId, enterpriseId)
    const binding = await this.requireBinding(enterpriseId, kind, resourceId)
    if (role !== EnterpriseRole.Admin && binding.ownerUserId !== userId)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    await this.repository.updateByEnterpriseIdAndKindAndResourceId(enterpriseId, kind, resourceId)
    await this.access.audit(enterpriseId, userId, `resource.${kind}.revoked`, resourceId)
    return { resourceId, kind, active: false }
  }
}
