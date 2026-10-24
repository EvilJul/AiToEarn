import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { EnterpriseResourceKind } from './enterprise.enums'
import { EnterpriseResourceBinding } from './resources.schema'

@Injectable()
export class EnterpriseResourceRepository {
  constructor(@InjectModel(EnterpriseResourceBinding.name) private readonly bindings: Model<EnterpriseResourceBinding>) {}

  async create(data: Pick<EnterpriseResourceBinding, 'enterpriseId' | 'kind' | 'resourceId' | 'ownerUserId'>) {
    return this.bindings.findOneAndUpdate(
      { enterpriseId: data.enterpriseId, kind: data.kind, resourceId: data.resourceId, ownerUserId: data.ownerUserId },
      { $setOnInsert: data, $set: { active: true } },
      { upsert: true, new: true },
    ).lean().exec()
  }

  async getByEnterpriseIdAndKindAndResourceId(enterpriseId: string, kind: EnterpriseResourceKind, resourceId: string) {
    return this.bindings.findOne({ enterpriseId, kind, resourceId, active: true }).lean().exec()
  }

  async listByEnterpriseId(enterpriseId: string) {
    return this.bindings.find({ enterpriseId, active: true }).limit(100).lean().exec()
  }

  async updateByEnterpriseIdAndKindAndResourceId(enterpriseId: string, kind: EnterpriseResourceKind, resourceId: string) {
    return this.bindings.findOneAndUpdate({ enterpriseId, kind, resourceId, active: true }, { $set: { active: false } }, { new: true }).lean().exec()
  }
}
