import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./enterprise.repository', () => ({ EnterpriseRepository: class {} }))
vi.mock('./notifications.service', () => ({ EnterpriseNotificationsService: class {} }))
vi.mock('./resources.service', () => ({ EnterpriseResourcesService: class {} }))
vi.mock('./operations.repository', () => ({ EnterpriseOperationsRepository: class {} }))
vi.mock('@yikart/mongodb', () => ({ UserRepository: class {}, AccountRepository: class {}, AssetRepository: class {}, AssetStatus: { Confirmed: 'confirmed' } }))
vi.mock('@yikart/assets', () => ({ StorageProvider: class {} }))

const { EnterpriseService } = await import('./enterprise.service')
const { EnterpriseRole, ContentReviewStatus, KnowledgeStatus } = await import('./enterprise.enums')
const { EnterpriseContentService, hashContent } = await import('./content.service')
const { validateRednoteLink } = await import('./publishing.service')
const { EnterpriseConversationsService } = await import('./conversations.service')

describe('enterprise authorization', () => {
  const enterprise = { _id: 'a'.repeat(24), ownerUserId: 'owner', enabled: true, allowSelfReview: false }
  const repository = { getById: vi.fn(), getByEnterpriseIdAndUserId: vi.fn(), createAudit: vi.fn(), updateByIdAndVersion: vi.fn() }
  const service = new EnterpriseService(repository as unknown as ConstructorParameters<typeof EnterpriseService>[0], {} as ConstructorParameters<typeof EnterpriseService>[1], { enabled: true })

  beforeEach(() => {
    vi.clearAllMocks()
    repository.getById.mockResolvedValue(enterprise)
  })

  it('denies a non-member rather than trusting the requested enterprise ID', async () => {
    repository.getByEnterpriseIdAndUserId.mockResolvedValue(null)
    await expect(service.authorize('outsider', String(enterprise._id))).rejects.toMatchObject({ code: 19101 })
  })

  it('denies reviewer actions to sales members', async () => {
    repository.getByEnterpriseIdAndUserId.mockResolvedValue({ role: EnterpriseRole.Sales })
    await expect(service.authorize('sales', String(enterprise._id), [EnterpriseRole.Reviewer])).rejects.toMatchObject({ code: 19101 })
  })

  it('retains an owner administrator independently of mutable memberships', async () => {
    await expect(service.authorize('owner', String(enterprise._id), [EnterpriseRole.Reviewer])).resolves.toMatchObject({ role: EnterpriseRole.Admin })
    expect(repository.getByEnterpriseIdAndUserId).not.toHaveBeenCalled()
  })

  it('blocks disabled enterprise access but permits administrator reactivation', async () => {
    repository.getById.mockResolvedValue({ ...enterprise, enabled: false })
    await expect(service.authorize('owner', String(enterprise._id))).rejects.toMatchObject({ code: 19100 })
    await expect(service.authorize('owner', String(enterprise._id), [EnterpriseRole.Admin], true)).resolves.toBeDefined()
  })
})

describe('content facts and review boundaries', () => {
  const repository = { getByContentRevisionIdAndEnterpriseId: vi.fn(), getByKnowledgeVersionIdAndEnterpriseId: vi.fn(), updateByContentRevisionIdAndEnterpriseIdAndVersion: vi.fn() }
  const access = { authorize: vi.fn(), audit: vi.fn() }
  const service = new EnterpriseContentService(access as unknown as ConstructorParameters<typeof EnterpriseContentService>[0], repository as unknown as ConstructorParameters<typeof EnterpriseContentService>[1], {} as ConstructorParameters<typeof EnterpriseContentService>[2], {} as ConstructorParameters<typeof EnterpriseContentService>[3], {} as ConstructorParameters<typeof EnterpriseContentService>[4])

  beforeEach(() => {
    vi.clearAllMocks()
    access.authorize.mockResolvedValue({ enterprise: { allowSelfReview: false }, role: EnterpriseRole.Reviewer })
  })

  it('rejects another enterprise knowledge reference', async () => {
    repository.getByKnowledgeVersionIdAndEnterpriseId.mockResolvedValue(null)
    await expect(service.validateKnowledge('enterprise-a', ['knowledge-b'])).rejects.toMatchObject({ code: 19104 })
    expect(repository.getByKnowledgeVersionIdAndEnterpriseId).toHaveBeenCalledWith('knowledge-b', 'enterprise-a')
  })

  it('rejects an expired approved knowledge version', async () => {
    repository.getByKnowledgeVersionIdAndEnterpriseId.mockResolvedValue({ status: KnowledgeStatus.Approved, validUntil: new Date(0) })
    await expect(service.validateKnowledge('a', ['k'])).rejects.toMatchObject({ code: 19104 })
  })

  it('blocks direct publication of an unapproved revision', async () => {
    repository.getByContentRevisionIdAndEnterpriseId.mockResolvedValue({ status: ContentReviewStatus.Pending })
    await expect(service.approvedRevision('a', 'draft')).rejects.toMatchObject({ code: 19105 })
  })

  it('rejects self approval before mutating a pending revision', async () => {
    repository.getByContentRevisionIdAndEnterpriseId.mockResolvedValue({ status: ContentReviewStatus.Pending, createdBy: 'author' })
    await expect(service.review('author', 'a', 'r', { expectedVersion: 0, decision: 'approved', reason: '' })).rejects.toMatchObject({ code: 19101 })
    expect(repository.updateByContentRevisionIdAndEnterpriseIdAndVersion).not.toHaveBeenCalled()
  })

  it('binds the hash to image bytes, order, body and topics', () => {
    const original = { title: '标题', body: '正文', topics: ['服务'], imageAssetIds: ['a', 'b'], imageHashes: ['digest-a', 'digest-b'] }
    const digest = hashContent(original)
    for (const update of [{ body: '修改' }, { imageHashes: ['replaced', 'digest-b'] }, { imageAssetIds: ['b', 'a'], imageHashes: ['digest-b', 'digest-a'] }, { topics: ['其他'] }])
      expect(hashContent({ ...original, ...update })).not.toBe(digest)
  })
})

describe('manual publication URLs', () => {
  it('accepts a canonical HTTPS note without fetching it', () => {
    expect(validateRednoteLink(`https://www.xiaohongshu.com/explore/${'a'.repeat(24)}`)).toContain('/explore/')
  })

  it.each(['http://www.xiaohongshu.com/explore/aaaaaaaaaaaaaaaaaaaaaaaa', 'https://www.xiaohongshu.com.evil.example/explore/aaaaaaaaaaaaaaaaaaaaaaaa', 'https://user@www.xiaohongshu.com/explore/aaaaaaaaaaaaaaaaaaaaaaaa', 'https://127.0.0.1/', 'https://www.xiaohongshu.com/user/profile/aaaaaaaaaaaaaaaaaaaaaaaa'])('rejects non-note or unsafe URL %s', (url) => {
    expect(() => validateRednoteLink(url)).toThrow()
  })
})

describe('manual handoff concurrency', () => {
  it('does not allow a second sales member to take an owned conversation', async () => {
    const repository = { getByEnterpriseConversationIdAndEnterpriseId: vi.fn().mockResolvedValue({ state: 'human', ownerId: 'sales-a' }), updateByEnterpriseConversationIdAndEnterpriseIdAndVersion: vi.fn() }
    const access = { authorize: vi.fn().mockResolvedValue({ role: EnterpriseRole.Sales }), audit: vi.fn() }
    const service = new EnterpriseConversationsService(access as unknown as ConstructorParameters<typeof EnterpriseConversationsService>[0], repository as unknown as ConstructorParameters<typeof EnterpriseConversationsService>[1])
    await expect(service.action('sales-b', 'a', 'c', { action: 'claim', expectedVersion: 0, note: '' })).rejects.toMatchObject({ code: 19102 })
    expect(repository.updateByEnterpriseConversationIdAndEnterpriseIdAndVersion).not.toHaveBeenCalled()
  })
})
