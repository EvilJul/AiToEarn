import { createZodDto } from '@yikart/common'
import { z } from 'zod'
import { REDNOTE_METADATA } from '../channels/platforms/rednote/rednote.constants'
import { objectIdSchema } from './enterprise.dto'
import { EnterpriseResourceKind, KnowledgeCategory, PublishExecutionMode, ServiceChannel, TopicSourceType } from './enterprise.enums'

export const CreateKnowledgeDtoSchema = z.object({
  supersedesId: objectIdSchema.optional().describe('前一知识版本 ID'),
  evidenceAssetIds: z.array(objectIdSchema).max(9).default([]).describe('作为事实证据的本人图片素材'),
  title: z.string().trim().min(1).max(200).describe('资料标题'),
  category: z.enum(KnowledgeCategory).describe('资料分类'),
  body: z.string().trim().min(1).max(20000).describe('有依据的企业资料'),
  source: z.string().trim().min(1).max(2000).describe('证据来源说明'),
  validUntil: z.coerce.date().describe('有效期'),
}).strict()
export class CreateKnowledgeDto extends createZodDto(CreateKnowledgeDtoSchema, 'CreateEnterpriseKnowledgeDto') {}

export const VersionActionDtoSchema = z.object({
  expectedVersion: z.number().int().nonnegative().describe('预期版本'),
  reason: z.string().max(2000).default('').describe('操作说明'),
}).strict()
export class VersionActionDto extends createZodDto(VersionActionDtoSchema, 'EnterpriseVersionActionDto') {}

export const CreateTopicDtoSchema = z.object({
  title: z.string().trim().min(1).max(200).describe('选题标题'),
  source: z.string().trim().min(1).max(2000).describe('来源链接或人工说明'),
  sourceType: z.enum(TopicSourceType).describe('来源类型'),
  occurredAt: z.coerce.date().describe('事件发生时间'),
  expiresAt: z.coerce.date().describe('推荐有效期'),
  industry: z.string().trim().min(1).max(100).describe('行业'),
  regions: z.array(z.string().max(100)).max(50).describe('地区'),
  keywords: z.array(z.string().min(1).max(50)).max(20).describe('关键词'),
}).strict()
export class CreateTopicDto extends createZodDto(CreateTopicDtoSchema, 'CreateEnterpriseTopicDto') {}

export const TopicFeedbackDtoSchema = z.object({
  expectedVersion: z.number().int().nonnegative().describe('预期版本'),
  feedback: z.enum(['accepted', 'rejected']).describe('采纳反馈'),
  reason: z.string().max(2000).default('').describe('反馈说明'),
}).strict()
export class TopicFeedbackDto extends createZodDto(TopicFeedbackDtoSchema, 'EnterpriseTopicFeedbackDto') {}

export const CreateRevisionDtoSchema = z.object({
  generationId: objectIdSchema.optional().describe('企业生成尝试来源'),
  sourceRevisionId: objectIdSchema.optional().describe('创建修订所基于的旧版本 ID；省略则新建内容'),
  title: z.string().trim().min(1).max(REDNOTE_METADATA.contentLimits.maxTitleLength).describe('小红书标题'),
  body: z.string().trim().min(1).max(REDNOTE_METADATA.contentLimits.maxBodyLength).describe('正文'),
  topics: z.array(z.string().min(1).max(50)).max(5).describe('话题'),
  knowledgeIds: z.array(objectIdSchema).min(1).max(50).describe('引用的批准知识'),
  topicId: objectIdSchema.optional().describe('来源选题 ID'),
  imageAssetIds: z.array(objectIdSchema).max(REDNOTE_METADATA.contentLimits.maxImages).describe('本人拥有的图片素材 ID'),
}).strict()
export class CreateRevisionDto extends createZodDto(CreateRevisionDtoSchema, 'CreateEnterpriseRevisionDto') {}

export const ReviewRevisionDtoSchema = z.object({
  expectedVersion: z.number().int().nonnegative().describe('预期版本'),
  decision: z.enum(['approved', 'rejected']).describe('审核结论'),
  reason: z.string().max(2000).default('').describe('审核说明'),
}).strict()
export class ReviewRevisionDto extends createZodDto(ReviewRevisionDtoSchema, 'ReviewEnterpriseRevisionDto') {}

export const CreatePublishJobDtoSchema = z.object({
  revisionId: objectIdSchema.describe('批准版本 ID'),
  accountId: z.string().min(1).max(200).describe('本人拥有的小红书账号 ID'),
  scheduledAt: z.coerce.date().describe('UTC 计划时间'),
  mode: z.enum(PublishExecutionMode).default(PublishExecutionMode.Manual).describe('执行方式'),
}).strict()
export class CreatePublishJobDto extends createZodDto(CreatePublishJobDtoSchema, 'CreateEnterprisePublishJobDto') {}

export const ManualPublishResultDtoSchema = z.object({
  expectedVersion: z.number().int().nonnegative().describe('预期版本'),
  workLink: z.url().max(2000).describe('小红书作品链接'),
}).strict()
export class ManualPublishResultDto extends createZodDto(ManualPublishResultDtoSchema, 'EnterpriseManualPublishResultDto') {}

export const VerifyPublishResultDtoSchema = z.object({
  expectedVersion: z.number().int().nonnegative().describe('预期版本'),
  evidence: z.string().trim().min(1).max(2000).describe('账号、作品与内容核对依据'),
}).strict()
export class VerifyPublishResultDto extends createZodDto(VerifyPublishResultDtoSchema, 'EnterpriseVerifyPublishResultDto') {}

export const CreateConversationDtoSchema = z.object({
  channel: z.enum(ServiceChannel).describe('咨询来源渠道，首期均为人工录入'),
  customerName: z.string().trim().min(1).max(100).describe('客户显示名称'),
  source: z.string().trim().min(1).max(2000).describe('人工录入的来源证据'),
  summary: z.string().trim().min(1).max(5000).describe('客户原始需求'),
}).strict()
export class CreateConversationDto extends createZodDto(CreateConversationDtoSchema, 'CreateEnterpriseConversationDto') {}

export const ConversationActionDtoSchema = z.object({
  expectedVersion: z.number().int().nonnegative().describe('预期版本'),
  action: z.enum(['claim', 'close', 'follow-up']).describe('接管、关闭或跟进'),
  note: z.string().max(2000).default('').describe('跟进说明'),
}).strict()
export class ConversationActionDto extends createZodDto(ConversationActionDtoSchema, 'EnterpriseConversationActionDto') {}

export class BindEnterpriseResourceDto extends createZodDto(z.object({
  kind: z.enum(EnterpriseResourceKind).describe('资源类型'),
  resourceId: z.string().min(1).max(200).describe('本人资源 ID'),
}).strict().refine(value => value.kind !== EnterpriseResourceKind.Asset || /^[a-f\d]{24}$/i.test(value.resourceId), 'Invalid asset ID'), 'BindEnterpriseResourceDto') {}

export class CreateEnterpriseMessageDto extends createZodDto(z.object({
  requestId: z.uuid().optional().describe('当前用户人工录入的幂等请求标识'),
  body: z.string().trim().min(1).max(5000).describe('人工录入的客户原始消息'),
}).strict(), 'CreateEnterpriseMessageDto') {}

export class UpdateEnterpriseLeadDto extends createZodDto(z.object({
  expectedVersion: z.number().int().nonnegative().describe('预期版本'),
  ownerId: z.string().min(1).max(100).optional().describe('企业销售负责人'),
  stage: z.enum(['new', 'qualified', 'scheduled', 'won', 'lost']).describe('线索阶段'),
  nextFollowUpAt: z.coerce.date().nullable().describe('下次跟进时间'),
  note: z.string().trim().min(1).max(2000).describe('跟进记录'),
}).strict(), 'UpdateEnterpriseLeadDto') {}

export class RepublishEnterpriseJobDto extends createZodDto(z.object({
  expectedVersion: z.number().int().nonnegative().describe('已完成任务的预期版本'),
  requestId: z.uuid().describe('主动再次发布的幂等标识'),
  scheduledAt: z.coerce.date().describe('再次发布的计划时间'),
}).strict(), 'RepublishEnterpriseJobDto') {}
