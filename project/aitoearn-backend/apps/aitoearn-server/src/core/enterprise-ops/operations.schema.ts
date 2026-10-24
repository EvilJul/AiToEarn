import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ContentReviewStatus, EnterpriseNotificationKind, EnterprisePublishStatus, KnowledgeCategory, KnowledgeStatus, PublishExecutionMode, ServiceChannel, TopicSourceType } from './enterprise.enums'

class EnterpriseScopedRecord {
  _id: string
  createdAt: Date
  updatedAt: Date

  @Prop({ required: true, immutable: true, index: true })
  enterpriseId: string

  @Prop({ required: true, immutable: true })
  createdBy: string

  @Prop({ default: 0 })
  version: number
}

@Schema({ collection: 'knowledgeVersions', timestamps: true, versionKey: false })
export class KnowledgeVersion extends EnterpriseScopedRecord {
  @Prop({ required: true, immutable: true })
  knowledgeId: string

  @Prop({ default: '', immutable: true })
  supersedesId: string

  @Prop({ required: true, immutable: true })
  revision: number

  @Prop({ type: [String], default: [], immutable: true })
  evidenceAssetIds: string[]

  @Prop({ type: [String], default: [], immutable: true })
  evidenceHashes: string[]

  @Prop({ required: true })
  title: string

  @Prop({ required: true })
  category: KnowledgeCategory

  @Prop({ required: true })
  body: string

  @Prop({ required: true })
  source: string

  @Prop({ required: true, type: Date })
  validUntil: Date

  @Prop({ enum: KnowledgeStatus, default: KnowledgeStatus.Draft })
  status: KnowledgeStatus

  @Prop({ default: '' })
  approvedBy: string
}
export const KnowledgeVersionSchema = SchemaFactory.createForClass(KnowledgeVersion)
KnowledgeVersionSchema.index({ enterpriseId: 1, createdAt: -1 })

@Schema({ collection: 'topicCandidates', timestamps: true, versionKey: false })
export class TopicCandidate extends EnterpriseScopedRecord {
  @Prop({ required: true })
  title: string

  @Prop({ required: true })
  source: string

  @Prop({ required: true })
  sourceType: TopicSourceType

  @Prop({ type: Date, required: true })
  occurredAt: Date

  @Prop({ type: Date, required: true })
  expiresAt: Date

  @Prop({ required: true })
  industry: string

  @Prop({ type: [String], default: [] })
  regions: string[]

  @Prop({ type: [String], default: [] })
  keywords: string[]

  @Prop({ default: '' })
  feedback: string

  @Prop({ default: '' })
  feedbackReason: string
}
export const TopicCandidateSchema = SchemaFactory.createForClass(TopicCandidate)
TopicCandidateSchema.index({ enterpriseId: 1, createdAt: -1 })

@Schema({ collection: 'contentRevisions', timestamps: true, versionKey: false })
export class ContentRevision extends EnterpriseScopedRecord {
  @Prop({ default: '', immutable: true })
  generationId: string

  @Prop({ default: '', immutable: true })
  parentRevisionId: string

  @Prop({ required: true, immutable: true })
  revisionNumber: number

  @Prop({ required: true, index: true })
  contentId: string

  @Prop({ required: true })
  title: string

  @Prop({ required: true })
  body: string

  @Prop({ type: [String], default: [] })
  topics: string[]

  @Prop({ type: [String], default: [] })
  knowledgeIds: string[]

  @Prop({ default: '' })
  topicId: string

  @Prop({ default: '' })
  topicSnapshot: string

  @Prop({ type: [String], default: [] })
  imageAssetIds: string[]

  @Prop({ type: [String], default: [] })
  imageHashes: string[]

  @Prop({ required: true })
  contentHash: string

  @Prop({ enum: ContentReviewStatus, default: ContentReviewStatus.Draft })
  status: ContentReviewStatus

  @Prop({ default: '' })
  reviewedBy: string

  @Prop({ default: '' })
  reviewReason: string
}
export const ContentRevisionSchema = SchemaFactory.createForClass(ContentRevision)
ContentRevisionSchema.index({ enterpriseId: 1, createdAt: -1 })

@Schema({ collection: 'enterprisePublishJobs', timestamps: true, versionKey: false })
export class EnterprisePublishJob extends EnterpriseScopedRecord {
  @Prop({ default: 'initial', immutable: true })
  runKey: string

  @Prop({ default: '', immutable: true })
  originJobId: string

  @Prop({ default: '' })
  executorId: string

  @Prop({ default: '' })
  attemptId: string

  @Prop({ type: Date, default: null })
  leaseExpiresAt: Date | null

  @Prop({ type: [String], default: [] })
  processedEventIds: string[]

  @Prop({ default: 0 })
  lastEventSequence: number

  @Prop({ required: true })
  revisionId: string

  @Prop({ required: true })
  accountId: string

  @Prop({ required: true })
  contentHash: string

  @Prop({ type: Date, required: true })
  scheduledAt: Date

  @Prop({ enum: ['manual', 'browser'], default: 'manual' })
  mode: PublishExecutionMode

  @Prop({ enum: EnterprisePublishStatus, default: EnterprisePublishStatus.Scheduled })
  status: EnterprisePublishStatus

  @Prop({ default: '' })
  workLink: string

  @Prop({ default: '' })
  verificationMethod: string

  @Prop({ default: '' })
  verifiedBy: string

  @Prop({ default: '' })
  evidence: string
}
export const EnterprisePublishJobSchema = SchemaFactory.createForClass(EnterprisePublishJob)
EnterprisePublishJobSchema.index({ enterpriseId: 1, createdAt: -1 })

@Schema({ collection: 'enterpriseConversations', timestamps: true, versionKey: false })
export class EnterpriseConversation extends EnterpriseScopedRecord {
  @Prop({ enum: ServiceChannel, default: ServiceChannel.Manual })
  channel: ServiceChannel

  @Prop({ required: true })
  customerName: string

  @Prop({ required: true })
  source: string

  @Prop({ required: true })
  summary: string

  @Prop({ enum: ['waiting_human', 'human', 'closed'], default: 'waiting_human' })
  state: string

  @Prop({ default: '' })
  ownerId: string

  @Prop({ type: [String], default: [] })
  followUps: string[]
}
export const EnterpriseConversationSchema = SchemaFactory.createForClass(EnterpriseConversation)
EnterpriseConversationSchema.index({ enterpriseId: 1, createdAt: -1 })

EnterprisePublishJobSchema.index({ enterpriseId: 1, accountId: 1, revisionId: 1, scheduledAt: 1, runKey: 1 }, { unique: true })

@Schema({ collection: 'enterpriseMessages', timestamps: true, versionKey: false })
export class EnterpriseMessage extends EnterpriseScopedRecord {
  @Prop({ required: true, immutable: true })
  requestId: string

  @Prop({ required: true })
  conversationId: string

  @Prop({ required: true })
  body: string

  @Prop({ default: 'manual' })
  sourceType: string
}
export const EnterpriseMessageSchema = SchemaFactory.createForClass(EnterpriseMessage)
EnterpriseMessageSchema.index({ enterpriseId: 1, createdAt: -1 })

@Schema({ collection: 'enterpriseLeads', timestamps: true, versionKey: false })
export class EnterpriseLead extends EnterpriseScopedRecord {
  @Prop({ type: [Object], default: [] })
  notificationEvents: { key: string, targetUserId: string, summary: string, kind: EnterpriseNotificationKind }[]

  @Prop({ type: [String], default: [] })
  deliveredKeys: string[]

  @Prop({ default: false })
  notificationPending: boolean

  @Prop({ default: false })
  responseReminderPrepared: boolean

  @Prop({ type: Date, default: null })
  followUpReminderFor: Date | null

  @Prop({ required: true })
  conversationId: string

  @Prop({ required: true })
  triggeringMessageId: string

  @Prop({ required: true })
  intent: string

  @Prop({ required: true })
  summary: string

  @Prop({ default: '' })
  ownerId: string

  @Prop({ default: 'new' })
  stage: string

  @Prop({ type: Date, default: null })
  nextFollowUpAt: Date | null

  @Prop({ type: [String], default: [] })
  followUps: string[]
}
export const EnterpriseLeadSchema = SchemaFactory.createForClass(EnterpriseLead)
EnterpriseLeadSchema.index({ enterpriseId: 1, createdAt: -1 })

@Schema({ collection: 'enterpriseNotifications', timestamps: true, versionKey: false })
export class EnterpriseNotification extends EnterpriseScopedRecord {
  @Prop({ enum: EnterpriseNotificationKind, default: EnterpriseNotificationKind.Intent })
  kind: EnterpriseNotificationKind

  @Prop({ required: true })
  leadId: string

  @Prop({ required: true })
  targetUserId: string

  @Prop({ required: true })
  summary: string

  @Prop({ default: 'available' })
  state: string

  @Prop({ required: true })
  eventKey: string
}
export const EnterpriseNotificationSchema = SchemaFactory.createForClass(EnterpriseNotification)
EnterpriseNotificationSchema.index({ enterpriseId: 1, createdAt: -1 })

EnterpriseLeadSchema.index({ enterpriseId: 1, triggeringMessageId: 1 }, { unique: true })
EnterpriseNotificationSchema.index({ enterpriseId: 1, eventKey: 1 }, { unique: true })

KnowledgeVersionSchema.index({ enterpriseId: 1, knowledgeId: 1, revision: 1 }, { unique: true })

EnterpriseLeadSchema.index({ enterpriseId: 1, notificationPending: 1 })
EnterpriseLeadSchema.index({ enterpriseId: 1, nextFollowUpAt: 1 })

KnowledgeVersionSchema.index({ status: 1, validUntil: 1 })
ContentRevisionSchema.index({ enterpriseId: 1, knowledgeIds: 1 })
EnterprisePublishJobSchema.index({ status: 1, leaseExpiresAt: 1 })
EnterprisePublishJobSchema.index({ mode: 1, status: 1, scheduledAt: 1 })

ContentRevisionSchema.index({ enterpriseId: 1, contentId: 1, revisionNumber: 1 }, { unique: true })

EnterpriseMessageSchema.index({ enterpriseId: 1, conversationId: 1, createdBy: 1, requestId: 1 }, { unique: true })
