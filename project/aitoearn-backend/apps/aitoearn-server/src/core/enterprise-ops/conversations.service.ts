import { randomUUID } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { AppException, ResponseCode } from '@yikart/common'
import { EnterpriseConflictException } from './enterprise-conflict.exception'
import { EnterprisePaginationDto } from './enterprise.dto'
import { EnterpriseNotificationKind, EnterpriseRole, KnowledgeStatus, ServiceChannel } from './enterprise.enums'
import { EnterpriseService } from './enterprise.service'
import { EnterpriseNotificationsService } from './notifications.service'
import { ConversationActionDto, CreateConversationDto, CreateEnterpriseMessageDto, UpdateEnterpriseLeadDto } from './operations.dto'
import { EnterpriseOperationsRepository } from './operations.repository'

@Injectable()
export class EnterpriseConversationsService {
  private readonly logger = new Logger(EnterpriseConversationsService.name)
  constructor(private readonly access: EnterpriseService, private readonly repository: EnterpriseOperationsRepository, private readonly notificationsService: EnterpriseNotificationsService) {}

  async list(userId: string, enterpriseId: string, query: EnterprisePaginationDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Sales, EnterpriseRole.Operator])
    return this.repository.listByEnterpriseConversationEnterpriseIdWithPagination(enterpriseId, query.page, query.pageSize)
  }

  async create(userId: string, enterpriseId: string, dto: CreateConversationDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Sales, EnterpriseRole.Operator])
    const conversation = await this.repository.createEnterpriseConversation({ ...dto, enterpriseId, createdBy: userId })
    await this.addMessage(userId, enterpriseId, String(conversation._id), { body: dto.summary })
    await this.access.audit(enterpriseId, userId, 'conversation.recorded-manually', String(conversation._id))
    return conversation
  }

  async messages(userId: string, enterpriseId: string, id: string) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Sales, EnterpriseRole.Operator])
    const conversation = await this.repository.getByEnterpriseConversationIdAndEnterpriseId(id, enterpriseId)
    if (!conversation)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    return this.repository.listByConversationIdAndEnterpriseId(id, enterpriseId)
  }

  async addMessage(userId: string, enterpriseId: string, id: string, dto: CreateEnterpriseMessageDto) {
    const { enterprise } = await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Sales, EnterpriseRole.Operator])
    const conversation = await this.repository.getByEnterpriseConversationIdAndEnterpriseId(id, enterpriseId)
    if (!conversation || conversation.state === 'closed')
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const message = await this.repository.createEnterpriseMessage({ enterpriseId, createdBy: userId, conversationId: id, requestId: dto.requestId || randomUUID(), body: dto.body, sourceType: 'manual' })
    if (message.body !== dto.body)
      throw new EnterpriseConflictException()
    const intent = detectEnterpriseIntent(dto.body)
    if (intent) {
      const lead = await this.repository.createEnterpriseLead({ enterpriseId, createdBy: userId, conversationId: id, triggeringMessageId: String(message._id), intent, summary: dto.body, ownerId: conversation.ownerId, notificationPending: true, notificationEvents: [{ key: `lead:${message._id}:rules-v1`, targetUserId: conversation.ownerId || enterprise.ownerUserId, summary: dto.body.slice(0, 300), kind: EnterpriseNotificationKind.Intent }] })
      try {
        await this.notificationsService.deliver(lead)
      }
      catch {
        this.logger.warn('Lead recorded; notification remains in the durable outbox for retry')
      }
    }
    await this.access.audit(enterpriseId, userId, 'message.recorded-manually', String(message._id))
    return message
  }

  async suggestions(userId: string, enterpriseId: string, id: string): Promise<{ mode: 'knowledge_excerpt', requiresHuman: true, suggestions: { knowledgeId: string, title: string, answer: string, source: string }[] }> {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Sales, EnterpriseRole.Operator])
    const conversation = await this.repository.getByEnterpriseConversationIdAndEnterpriseId(id, enterpriseId)
    if (!conversation)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    const messages = await this.repository.listByConversationIdAndEnterpriseId(id, enterpriseId)
    const text = messages.at(-1)?.body || conversation.summary
    const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []
    const terms = [...new Set(words.flatMap(word => /\p{Script=Han}/u.test(word) ? Array.from({ length: Math.max(0, word.length - 1) }, (_, index) => word.slice(index, index + 2)) : [word]).filter(word => word.length > 1))]
    const knowledge = await this.repository.listByKnowledgeVersionEnterpriseIdWithPagination(enterpriseId, 1, 100)
    const ranked = knowledge.filter(item => item.status === KnowledgeStatus.Approved && item.validUntil > new Date()).map(item => ({ item, score: terms.filter(term => `${item.title} ${item.body}`.toLowerCase().includes(term)).length })).filter(result => result.score > 0).sort((a, b) => b.score - a.score)
    const suggestions: { knowledgeId: string, title: string, answer: string, source: string }[] = []
    for (const { item } of ranked) {
      if (await this.repository.getByKnowledgeIdAndRevision(enterpriseId, item.knowledgeId, item.revision))
        continue
      suggestions.push({ knowledgeId: String(item._id), title: item.title, answer: item.body, source: item.source })
      if (suggestions.length === 3)
        break
    }
    return { mode: 'knowledge_excerpt', requiresHuman: true, suggestions }
  }

  async leads(userId: string, enterpriseId: string, query: EnterprisePaginationDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Sales, EnterpriseRole.Operator])
    return this.repository.listByEnterpriseLeadEnterpriseIdWithPagination(enterpriseId, query.page, query.pageSize)
  }

  async updateLead(userId: string, enterpriseId: string, id: string, dto: UpdateEnterpriseLeadDto) {
    const { role } = await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Sales])
    const lead = await this.repository.getByEnterpriseLeadIdAndEnterpriseId(id, enterpriseId)
    if (!lead || (lead.ownerId && lead.ownerId !== userId && role !== EnterpriseRole.Admin))
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    const ownerId = dto.ownerId || lead.ownerId || userId
    await this.access.authorize(ownerId, enterpriseId, [EnterpriseRole.Sales])
    const updated = await this.repository.updateByEnterpriseLeadIdAndEnterpriseIdAndVersion(id, enterpriseId, dto.expectedVersion, { ownerId, stage: dto.stage, nextFollowUpAt: dto.nextFollowUpAt, followUps: [...lead.followUps, `${new Date().toISOString()} ${userId}: ${dto.note}`], notificationPending: true, notificationEvents: [...lead.notificationEvents, { key: `lead:${id}:assignment:${lead.version + 1}`, targetUserId: ownerId, summary: lead.summary.slice(0, 300), kind: EnterpriseNotificationKind.Intent }] })
    if (!updated)
      throw new EnterpriseConflictException()
    try {
      await this.notificationsService.deliver(updated)
    }
    catch {
      this.logger.warn('Lead follow-up recorded; notification remains pending for retry')
    }
    await this.access.audit(enterpriseId, userId, 'lead.follow-up', id, dto.note)
    return updated
  }

  async notifications(userId: string, enterpriseId: string, query: EnterprisePaginationDto) {
    const { role } = await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Sales, EnterpriseRole.Operator])
    const records = await this.repository.listByEnterpriseNotificationEnterpriseIdWithPagination(enterpriseId, query.page, query.pageSize)
    return role === EnterpriseRole.Admin ? records : records.filter(record => record.targetUserId === userId)
  }

  async action(userId: string, enterpriseId: string, id: string, dto: ConversationActionDto) {
    const { role } = await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Sales])
    const conversation = await this.repository.getByEnterpriseConversationIdAndEnterpriseId(id, enterpriseId)
    if (!conversation || conversation.state === 'closed')
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    if (dto.action === 'claim' && conversation.ownerId)
      throw new EnterpriseConflictException()
    if (dto.action !== 'claim' && (conversation.state !== 'human' || (conversation.ownerId !== userId && role !== EnterpriseRole.Admin)))
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    if (dto.action === 'follow-up' && !dto.note.trim())
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const data = dto.action === 'claim'
      ? { state: 'human', ownerId: userId }
      : dto.action === 'close'
        ? { state: 'closed' }
        : { followUps: [...conversation.followUps, `${new Date().toISOString()} ${userId}: ${dto.note}`] }
    const updated = await this.repository.updateByEnterpriseConversationIdAndEnterpriseIdAndVersion(id, enterpriseId, dto.expectedVersion, data)
    if (!updated)
      throw new EnterpriseConflictException()
    await this.access.audit(enterpriseId, userId, `conversation.${dto.action}`, id, dto.note)
    return updated
  }

  async resumeBot(userId: string, enterpriseId: string, id: string) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Sales])
    const conversation = await this.repository.getByEnterpriseConversationIdAndEnterpriseId(id, enterpriseId)
    if (!conversation)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    throw new AppException(ResponseCode.EnterpriseCapabilityUnavailable)
  }

  async capabilities(userId: string, enterpriseId: string) {
    await this.access.authorize(userId, enterpriseId)
    return Object.values(ServiceChannel).map(channel => ({ channel, receive: false, send: false, autoReply: false, manualEntry: true, validation: 'not_tested' }))
  }
}

export function detectEnterpriseIntent(text: string) {
  if (/人工|真人|销售|human|agent|sales\s*person/i.test(text))
    return 'request_human'
  if (/报价|价格|多少钱|询价|price|quote|cost/i.test(text))
    return 'quote'
  if (/预约|时间|appointment|book/i.test(text))
    return 'appointment'
  if (/购买|下单|订购|purchase|buy|order/i.test(text))
    return 'purchase'
  if (/\b1[3-9]\d{9}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text))
    return 'contact'
  return null
}
