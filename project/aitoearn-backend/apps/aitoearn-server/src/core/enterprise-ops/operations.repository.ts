import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, mongo } from 'mongoose'
import { ContentRevision, EnterpriseConversation, EnterpriseLead, EnterpriseMessage, EnterpriseNotification, EnterprisePublishJob, KnowledgeVersion, TopicCandidate } from './operations.schema'

@Injectable()
export class EnterpriseOperationsRepository {
  constructor(
    @InjectModel(KnowledgeVersion.name) private readonly knowledgeVersionModel: Model<KnowledgeVersion>,
    @InjectModel(TopicCandidate.name) private readonly topicCandidateModel: Model<TopicCandidate>,
    @InjectModel(ContentRevision.name) private readonly contentRevisionModel: Model<ContentRevision>,
    @InjectModel(EnterprisePublishJob.name) private readonly enterprisePublishJobModel: Model<EnterprisePublishJob>,
    @InjectModel(EnterpriseConversation.name) private readonly enterpriseConversationModel: Model<EnterpriseConversation>,
    @InjectModel(EnterpriseMessage.name) private readonly enterpriseMessageModel: Model<EnterpriseMessage>,
    @InjectModel(EnterpriseLead.name) private readonly enterpriseLeadModel: Model<EnterpriseLead>,
    @InjectModel(EnterpriseNotification.name) private readonly enterpriseNotificationModel: Model<EnterpriseNotification>,
  ) {}

  async createKnowledgeVersion(data: Partial<KnowledgeVersion>) {
    try {
      return (await this.knowledgeVersionModel.create(data)).toObject()
    }
    catch (error) {
      if (error instanceof mongo.MongoServerError && error.code === 11000)
        return null
      throw error
    }
  }

  async getByKnowledgeVersionIdAndEnterpriseId(id: string, enterpriseId: string) {
    return this.knowledgeVersionModel.findOne({ _id: id, enterpriseId }).lean().exec()
  }

  async listByKnowledgeVersionEnterpriseIdWithPagination(enterpriseId: string, page: number, pageSize: number, approvedOnly = false) {
    return this.knowledgeVersionModel.find(approvedOnly ? { enterpriseId, status: 'approved', validUntil: { $gt: new Date() } } : { enterpriseId }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean().exec()
  }

  async updateByKnowledgeVersionIdAndEnterpriseIdAndVersion(id: string, enterpriseId: string, version: number, data: Partial<KnowledgeVersion>) {
    return this.knowledgeVersionModel.findOneAndUpdate({ _id: id, enterpriseId, version }, { $set: data, $inc: { version: 1 } }, { new: true }).lean().exec()
  }

  async createTopicCandidate(data: Partial<TopicCandidate>) {
    return (await this.topicCandidateModel.create(data)).toObject()
  }

  async getByTopicCandidateIdAndEnterpriseId(id: string, enterpriseId: string) {
    return this.topicCandidateModel.findOne({ _id: id, enterpriseId }).lean().exec()
  }

  async listByTopicCandidateEnterpriseIdWithPagination(enterpriseId: string, page: number, pageSize: number) {
    return this.topicCandidateModel.find({ enterpriseId }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean().exec()
  }

  async updateByTopicCandidateIdAndEnterpriseIdAndVersion(id: string, enterpriseId: string, version: number, data: Partial<TopicCandidate>) {
    return this.topicCandidateModel.findOneAndUpdate({ _id: id, enterpriseId, version }, { $set: data, $inc: { version: 1 } }, { new: true }).lean().exec()
  }

  async createContentRevision(data: Partial<ContentRevision>) {
    try {
      return (await this.contentRevisionModel.create(data)).toObject()
    }
    catch (error) {
      if (error instanceof mongo.MongoServerError && error.code === 11000)
        return null
      throw error
    }
  }

  async getByContentRevisionIdAndEnterpriseId(id: string, enterpriseId: string) {
    return this.contentRevisionModel.findOne({ _id: id, enterpriseId }).lean().exec()
  }

  async listByContentRevisionEnterpriseIdWithPagination(enterpriseId: string, page: number, pageSize: number) {
    return this.contentRevisionModel.find({ enterpriseId }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean().exec()
  }

  async updateByContentRevisionIdAndEnterpriseIdAndVersion(id: string, enterpriseId: string, version: number, data: Partial<ContentRevision>) {
    return this.contentRevisionModel.findOneAndUpdate({ _id: id, enterpriseId, version }, { $set: data, $inc: { version: 1 } }, { new: true }).lean().exec()
  }

  async createEnterprisePublishJob(data: Partial<EnterprisePublishJob>) {
    return this.enterprisePublishJobModel.findOneAndUpdate(
      { enterpriseId: data.enterpriseId, accountId: data.accountId, revisionId: data.revisionId, scheduledAt: data.scheduledAt, runKey: data.runKey || 'initial' },
      { $setOnInsert: data },
      { upsert: true, new: true },
    ).lean().exec()
  }

  async getByEnterprisePublishJobIdAndEnterpriseId(id: string, enterpriseId: string) {
    return this.enterprisePublishJobModel.findOne({ _id: id, enterpriseId }).lean().exec()
  }

  async listByEnterprisePublishJobEnterpriseIdWithPagination(enterpriseId: string, page: number, pageSize: number) {
    return this.enterprisePublishJobModel.find({ enterpriseId }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean().exec()
  }

  async updateByEnterprisePublishJobIdAndEnterpriseIdAndVersion(id: string, enterpriseId: string, version: number, data: Partial<EnterprisePublishJob>) {
    return this.enterprisePublishJobModel.findOneAndUpdate({ _id: id, enterpriseId, version }, { $set: data, $inc: { version: 1 } }, { new: true }).lean().exec()
  }

  async createEnterpriseConversation(data: Partial<EnterpriseConversation>) {
    return (await this.enterpriseConversationModel.create(data)).toObject()
  }

  async getByEnterpriseConversationIdAndEnterpriseId(id: string, enterpriseId: string) {
    return this.enterpriseConversationModel.findOne({ _id: id, enterpriseId }).lean().exec()
  }

  async listByEnterpriseConversationEnterpriseIdWithPagination(enterpriseId: string, page: number, pageSize: number) {
    return this.enterpriseConversationModel.find({ enterpriseId }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean().exec()
  }

  async updateByEnterpriseConversationIdAndEnterpriseIdAndVersion(id: string, enterpriseId: string, version: number, data: Partial<EnterpriseConversation>) {
    return this.enterpriseConversationModel.findOneAndUpdate({ _id: id, enterpriseId, version }, { $set: data, $inc: { version: 1 } }, { new: true }).lean().exec()
  }

  async createEnterpriseMessage(data: Partial<EnterpriseMessage>) {
    return this.enterpriseMessageModel.findOneAndUpdate({ enterpriseId: data.enterpriseId, conversationId: data.conversationId, createdBy: data.createdBy, requestId: data.requestId }, { $setOnInsert: data }, { upsert: true, new: true }).lean().exec()
  }

  async getByEnterpriseMessageIdAndEnterpriseId(id: string, enterpriseId: string) {
    return this.enterpriseMessageModel.findOne({ _id: id, enterpriseId }).lean().exec()
  }

  async listByEnterpriseMessageEnterpriseIdWithPagination(enterpriseId: string, page: number, pageSize: number) {
    return this.enterpriseMessageModel.find({ enterpriseId }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean().exec()
  }

  async updateByEnterpriseMessageIdAndEnterpriseIdAndVersion(id: string, enterpriseId: string, version: number, data: Partial<EnterpriseMessage>) {
    return this.enterpriseMessageModel.findOneAndUpdate({ _id: id, enterpriseId, version }, { $set: data, $inc: { version: 1 } }, { new: true }).lean().exec()
  }

  async createEnterpriseLead(data: Partial<EnterpriseLead>) {
    return this.enterpriseLeadModel.findOneAndUpdate({ enterpriseId: data.enterpriseId, triggeringMessageId: data.triggeringMessageId }, { $setOnInsert: data }, { upsert: true, new: true }).lean().exec()
  }

  async getByEnterpriseLeadIdAndEnterpriseId(id: string, enterpriseId: string) {
    return this.enterpriseLeadModel.findOne({ _id: id, enterpriseId }).lean().exec()
  }

  async listByEnterpriseLeadEnterpriseIdWithPagination(enterpriseId: string, page: number, pageSize: number) {
    return this.enterpriseLeadModel.find({ enterpriseId }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean().exec()
  }

  async updateByEnterpriseLeadIdAndEnterpriseIdAndVersion(id: string, enterpriseId: string, version: number, data: Partial<EnterpriseLead>) {
    return this.enterpriseLeadModel.findOneAndUpdate({ _id: id, enterpriseId, version }, { $set: data, $inc: { version: 1 } }, { new: true }).lean().exec()
  }

  async createEnterpriseNotification(data: Partial<EnterpriseNotification>) {
    return this.enterpriseNotificationModel.findOneAndUpdate({ enterpriseId: data.enterpriseId, eventKey: data.eventKey }, { $setOnInsert: data }, { upsert: true, new: true }).lean().exec()
  }

  async getByEnterpriseNotificationIdAndEnterpriseId(id: string, enterpriseId: string) {
    return this.enterpriseNotificationModel.findOne({ _id: id, enterpriseId }).lean().exec()
  }

  async listByEnterpriseNotificationEnterpriseIdWithPagination(enterpriseId: string, page: number, pageSize: number) {
    return this.enterpriseNotificationModel.find({ enterpriseId }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean().exec()
  }

  async updateByEnterpriseNotificationIdAndEnterpriseIdAndVersion(id: string, enterpriseId: string, version: number, data: Partial<EnterpriseNotification>) {
    return this.enterpriseNotificationModel.findOneAndUpdate({ _id: id, enterpriseId, version }, { $set: data, $inc: { version: 1 } }, { new: true }).lean().exec()
  }

  async listByConversationIdAndEnterpriseId(conversationId: string, enterpriseId: string) {
    const messages = await this.enterpriseMessageModel.find({ conversationId, enterpriseId }).sort({ createdAt: -1, _id: -1 }).limit(100).lean().exec()
    return messages.reverse()
  }

  async getByKnowledgeIdAndRevision(enterpriseId: string, knowledgeId: string, revision: number) {
    return this.knowledgeVersionModel.findOne({ enterpriseId, knowledgeId, revision: { $gt: revision }, approvedBy: { $ne: '' } }).lean().exec()
  }

  async updateByKnowledgeIdAndRevision(enterpriseId: string, knowledgeId: string, revision: number) {
    return this.knowledgeVersionModel.updateMany({ enterpriseId, knowledgeId, revision: { $lt: revision }, status: 'approved' }, { $set: { status: 'withdrawn' }, $inc: { version: 1 } }).exec()
  }

  async listByKnowledgeExpiry() {
    return this.knowledgeVersionModel.find({ status: 'approved', validUntil: { $lte: new Date() } }).limit(100).lean().exec()
  }

  async listByKnowledgeIdBeforeRevision(enterpriseId: string, knowledgeId: string, revision: number) {
    return this.knowledgeVersionModel.find({ enterpriseId, knowledgeId, revision: { $lt: revision }, status: 'approved' }).lean().exec()
  }

  async updateByPublishKnowledgeId(enterpriseId: string, knowledgeId: string) {
    const revisions = await this.contentRevisionModel.find({ enterpriseId, knowledgeIds: knowledgeId }).select('_id').lean().exec()
    return this.enterprisePublishJobModel.updateMany({ enterpriseId, revisionId: { $in: revisions.map(revision => String(revision._id)) }, status: { $in: ['scheduled', 'waiting_executor', 'awaiting_confirmation'] } }, { $set: { status: 'blocked' }, $inc: { version: 1 } }).exec()
  }

  async listByEnterpriseIdAndNotificationPending(enterpriseId: string) {
    return this.enterpriseLeadModel.find({ enterpriseId, notificationPending: true }).limit(100).lean().exec()
  }

  async updateByLeadIdAndDeliveredKey(id: string, enterpriseId: string, key: string) {
    return this.enterpriseLeadModel.updateOne({ _id: id, enterpriseId }, { $addToSet: { deliveredKeys: key } }).exec()
  }

  async updateByLeadIdAndVersionAndNotificationPending(id: string, enterpriseId: string, version: number) {
    return this.enterpriseLeadModel.updateOne({ _id: id, enterpriseId, version }, { $set: { notificationPending: false } }).exec()
  }

  async listByEnterpriseIdAndReminderDue(enterpriseId: string, responseBefore: Date) {
    return this.enterpriseLeadModel.find({ enterpriseId, stage: { $nin: ['won', 'lost'] }, $or: [
      { createdAt: { $lte: responseBefore }, responseReminderPrepared: false },
      { nextFollowUpAt: { $ne: null, $lte: new Date() }, $expr: { $ne: ['$nextFollowUpAt', '$followUpReminderFor'] } },
    ] }).limit(100).lean().exec()
  }
}
