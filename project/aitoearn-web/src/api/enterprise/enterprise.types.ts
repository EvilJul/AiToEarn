export type EnterpriseRole = 'admin' | 'operator' | 'reviewer' | 'sales'
export interface Enterprise { id: string, name: string, industry: string, regions: string[], timezone: string, allowSelfReview: boolean, responseReminderMinutes: number, enabled: boolean, version: number, role: EnterpriseRole }
export interface EnterpriseRecord { id: string, version: number, createdBy: string, createdAt: string }
export interface EnterpriseKnowledge extends EnterpriseRecord { title: string, category: string, body: string, source: string, validUntil: string, status: 'draft' | 'approved' | 'withdrawn', approvedBy: string, revision: number, knowledgeId: string, supersedesId: string, evidenceAssetIds: string[] }
export interface EnterpriseTopic extends EnterpriseRecord { title: string, source: string, sourceType: string, industry: string, regions: string[], keywords: string[], occurredAt: string, expiresAt: string, feedback: string, recommended: boolean, expired: boolean, score: number, industryMatch: boolean, regionMatches: string[] }
export interface EnterpriseRevision extends EnterpriseRecord { contentId: string, parentRevisionId: string, revisionNumber: number, imageHashes: string[], title: string, body: string, topics: string[], knowledgeIds: string[], imageAssetIds: string[], contentHash: string, status: 'draft' | 'pending_review' | 'approved' | 'rejected', reviewReason: string, reviewedBy: string }
export interface EnterprisePublishJob extends EnterpriseRecord { revisionId: string, accountId: string, scheduledAt: string, mode: 'manual' | 'browser', overdue: boolean, status: string, workLink: string, verificationMethod: string, evidence: string }
export interface EnterpriseConversation extends EnterpriseRecord { channel: string, customerName: string, source: string, summary: string, state: string, ownerId: string, followUps: string[] }
export interface EnterpriseMember { id: string, userId: string, role: EnterpriseRole, active: boolean, version: number }
export interface ImageAsset { id: string, url: string, filename: string }
export interface MaterialPackage { revisionId: string, contentHash: string, title: string, body: string, topics: string[], files: { name: string, base64: string }[], review: { reviewedBy: string, reason: string } }
export type EnterpriseTab = 'overview' | 'knowledge' | 'topics' | 'content' | 'publishing' | 'service' | 'settings'

export interface EnterpriseLead extends EnterpriseRecord { conversationId: string, triggeringMessageId: string, intent: string, summary: string, ownerId: string, stage: string, nextFollowUpAt: string | null, followUps: string[] }
export interface EnterpriseNotification extends EnterpriseRecord { leadId: string, targetUserId: string, summary: string, kind: string, state: string }
export interface ReplySuggestions { mode: 'knowledge_excerpt', requiresHuman: true, suggestions: { knowledgeId: string, title: string, answer: string, source: string }[] }

export interface EnterpriseExecutor { id: string, deviceId: string, accountId: string, pluginVersion: string, lastHeartbeatAt: string, online: boolean, revoked: boolean, capabilities: string[] }
export interface EnterpriseResource { resourceId: string, kind: 'asset' | 'account', name: string, active: boolean }

export interface EnterpriseMessage extends EnterpriseRecord { conversationId: string, body: string, sourceType: string }

export interface EnterpriseAuditEvent { id: string, actorId: string, action: string, reason: string, createdAt: string }

export interface EnterpriseGeneration {
  id: string
  taskId: string
  retryOf: string
  createdAt: string
  status: 'queued' | 'running' | 'ready' | 'failed' | 'unknown'
  knowledgeIds: string[]
  topicId: string
  cost: number | null
  costStatus: string
  currency: string
  settlement: string
  errorCode: string
  draft?: { title: string, body: string, layout: string, missingCategories: string[] }
  result?: { model: string, provider: string, providerRequestId?: string, inputTokens?: number, outputTokens?: number }
}
