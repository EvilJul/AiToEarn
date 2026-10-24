import { createHash, randomBytes } from 'node:crypto'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { AitoearnAiClientService } from '@yikart/aitoearn-ai-client'
import { EnterprisePlanResult } from '@yikart/aitoearn-ai-shared'
import { AppException, ResponseCode } from '@yikart/common'
import { EnterpriseContentService } from './content.service'
import { EnterpriseConflictException } from './enterprise-conflict.exception'
import { EnterpriseRole } from './enterprise.enums'
import { ENTERPRISE_OPTIONS, EnterpriseOptions, EnterpriseService } from './enterprise.service'
import { CreateEnterpriseGenerationDto, ReconcileEnterpriseUsageDto } from './generation.dto'
import { EnterpriseGenerationRepository } from './generation.repository'
import { EnterpriseGeneration, GenerationStatus } from './generation.schema'
import { EnterpriseOperationsRepository } from './operations.repository'

export function validateEnterprisePlan(snapshot: EnterpriseGeneration['snapshot'], result: EnterprisePlanResult) {
  if (!snapshot.sources.some(source => source.id === result.titleSourceId)
    || result.excerpts.some(excerpt => !snapshot.sources.some(source => source.id === excerpt.sourceId && source.body.split(/\n\s*\n/).includes(excerpt.text)))
    || (result.layout === 'case' && !snapshot.sources.some(source => source.category === 'case'))) {
    throw new AppException(ResponseCode.EnterpriseKnowledgeInvalid)
  }
  if (result.excerpts.map(item => item.text).join('\n\n').length > 900)
    throw new AppException(ResponseCode.EnterpriseInvalidOperation)
  return result
}
@Injectable()
export class EnterpriseGenerationService {
  private readonly logger = new Logger(EnterpriseGenerationService.name)
  private active = false
  constructor(private readonly access: EnterpriseService, private readonly content: EnterpriseContentService, private readonly operations: EnterpriseOperationsRepository, private readonly repository: EnterpriseGenerationRepository, private readonly ai: AitoearnAiClientService, @Inject(ENTERPRISE_OPTIONS) private readonly options: EnterpriseOptions) {}

  async create(userId: string, enterpriseId: string, dto: CreateEnterpriseGenerationDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator])
    await this.content.validateKnowledge(enterpriseId, dto.knowledgeIds)
    const knowledge = await Promise.all(dto.knowledgeIds.map(id => this.operations.getByKnowledgeVersionIdAndEnterpriseId(id, enterpriseId)))
    const topic = dto.topicId ? await this.operations.getByTopicCandidateIdAndEnterpriseId(dto.topicId, enterpriseId) : null
    if (dto.topicId && (!topic || topic.expiresAt <= new Date()))
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const previous = dto.retryOf ? await this.repository.get(enterpriseId, dto.retryOf) : null
    if (dto.retryOf && (!previous || ![GenerationStatus.Failed, GenerationStatus.Unknown].includes(previous.status)))
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const snapshot = { sources: knowledge.map(item => ({ id: String(item!._id), title: item!.title, category: item!.category, body: item!.body })), topic: topic ? JSON.stringify({ title: topic.title, keywords: topic.keywords }) : '' }
    if (JSON.stringify(snapshot).length > 32000)
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const inputHash = createHash('sha256').update(JSON.stringify({ snapshot, retryOf: dto.retryOf || '' })).digest('hex')
    const id = randomBytes(12).toString('hex')
    const item = await this.repository.create({ ...dto, _id: id, taskId: previous?.taskId || id, retryOf: dto.retryOf || '', topicId: dto.topicId || '', enterpriseId, createdBy: userId, inputHash, snapshot })
    if (item.inputHash !== inputHash)
      throw new EnterpriseConflictException()
    if (String(item._id) === id)
      await this.access.audit(enterpriseId, userId, 'generation.queued', id)
    return item
  }

  async get(userId: string, enterpriseId: string, id: string) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator, EnterpriseRole.Reviewer])
    const item = await this.repository.get(enterpriseId, id)
    if (!item)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    if (item.status === GenerationStatus.Ready)
      await this.content.validateKnowledge(enterpriseId, item.knowledgeIds)
    return { ...item, draft: item.status === GenerationStatus.Ready && item.result
      ? {
          title: item.snapshot.sources.find(source => source.id === item.result!.titleSourceId)!.title.slice(0, 20),
          body: item.result.excerpts.map(excerpt => excerpt.text).join('\n\n'),
          layout: item.result.layout,
          missingCategories: ['price', 'case', 'brand'].filter(category => !item.snapshot.sources.some(source => source.category === category)),
        }
      : undefined }
  }

  async list(userId: string, enterpriseId: string, page: number, pageSize: number) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator, EnterpriseRole.Reviewer])
    return this.repository.list(enterpriseId, page, pageSize)
  }

  async reconcile(userId: string, enterpriseId: string, id: string, dto: ReconcileEnterpriseUsageDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Admin])
    const item = await this.repository.get(enterpriseId, id)
    if (!item?.result?.providerRequestId || ![GenerationStatus.Ready, GenerationStatus.Failed].includes(item.status))
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    if (item.costStatus === 'known') {
      if (item.cost === dto.cost && item.currency === dto.currency && item.reconciliationReference === dto.reference)
        return item
      throw new EnterpriseConflictException()
    }
    try {
      const updated = await this.repository.reconcile(enterpriseId, id, { costStatus: 'known', cost: dto.cost, currency: dto.currency, reconciliationReference: dto.reference, reconciliationKey: JSON.stringify([item.result.provider, item.result.providerRequestId]) })
      if (!updated)
        throw new EnterpriseConflictException()
      await this.access.audit(enterpriseId, userId, 'usage.reconciled', id)
      return updated
    }
    catch { throw new EnterpriseConflictException() }
  }

  @Interval(2000)
  async tick() {
    if (!this.options.enabled || this.active)
      return
    this.active = true
    try {
      await this.repository.expire()
      const item = await this.repository.claim()
      if (!item)
        return
      let result: EnterprisePlanResult | undefined
      let invoked = false
      try {
        await this.access.authorize(item.createdBy, item.enterpriseId, [EnterpriseRole.Operator])
        await this.content.validateKnowledge(item.enterpriseId, item.knowledgeIds)
        invoked = true
        result = EnterprisePlanResult.create(await this.ai.ai.planEnterprise(item.snapshot))
        validateEnterprisePlan(item.snapshot, result)
        await this.content.validateKnowledge(item.enterpriseId, item.knowledgeIds)
        await this.repository.finish(String(item._id), { status: GenerationStatus.Ready, result, settlement: 'settled' })
      }
      catch {
        // Never persist provider errors: they may contain credentials or source data.
        await this.repository.finish(String(item._id), { status: result ? GenerationStatus.Failed : invoked ? GenerationStatus.Unknown : GenerationStatus.Failed, result, settlement: result ? 'settled' : invoked ? 'unknown' : 'released', errorCode: result ? 'source_validation' : invoked ? 'provider_unconfirmed' : 'source_unavailable' })
      }
    }
    catch { this.logger.warn('Enterprise generation worker could not persist progress') }
    finally { this.active = false }
  }
}
