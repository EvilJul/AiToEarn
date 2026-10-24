import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aitoearn-auth'
import { ApiDoc, ParseObjectIdPipe } from '@yikart/common'
import { EnterpriseContentService } from './content.service'
import { EnterpriseConversationsService } from './conversations.service'
import { EnterprisePaginationDto } from './enterprise.dto'
import { EnterpriseAuditVo } from './enterprise.vo'
import { EnterpriseNotificationsService } from './notifications.service'
import { BindEnterpriseResourceDto, ConversationActionDto, CreateConversationDto, CreateEnterpriseMessageDto, CreateKnowledgeDto, CreatePublishJobDto, CreateRevisionDto, CreateTopicDto, ManualPublishResultDto, RepublishEnterpriseJobDto, ReviewRevisionDto, TopicFeedbackDto, UpdateEnterpriseLeadDto, VerifyPublishResultDto, VersionActionDto } from './operations.dto'
import { ChannelCapabilityVo, ContentRevisionVo, ConversationVo, EnterpriseImageAssetVo, EnterpriseImageSourceVo, EnterpriseLeadVo, EnterpriseMessageVo, EnterpriseNotificationVo, EnterpriseReplySuggestionsVo, EnterpriseResourceVo, KnowledgeVersionVo, MaterialPackageVo, PublishJobVo, TopicCandidateVo } from './operations.vo'
import { EnterprisePublishingService } from './publishing.service'
import { EnterpriseResourcesService } from './resources.service'

@ApiTags('Enterprise/Operations')
@Controller('/enterprise-ops/enterprises/:enterpriseId')
export class EnterpriseOperationsController {
  constructor(private readonly notificationsService: EnterpriseNotificationsService, private readonly resources: EnterpriseResourcesService, private readonly content: EnterpriseContentService, private readonly publishing: EnterprisePublishingService, private readonly conversations: EnterpriseConversationsService) {}

  @ApiDoc({ summary: '显式授权本人资源供企业使用', body: BindEnterpriseResourceDto.schema })
  @Post('/resources/bind')
  async bindResource(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Body() dto: BindEnterpriseResourceDto) {
    return this.resources.bind(token.id, enterpriseId, dto.kind, dto.resourceId)
  }

  @ApiDoc({ summary: '撤回企业资源授权', body: BindEnterpriseResourceDto.schema })
  @Post('/resources/revoke')
  async revokeResource(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Body() dto: BindEnterpriseResourceDto) {
    return this.resources.revoke(token.id, enterpriseId, dto.kind, dto.resourceId)
  }

  @ApiDoc({ summary: '本人可用于企业内容的图片素材', response: [EnterpriseImageAssetVo] })
  @Get('/image-assets')
  async imageAssets(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string) {
    return (await this.content.listImageAssets(token.id, enterpriseId)).map(item => EnterpriseImageAssetVo.create(item))
  }

  @ApiDoc({ summary: '查询 knowledge', query: EnterprisePaginationDto.schema, response: [KnowledgeVersionVo] })
  @Get('/knowledge')
  async knowledge(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Query() query: EnterprisePaginationDto) {
    return (await this.content.listKnowledge(token.id, enterpriseId, query)).map(item => KnowledgeVersionVo.create({ ...item, id: String(item._id) }))
  }

  @ApiDoc({ summary: '查询 topics', query: EnterprisePaginationDto.schema, response: [TopicCandidateVo] })
  @Get('/topics')
  async topics(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Query() query: EnterprisePaginationDto) {
    return (await this.content.listTopics(token.id, enterpriseId, query)).map(item => TopicCandidateVo.create({ ...item, id: String(item._id) }))
  }

  @ApiDoc({ summary: '查询 revisions', query: EnterprisePaginationDto.schema, response: [ContentRevisionVo] })
  @Get('/revisions')
  async revisions(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Query() query: EnterprisePaginationDto) {
    return (await this.content.listRevisions(token.id, enterpriseId, query)).map(item => ContentRevisionVo.create({ ...item, id: String(item._id) }))
  }

  @ApiDoc({ summary: '查询 publish-jobs', query: EnterprisePaginationDto.schema, response: [PublishJobVo] })
  @Get('/publish-jobs')
  async jobs(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Query() query: EnterprisePaginationDto) {
    return (await this.publishing.list(token.id, enterpriseId, query)).map(item => PublishJobVo.create({ ...item, id: String(item._id) }))
  }

  @ApiDoc({ summary: '查询 conversations', query: EnterprisePaginationDto.schema, response: [ConversationVo] })
  @Get('/conversations')
  async conversationsList(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Query() query: EnterprisePaginationDto) {
    return (await this.conversations.list(token.id, enterpriseId, query)).map(item => ConversationVo.create({ ...item, id: String(item._id) }))
  }

  @ApiDoc({ summary: '创建 knowledge', body: CreateKnowledgeDto.schema, response: KnowledgeVersionVo })
  @Post('/knowledge')
  async createKnowledge(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Body() dto: CreateKnowledgeDto) {
    const item = await this.content.createKnowledge(token.id, enterpriseId, dto)
    return KnowledgeVersionVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: '创建 topics', body: CreateTopicDto.schema, response: TopicCandidateVo })
  @Post('/topics')
  async createTopic(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Body() dto: CreateTopicDto) {
    const item = await this.content.createTopic(token.id, enterpriseId, dto)
    return TopicCandidateVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: '创建 revisions', body: CreateRevisionDto.schema, response: ContentRevisionVo })
  @Post('/revisions')
  async createRevision(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Body() dto: CreateRevisionDto) {
    const item = await this.content.createRevision(token.id, enterpriseId, dto)
    return ContentRevisionVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: '创建 publish-jobs', body: CreatePublishJobDto.schema, response: PublishJobVo })
  @Post('/publish-jobs')
  async createJob(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Body() dto: CreatePublishJobDto) {
    const item = await this.publishing.create(token.id, enterpriseId, dto)
    return PublishJobVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: '创建 conversations', body: CreateConversationDto.schema, response: ConversationVo })
  @Post('/conversations')
  async createConversation(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Body() dto: CreateConversationDto) {
    const item = await this.conversations.create(token.id, enterpriseId, dto)
    return ConversationVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: 'submitReview', body: VersionActionDto.schema, response: ContentRevisionVo })
  @Post('/revisions/:id/submit-review')
  async submitReview(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: VersionActionDto) {
    const item = await this.content.submitReview(token.id, enterpriseId, id, dto)
    return ContentRevisionVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: 'review', body: ReviewRevisionDto.schema, response: ContentRevisionVo })
  @Post('/revisions/:id/review')
  async review(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: ReviewRevisionDto) {
    const item = await this.content.review(token.id, enterpriseId, id, dto)
    return ContentRevisionVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: 'feedback', body: TopicFeedbackDto.schema, response: TopicCandidateVo })
  @Post('/topics/:id/feedback')
  async feedback(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: TopicFeedbackDto) {
    const item = await this.content.feedback(token.id, enterpriseId, id, dto)
    return TopicCandidateVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: 'manualResult', body: ManualPublishResultDto.schema, response: PublishJobVo })
  @Post('/publish-jobs/:id/manual-result')
  async manualResult(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: ManualPublishResultDto) {
    const item = await this.publishing.manualResult(token.id, enterpriseId, id, dto)
    return PublishJobVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: 'verify', body: VerifyPublishResultDto.schema, response: PublishJobVo })
  @Post('/publish-jobs/:id/verify')
  async verify(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: VerifyPublishResultDto) {
    const item = await this.publishing.verify(token.id, enterpriseId, id, dto)
    return PublishJobVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: 'cancel', body: VersionActionDto.schema, response: PublishJobVo })
  @Post('/publish-jobs/:id/cancel')
  async cancel(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: VersionActionDto) {
    const item = await this.publishing.cancel(token.id, enterpriseId, id, dto)
    return PublishJobVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: 'conversationAction', body: ConversationActionDto.schema, response: ConversationVo })
  @Post('/conversations/:id/actions')
  async conversationAction(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: ConversationActionDto) {
    const item = await this.conversations.action(token.id, enterpriseId, id, dto)
    return ConversationVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: 'knowledge approve', body: VersionActionDto.schema, response: KnowledgeVersionVo })
  @Post('/knowledge/:id/approve')
  async approveKnowledge(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: VersionActionDto) {
    const item = await this.content.reviewKnowledge(token.id, enterpriseId, id, 'approve', dto)
    return KnowledgeVersionVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: 'knowledge withdraw', body: VersionActionDto.schema, response: KnowledgeVersionVo })
  @Post('/knowledge/:id/withdraw')
  async withdrawKnowledge(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: VersionActionDto) {
    const item = await this.content.reviewKnowledge(token.id, enterpriseId, id, 'withdraw', dto)
    return KnowledgeVersionVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: '已审核素材包（客户端 ZIP）', response: MaterialPackageVo })
  @Post('/publish-jobs/:id/material-package')
  async materialPackage(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return MaterialPackageVo.create(await this.publishing.materialPackage(token.id, enterpriseId, id))
  }

  @ApiDoc({ summary: '渠道能力', response: [ChannelCapabilityVo] })
  @Get('/capabilities')
  async capabilities(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string) {
    return (await this.conversations.capabilities(token.id, enterpriseId)).map(item => ChannelCapabilityVo.create(item))
  }

  @ApiDoc({ summary: '人工录入会话消息', body: CreateEnterpriseMessageDto.schema, response: EnterpriseMessageVo })
  @Post('/conversations/:id/messages')
  async addMessage(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: CreateEnterpriseMessageDto) {
    const item = await this.conversations.addMessage(token.id, enterpriseId, id, dto)
    return EnterpriseMessageVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: '会话原始消息', response: [EnterpriseMessageVo] })
  @Get('/conversations/:id/messages')
  async messages(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return (await this.conversations.messages(token.id, enterpriseId, id)).map(item => EnterpriseMessageVo.create({ ...item, id: String(item._id) }))
  }

  @ApiDoc({ summary: '已审核知识原文建议，不自动发送', response: EnterpriseReplySuggestionsVo })
  @Post('/conversations/:id/reply-suggestions')
  async suggestions(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return EnterpriseReplySuggestionsVo.create(await this.conversations.suggestions(token.id, enterpriseId, id))
  }

  @ApiDoc({ summary: '企业意向线索', query: EnterprisePaginationDto.schema, response: [EnterpriseLeadVo] })
  @Get('/leads')
  async leads(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Query() query: EnterprisePaginationDto) {
    return (await this.conversations.leads(token.id, enterpriseId, query)).map(item => EnterpriseLeadVo.create({ ...item, id: String(item._id) }))
  }

  @ApiDoc({ summary: '线索负责人、阶段与下次跟进', body: UpdateEnterpriseLeadDto.schema, response: EnterpriseLeadVo })
  @Post('/leads/:id/follow-ups')
  async updateLead(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateEnterpriseLeadDto) {
    const item = await this.conversations.updateLead(token.id, enterpriseId, id, dto)
    return EnterpriseLeadVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: '站内线索待办', query: EnterprisePaginationDto.schema, response: [EnterpriseNotificationVo] })
  @Get('/notifications')
  async notifications(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Query() query: EnterprisePaginationDto) {
    return (await this.conversations.notifications(token.id, enterpriseId, query)).map(item => EnterpriseNotificationVo.create({ ...item, id: String(item._id) }))
  }

  @ApiDoc({ summary: '已授权企业资源', response: [EnterpriseResourceVo] })
  @Get('/resources')
  async resourcesList(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string) {
    return (await this.resources.list(token.id, enterpriseId)).map(item => EnterpriseResourceVo.create(item))
  }

  @ApiDoc({ summary: '恢复机器人（需已验证渠道，当前不启用）' })
  @Post('/conversations/:id/resume-bot')
  async resumeBot(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return this.conversations.resumeBot(token.id, enterpriseId, id)
  }

  @ApiDoc({ summary: '主动再次发布已核验内容', body: RepublishEnterpriseJobDto.schema, response: PublishJobVo })
  @Post('/publish-jobs/:id/republish')
  async republish(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: RepublishEnterpriseJobDto) {
    const item = await this.publishing.republish(token.id, enterpriseId, id, dto)
    return PublishJobVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: '确认站内通知已读，不代表销售接管', body: VersionActionDto.schema, response: EnterpriseNotificationVo })
  @Post('/notifications/:id/acknowledge')
  async acknowledge(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: VersionActionDto) {
    const item = await this.notificationsService.acknowledge(token.id, enterpriseId, id, dto)
    return EnterpriseNotificationVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: '读取企业内容具体版本', response: ContentRevisionVo })
  @Get('/revisions/:id')
  async revision(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string) {
    const item = await this.content.getRevision(token.id, enterpriseId, id)
    return ContentRevisionVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: '内容审核事件历史', response: [EnterpriseAuditVo] })
  @Get('/revisions/:id/history')
  async revisionHistory(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return (await this.content.history(token.id, enterpriseId, id)).map(event => EnterpriseAuditVo.create(event))
  }

  @ApiDoc({ summary: '读取授权图片用于模板合成', response: EnterpriseImageSourceVo })
  @Post('/image-assets/:id/source')
  async imageSource(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return EnterpriseImageSourceVo.create(await this.content.imageSource(token.id, enterpriseId, id))
  }

  @ApiDoc({ summary: '读取知识版本及事实依据', response: KnowledgeVersionVo })
  @Get('/knowledge/:id')
  async knowledgeVersion(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string) {
    const item = await this.content.getKnowledge(token.id, enterpriseId, id)
    return KnowledgeVersionVo.create({ ...item, id: String(item._id) })
  }
}
