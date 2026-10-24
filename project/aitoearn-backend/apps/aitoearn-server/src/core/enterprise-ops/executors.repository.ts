import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, mongo } from 'mongoose'
import { EnterprisePublishStatus } from './enterprise.enums'
import { EnterpriseAccountLease, EnterpriseExecutor } from './executors.schema'
import { EnterprisePublishJob } from './operations.schema'

@Injectable()
export class EnterpriseExecutorRepository {
  constructor(
    @InjectModel(EnterpriseExecutor.name) private readonly executors: Model<EnterpriseExecutor>,
    @InjectModel(EnterpriseAccountLease.name) private readonly leases: Model<EnterpriseAccountLease>,
    @InjectModel(EnterprisePublishJob.name) private readonly jobs: Model<EnterprisePublishJob>,
  ) {}

  async create(data: Partial<EnterpriseExecutor>) {
    return this.executors.findOneAndUpdate({ enterpriseId: data.enterpriseId, deviceId: data.deviceId, accountId: data.accountId, createdBy: data.createdBy }, { $set: data }, { upsert: true, new: true }).lean().exec()
  }

  async getByIdAndEnterpriseId(id: string, enterpriseId: string) {
    return this.executors.findOne({ _id: id, enterpriseId }).lean().exec()
  }

  async listByEnterpriseId(enterpriseId: string) {
    return this.executors.find({ enterpriseId }).sort({ lastHeartbeatAt: -1 }).limit(100).lean().exec()
  }

  async updateByIdAndEnterpriseIdAndUserId(id: string, enterpriseId: string, userId: string, data: Partial<EnterpriseExecutor>) {
    return this.executors.findOneAndUpdate({ _id: id, enterpriseId, createdBy: userId, revokedAt: null }, { $set: data }, { new: true }).lean().exec()
  }

  async updateByIdAndEnterpriseId(id: string, enterpriseId: string, data: Partial<EnterpriseExecutor>) {
    return this.executors.findOneAndUpdate({ _id: id, enterpriseId }, { $set: data }, { new: true }).lean().exec()
  }

  async createLease(accountId: string, data: Omit<EnterpriseAccountLease, '_id'>) {
    try {
      return await this.leases.findOneAndUpdate({ _id: accountId, expiresAt: { $lte: new Date() } }, { $set: data }, { new: true, upsert: true }).lean().exec()
    }
    catch (error) {
      if (error instanceof mongo.MongoServerError && error.code === 11000)
        return null
      throw error
    }
  }

  async getByAccountIdAndAttemptId(accountId: string, attemptId: string) {
    return this.leases.findOne({ _id: accountId, attemptId }).lean().exec()
  }

  async updateByAccountIdAndAttemptId(accountId: string, attemptId: string, expiresAt: Date) {
    return this.leases.updateOne({ _id: accountId, attemptId }, { $set: { expiresAt } }).exec()
  }

  async updateByJobIdAndEnterpriseIdAndVersion(id: string, enterpriseId: string, version: number, data: Partial<EnterprisePublishJob>) {
    return this.jobs.findOneAndUpdate({ _id: id, enterpriseId, version }, { $set: data, $inc: { version: 1 } }, { new: true }).lean().exec()
  }

  async updateByJobIdAndAttemptIdAndVersion(id: string, enterpriseId: string, attemptId: string, version: number, eventId: string, sequence: number, data: Partial<EnterprisePublishJob>) {
    return this.jobs.findOneAndUpdate({ _id: id, enterpriseId, attemptId, version, processedEventIds: { $ne: eventId }, lastEventSequence: { $lt: sequence } }, { $set: { ...data, lastEventSequence: sequence }, $push: { processedEventIds: eventId }, $inc: { version: 1 } }, { new: true }).lean().exec()
  }

  async updateByExpiredLease() {
    await this.jobs.updateMany({ status: EnterprisePublishStatus.Submitting, leaseExpiresAt: { $lte: new Date() } }, { $set: { status: EnterprisePublishStatus.Unknown }, $inc: { version: 1 } }).exec()
  }

  async updateByScheduledAt() {
    await this.jobs.updateMany({ mode: 'browser', status: EnterprisePublishStatus.Scheduled, scheduledAt: { $lte: new Date() } }, { $set: { status: EnterprisePublishStatus.WaitingExecutor }, $inc: { version: 1 } }).exec()
  }
}
