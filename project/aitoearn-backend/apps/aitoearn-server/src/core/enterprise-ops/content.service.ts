import type { Asset } from '@yikart/mongodb'
import { createHash, randomBytes } from 'node:crypto'
import { Injectable, Optional } from '@nestjs/common'
import { StorageProvider } from '@yikart/assets'
import { AppException, ResponseCode } from '@yikart/common'
import { AssetRepository, AssetStatus } from '@yikart/mongodb'
import { REDNOTE_METADATA } from '../channels/platforms/rednote/rednote.constants'
import { EnterpriseConflictException } from './enterprise-conflict.exception'
import { getEnterpriseImageExtension } from './enterprise-media'
import { EnterprisePaginationDto } from './enterprise.dto'
import { ContentReviewStatus, EnterpriseResourceKind, EnterpriseRole, KnowledgeStatus } from './enterprise.enums'
import { EnterpriseService } from './enterprise.service'
import { EnterpriseGenerationRepository } from './generation.repository'
import { GenerationStatus } from './generation.schema'
import { CreateKnowledgeDto, CreateRevisionDto, CreateTopicDto, ReviewRevisionDto, TopicFeedbackDto, VersionActionDto } from './operations.dto'
import { EnterpriseOperationsRepository } from './operations.repository'
import { ContentRevision } from './operations.schema'
import { EnterpriseResourcesService } from './resources.service'

export function hashContent(content: Pick<ContentRevision, 'title' | 'body' | 'topics' | 'imageAssetIds' | 'imageHashes'>) {
  return createHash('sha256').update(JSON.stringify({ title: content.title, body: content.body, topics: content.topics, images: content.imageAssetIds.map((id, i) => ({ id, hash: content.imageHashes[i] })) })).digest('hex')
}

@Injectable()
export class EnterpriseContentService {
  constructor(
    private readonly access: EnterpriseService,
    private readonly repository: EnterpriseOperationsRepository,
    private readonly assets: AssetRepository,
    private readonly storage: StorageProvider,
    private readonly resources: EnterpriseResourcesService,
    @Optional() private readonly generations?: EnterpriseGenerationRepository,
  ) {}

  async listImageAssets(userId: string, enterpriseId: string) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator, EnterpriseRole.Reviewer])
    const result = await this.assets.listWithPagination({ userId, page: 1, pageSize: 100, status: AssetStatus.Confirmed })
    const shared = await this.resources.listAuthorizedAssets(userId, enterpriseId)
    const images = [...new Map([...result.list, ...shared].map(asset => [asset.id, asset])).values()]
    return Promise.all(images.filter(asset => getEnterpriseImageExtension(asset.mimeType)).map(async asset => ({ id: asset.id, filename: asset.filename || asset.id, url: await this.storage.getReadSignUrl(asset.path, 300) })))
  }

  async listKnowledge(userId: string, enterpriseId: string, query: EnterprisePaginationDto) {
    const { role } = await this.access.authorize(userId, enterpriseId)
    return this.repository.listByKnowledgeVersionEnterpriseIdWithPagination(enterpriseId, query.page, query.pageSize, role === EnterpriseRole.Sales)
  }

  async getKnowledge(userId: string, enterpriseId: string, id: string) {
    const { role } = await this.access.authorize(userId, enterpriseId)
    const knowledge = await this.repository.getByKnowledgeVersionIdAndEnterpriseId(id, enterpriseId)
    if (!knowledge)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    if (role === EnterpriseRole.Sales)
      await this.validateKnowledge(enterpriseId, [id])
    return knowledge
  }

  async createKnowledge(userId: string, enterpriseId: string, dto: CreateKnowledgeDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator, EnterpriseRole.Reviewer])
    if (dto.validUntil <= new Date())
      throw new AppException(ResponseCode.EnterpriseKnowledgeInvalid)
    const parent = dto.supersedesId ? await this.repository.getByKnowledgeVersionIdAndEnterpriseId(dto.supersedesId, enterpriseId) : null
    if (dto.supersedesId && !parent)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    const evidenceAssetIds = dto.evidenceAssetIds || []
    for (const assetId of evidenceAssetIds)
      await this.resources.authorizeResource(userId, enterpriseId, EnterpriseResourceKind.Asset, assetId)
    const evidenceHashes = await this.hashImages(evidenceAssetIds, enterpriseId)
    const id = randomBytes(12).toString('hex')
    const knowledge = await this.repository.createKnowledgeVersion({ ...dto, _id: id, knowledgeId: parent?.knowledgeId || id, revision: (parent?.revision || 0) + 1, evidenceHashes, enterpriseId, createdBy: userId })
    if (!knowledge)
      throw new EnterpriseConflictException()
    await this.access.audit(enterpriseId, userId, 'knowledge.created', String(knowledge._id))
    return knowledge
  }

  async reviewKnowledge(userId: string, enterpriseId: string, id: string, action: 'approve' | 'withdraw', dto: VersionActionDto) {
    const { enterprise } = await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Reviewer])
    const knowledge = await this.repository.getByKnowledgeVersionIdAndEnterpriseId(id, enterpriseId)
    if (!knowledge || (action === 'approve' && (knowledge.status !== KnowledgeStatus.Draft || knowledge.validUntil <= new Date())))
      throw new AppException(ResponseCode.EnterpriseKnowledgeInvalid)
    if (action === 'approve' && knowledge.createdBy === userId && !enterprise.allowSelfReview)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    if (action === 'approve') {
      if (await this.repository.getByKnowledgeIdAndRevision(enterpriseId, knowledge.knowledgeId, knowledge.revision))
        throw new AppException(ResponseCode.EnterpriseKnowledgeInvalid)
      const hashes = await this.hashImages(knowledge.evidenceAssetIds, enterpriseId)
      if (JSON.stringify(hashes) !== JSON.stringify(knowledge.evidenceHashes))
        throw new AppException(ResponseCode.EnterpriseKnowledgeInvalid)
    }
    const updated = await this.repository.updateByKnowledgeVersionIdAndEnterpriseIdAndVersion(id, enterpriseId, dto.expectedVersion, { status: action === 'approve' ? KnowledgeStatus.Approved : KnowledgeStatus.Withdrawn, approvedBy: action === 'approve' ? userId : knowledge.approvedBy })
    if (!updated)
      throw new EnterpriseConflictException()
    if (action === 'approve') {
      const older = await this.repository.listByKnowledgeIdBeforeRevision(enterpriseId, knowledge.knowledgeId, knowledge.revision)
      await this.repository.updateByKnowledgeIdAndRevision(enterpriseId, knowledge.knowledgeId, knowledge.revision)
      for (const previous of older)
        await this.repository.updateByPublishKnowledgeId(enterpriseId, String(previous._id))
    }
    else {
      await this.repository.updateByPublishKnowledgeId(enterpriseId, id)
    }
    await this.access.audit(enterpriseId, userId, `knowledge.${action}`, id, dto.reason)
    return updated
  }

  async listTopics(userId: string, enterpriseId: string, query: EnterprisePaginationDto) {
    const { enterprise } = await this.access.authorize(userId, enterpriseId)
    const candidates = await this.repository.listByTopicCandidateEnterpriseIdWithPagination(enterpriseId, query.page, query.pageSize)
    return candidates.map((topic) => {
      const industryMatch = topic.industry === enterprise.industry
      const regionMatches = topic.regions.filter(region => enterprise.regions.includes(region))
      const expired = topic.expiresAt <= new Date()
      return { ...topic, industryMatch, regionMatches, expired, recommended: !expired && industryMatch && regionMatches.length > 0, score: expired ? 0 : Number(industryMatch) * 60 + Number(regionMatches.length > 0) * 40 }
    }).sort((a, b) => b.score - a.score)
  }

  async createTopic(userId: string, enterpriseId: string, dto: CreateTopicDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator])
    if (dto.expiresAt <= dto.occurredAt)
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const topic = await this.repository.createTopicCandidate({ ...dto, enterpriseId, createdBy: userId })
    await this.access.audit(enterpriseId, userId, 'topic.created', String(topic._id))
    return topic
  }

  async feedback(userId: string, enterpriseId: string, id: string, dto: TopicFeedbackDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator])
    const updated = await this.repository.updateByTopicCandidateIdAndEnterpriseIdAndVersion(id, enterpriseId, dto.expectedVersion, { feedback: dto.feedback, feedbackReason: dto.reason })
    if (!updated)
      throw new EnterpriseConflictException()
    await this.access.audit(enterpriseId, userId, `topic.${dto.feedback}`, id, dto.reason)
    return updated
  }

  async listRevisions(userId: string, enterpriseId: string, query: EnterprisePaginationDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator, EnterpriseRole.Reviewer])
    return this.repository.listByContentRevisionEnterpriseIdWithPagination(enterpriseId, query.page, query.pageSize)
  }

  async getRevision(userId: string, enterpriseId: string, id: string) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator, EnterpriseRole.Reviewer])
    const revision = await this.repository.getByContentRevisionIdAndEnterpriseId(id, enterpriseId)
    if (!revision)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    return revision
  }

  async history(userId: string, enterpriseId: string, id: string) {
    await this.getRevision(userId, enterpriseId, id)
    return this.access.resourceAudit(userId, enterpriseId, id)
  }

  async createRevision(userId: string, enterpriseId: string, dto: CreateRevisionDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator])
    await this.validateKnowledge(enterpriseId, dto.knowledgeIds)
    if (dto.generationId) {
      const generation = await this.generations?.get(enterpriseId, dto.generationId)
      if (!generation || generation.status !== GenerationStatus.Ready || generation.knowledgeIds.some(id => !dto.knowledgeIds.includes(id)))
        throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    }
    let parentContentId: string | undefined
    let parentRevisionNumber = 0
    let parentTopicId = ''
    if (dto.sourceRevisionId) {
      const parent = await this.repository.getByContentRevisionIdAndEnterpriseId(dto.sourceRevisionId, enterpriseId)
      if (!parent)
        throw new AppException(ResponseCode.EnterpriseAccessDenied)
      parentContentId = parent.contentId
      parentRevisionNumber = parent.revisionNumber
      parentTopicId = parent.topicId
    }
    const topicId = dto.topicId || parentTopicId
    const topic = topicId ? await this.repository.getByTopicCandidateIdAndEnterpriseId(topicId, enterpriseId) : null
    if (topicId && !topic)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    for (const id of dto.imageAssetIds)
      await this.resources.authorizeResource(userId, enterpriseId, EnterpriseResourceKind.Asset, id)
    const imageHashes = await this.hashImages(dto.imageAssetIds, enterpriseId)
    const revisionId = randomBytes(12).toString('hex')
    const content = { ...dto, _id: revisionId, imageHashes, contentHash: hashContent({ ...dto, imageHashes }), enterpriseId, createdBy: userId, contentId: parentContentId || revisionId, parentRevisionId: dto.sourceRevisionId || '', revisionNumber: parentRevisionNumber + 1, topicId, topicSnapshot: topic ? JSON.stringify({ id: String(topic._id), title: topic.title, source: topic.source, keywords: topic.keywords }) : '' }
    const revision = await this.repository.createContentRevision(content)
    if (!revision)
      throw new EnterpriseConflictException()
    await this.access.audit(enterpriseId, userId, 'content.created', String(revision._id))
    return revision
  }

  async submitReview(userId: string, enterpriseId: string, id: string, dto: VersionActionDto) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator])
    const revision = await this.repository.getByContentRevisionIdAndEnterpriseId(id, enterpriseId)
    if (!revision || ![ContentReviewStatus.Draft, ContentReviewStatus.Rejected].includes(revision.status))
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    await this.validateKnowledge(enterpriseId, revision.knowledgeIds)
    const hashes = await this.hashImages(revision.imageAssetIds, enterpriseId)
    if (hashContent({ ...revision, imageHashes: hashes }) !== revision.contentHash)
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const updated = await this.repository.updateByContentRevisionIdAndEnterpriseIdAndVersion(id, enterpriseId, dto.expectedVersion, { status: ContentReviewStatus.Pending })
    if (!updated)
      throw new EnterpriseConflictException()
    await this.access.audit(enterpriseId, userId, 'content.submitted', id)
    return updated
  }

  async review(userId: string, enterpriseId: string, id: string, dto: ReviewRevisionDto) {
    const { enterprise } = await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Reviewer])
    const revision = await this.repository.getByContentRevisionIdAndEnterpriseId(id, enterpriseId)
    if (!revision || revision.status !== ContentReviewStatus.Pending)
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    if (revision.createdBy === userId && !enterprise.allowSelfReview)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    if (dto.decision === 'rejected' && !dto.reason.trim())
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    await this.validateKnowledge(enterpriseId, revision.knowledgeIds)
    const hashes = await this.hashImages(revision.imageAssetIds, enterpriseId)
    if (hashContent({ ...revision, imageHashes: hashes }) !== revision.contentHash)
      throw new AppException(ResponseCode.EnterpriseInvalidOperation)
    const updated = await this.repository.updateByContentRevisionIdAndEnterpriseIdAndVersion(id, enterpriseId, dto.expectedVersion, { status: dto.decision === 'approved' ? ContentReviewStatus.Approved : ContentReviewStatus.Rejected, reviewedBy: userId, reviewReason: dto.reason })
    if (!updated)
      throw new EnterpriseConflictException()
    await this.access.audit(enterpriseId, userId, `content.${dto.decision}`, id, dto.reason)
    return updated
  }

  async validateKnowledge(enterpriseId: string, ids: string[]) {
    if (!ids.length)
      throw new AppException(ResponseCode.EnterpriseKnowledgeInvalid)
    for (const id of ids) {
      const knowledge = await this.repository.getByKnowledgeVersionIdAndEnterpriseId(id, enterpriseId)
      if (!knowledge || knowledge.status !== KnowledgeStatus.Approved || knowledge.validUntil <= new Date())
        throw new AppException(ResponseCode.EnterpriseKnowledgeInvalid)
      if (await this.repository.getByKnowledgeIdAndRevision(enterpriseId, knowledge.knowledgeId, knowledge.revision))
        throw new AppException(ResponseCode.EnterpriseKnowledgeInvalid)
    }
  }

  async approvedRevision(enterpriseId: string, id: string) {
    const revision = await this.repository.getByContentRevisionIdAndEnterpriseId(id, enterpriseId)
    if (!revision || revision.status !== ContentReviewStatus.Approved)
      throw new AppException(ResponseCode.EnterpriseContentNotApproved)
    await this.validateKnowledge(enterpriseId, revision.knowledgeIds)
    const hashes = await this.hashImages(revision.imageAssetIds, enterpriseId)
    if (hashContent({ ...revision, imageHashes: hashes }) !== revision.contentHash)
      throw new AppException(ResponseCode.EnterpriseContentNotApproved)
    return revision
  }

  async readBoundImage(enterpriseId: string, id: string) {
    const binding = await this.resources.requireBinding(enterpriseId, EnterpriseResourceKind.Asset, id)
    return this.readImageAsset(await this.assets.getByIdAndUserId(id, binding.ownerUserId))
  }

  private async readImageAsset(asset: Asset | null) {
    if (!asset || asset.status !== AssetStatus.Confirmed)
      throw new AppException(ResponseCode.EnterpriseAccessDenied)
    if (!getEnterpriseImageExtension(asset.mimeType))
      throw new AppException(ResponseCode.ChannelPlatformMediaUnsupported)
    if (!asset.size || asset.size > REDNOTE_METADATA.mediaRules.maxImageSize)
      throw new AppException(ResponseCode.AssetTooLarge)
    const { buffer } = await this.storage.getObject(asset.path)
    if (!buffer || buffer.length > REDNOTE_METADATA.mediaRules.maxImageSize)
      throw new AppException(ResponseCode.AssetTooLarge)
    return { asset, buffer, hash: createHash('sha256').update(buffer).digest('hex') }
  }

  async imageSource(userId: string, enterpriseId: string, id: string) {
    await this.access.authorize(userId, enterpriseId, [EnterpriseRole.Operator, EnterpriseRole.Reviewer])
    const personal = await this.assets.getByIdAndUserId(id, userId)
    const { asset, buffer } = personal ? await this.readImageAsset(personal) : await this.readBoundImage(enterpriseId, id)
    await this.access.audit(enterpriseId, userId, 'resource.asset.source-read', id)
    return { mimeType: asset.mimeType, base64: buffer.toString('base64') }
  }

  async hashImages(ids: string[], enterpriseId: string) {
    const hashes: string[] = []
    let totalSize = 0
    for (const id of ids) {
      const { buffer, hash } = await this.readBoundImage(enterpriseId, id)
      totalSize += buffer.length
      if (totalSize > 50 * 1024 * 1024)
        throw new AppException(ResponseCode.AssetTooLarge)
      hashes.push(hash)
    }
    return hashes
  }
}
