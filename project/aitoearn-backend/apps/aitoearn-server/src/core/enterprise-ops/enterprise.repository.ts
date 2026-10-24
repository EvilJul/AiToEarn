import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Enterprise, EnterpriseAuditEvent, EnterpriseMembership } from './enterprise.schema'

@Injectable()
export class EnterpriseRepository {
  constructor(
    @InjectModel(Enterprise.name) private readonly enterprises: Model<Enterprise>,
    @InjectModel(EnterpriseMembership.name) private readonly memberships: Model<EnterpriseMembership>,
    @InjectModel(EnterpriseAuditEvent.name) private readonly audits: Model<EnterpriseAuditEvent>,
  ) {}

  async create(data: Partial<Enterprise>) {
    return (await this.enterprises.create(data)).toObject()
  }

  async getById(id: string) {
    return this.enterprises.findById(id).lean().exec()
  }

  async listByUserId(userId: string) {
    const memberships = await this.memberships.find({ userId, active: true }).lean().exec()
    return this.enterprises.find({ $or: [{ ownerUserId: userId }, { _id: { $in: memberships.map(m => m.enterpriseId) } }] }).sort({ createdAt: -1 }).limit(100).lean().exec()
  }

  async getByEnterpriseIdAndUserId(enterpriseId: string, userId: string) {
    return this.memberships.findOne({ enterpriseId, userId, active: true }).lean().exec()
  }

  async updateByIdAndVersion(id: string, version: number, data: Partial<Enterprise>) {
    return this.enterprises.findOneAndUpdate({ _id: id, version }, { $set: data, $inc: { version: 1 } }, { new: true }).lean().exec()
  }

  async listByEnterpriseId(enterpriseId: string) {
    return this.memberships.find({ enterpriseId }).sort({ createdAt: 1 }).limit(100).lean().exec()
  }

  async createMembership(data: Partial<EnterpriseMembership>) {
    return this.memberships.findOneAndUpdate(
      { enterpriseId: data.enterpriseId, userId: data.userId },
      { $setOnInsert: data },
      { new: true, upsert: true },
    ).lean().exec()
  }

  async updateByMembershipIdAndEnterpriseIdAndVersion(id: string, enterpriseId: string, version: number, data: Partial<EnterpriseMembership>) {
    return this.memberships.findOneAndUpdate({ _id: id, enterpriseId, version }, { $set: data, $inc: { version: 1 } }, { new: true }).lean().exec()
  }

  async createAudit(data: Partial<EnterpriseAuditEvent>) {
    return this.audits.create(data)
  }

  async listByEnterpriseIdWithPagination(enterpriseId: string, page: number, pageSize: number) {
    return this.audits.find({ enterpriseId }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean().exec()
  }

  async listByEnabledAfterId(afterId: string) {
    return this.enterprises.find(afterId ? { enabled: true, _id: { $gt: afterId } } : { enabled: true }).sort({ _id: 1 }).limit(100).lean().exec()
  }

  async listByEnterpriseIdAndResourceId(enterpriseId: string, resourceId: string) {
    const events = await this.audits.find({ enterpriseId, resourceId }).sort({ createdAt: -1, _id: -1 }).limit(100).lean().exec()
    return events.reverse()
  }
}
