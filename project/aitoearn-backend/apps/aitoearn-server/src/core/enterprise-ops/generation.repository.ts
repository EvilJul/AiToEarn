import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { EnterpriseGeneration, GenerationStatus } from './generation.schema'

@Injectable()
export class EnterpriseGenerationRepository {
  constructor(@InjectModel(EnterpriseGeneration.name) private readonly model: Model<EnterpriseGeneration>) {}
  async create(data: Partial<EnterpriseGeneration>) {
    return this.model.findOneAndUpdate({ enterpriseId: data.enterpriseId, createdBy: data.createdBy, requestId: data.requestId }, { $setOnInsert: data }, { upsert: true, new: true }).lean().exec()
  }

  async get(enterpriseId: string, id: string) { return this.model.findOne({ _id: id, enterpriseId }).lean().exec() }
  async list(enterpriseId: string, page: number, pageSize: number) { return this.model.find({ enterpriseId }).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean().exec() }
  async claim() {
    return this.model.findOneAndUpdate({ status: GenerationStatus.Queued }, { $set: { status: GenerationStatus.Running, startedAt: new Date() } }, { sort: { createdAt: 1 }, new: true }).lean().exec()
  }

  async finish(id: string, data: Partial<EnterpriseGeneration>) { return this.model.findOneAndUpdate({ _id: id, status: GenerationStatus.Running }, { $set: data }, { new: true }).lean().exec() }
  async reconcile(enterpriseId: string, id: string, data: Partial<EnterpriseGeneration>) {
    return this.model.findOneAndUpdate({ _id: id, enterpriseId, costStatus: 'unknown' }, { $set: data }, { new: true }).lean().exec()
  }

  async expire() { return this.model.updateMany({ status: GenerationStatus.Running, startedAt: { $lt: new Date(Date.now() - 120000) } }, { $set: { status: GenerationStatus.Unknown, settlement: 'unknown', errorCode: 'interrupted' } }).exec() }
}
