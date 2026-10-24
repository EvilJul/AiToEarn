import type { Enterprise, EnterpriseAuditEvent, EnterpriseConversation, EnterpriseExecutor, EnterpriseKnowledge, EnterpriseLead, EnterpriseMember, EnterpriseMessage, EnterpriseNotification, EnterprisePublishJob, EnterpriseResource, EnterpriseRevision, EnterpriseTopic, ImageAsset, MaterialPackage, ReplySuggestions } from './enterprise.types'
import type { RequestData } from '@/utils/request'
import http from '@/utils/request'

const base = 'enterprise-ops/enterprises'
export function getEnterprises() { return http.get<Enterprise[]>(base, undefined, true) }
export function createEnterprise(data: RequestData) { return http.post<Enterprise>(base, data) }
export function updateEnterprise(id: string, data: RequestData) { return http.patch<Enterprise>(`${base}/${id}/settings`, data) }
export function getEnterpriseKnowledge(id: string) { return http.get<EnterpriseKnowledge[]>(`${base}/${id}/knowledge`, { pageSize: 100 }, true) }
export function getEnterpriseTopics(id: string) { return http.get<EnterpriseTopic[]>(`${base}/${id}/topics`, { pageSize: 100 }, true) }
export function getEnterpriseRevisions(id: string) { return http.get<EnterpriseRevision[]>(`${base}/${id}/revisions`, { pageSize: 100 }, true) }
export function getEnterprisePublishJobs(id: string) { return http.get<EnterprisePublishJob[]>(`${base}/${id}/publish-jobs`, { pageSize: 100 }, true) }
export function getEnterpriseConversations(id: string) { return http.get<EnterpriseConversation[]>(`${base}/${id}/conversations`, { pageSize: 100 }, true) }
export function getEnterpriseMembers(id: string) { return http.get<EnterpriseMember[]>(`${base}/${id}/members`, undefined, true) }
export function getEnterpriseImageAssets(id: string) { return http.get<ImageAsset[]>(`${base}/${id}/image-assets`, undefined, true) }
export function createEnterpriseRecord(id: string, resource: 'knowledge' | 'topics' | 'revisions' | 'publish-jobs' | 'conversations' | 'members', data: RequestData) { return http.post(`${base}/${id}/${resource}`, data) }
export function runEnterpriseAction(id: string, path: string, data: RequestData) { return http.post(`${base}/${id}/${path}`, data) }
export function updateEnterpriseMember(id: string, memberId: string, data: RequestData) { return http.patch(`${base}/${id}/members/${memberId}`, data) }
export function getEnterpriseMaterialPackage(id: string, jobId: string) { return http.post<MaterialPackage>(`${base}/${id}/publish-jobs/${jobId}/material-package`, {}) }

export function getEnterpriseLeads(id: string) { return http.get<EnterpriseLead[]>(`${base}/${id}/leads`, { pageSize: 100 }, true) }
export function getEnterpriseNotifications(id: string) { return http.get<EnterpriseNotification[]>(`${base}/${id}/notifications`, { pageSize: 100 }, true) }
export function getEnterpriseReplySuggestions(id: string, conversationId: string) { return http.post<ReplySuggestions>(`${base}/${id}/conversations/${conversationId}/reply-suggestions`, {}) }

export function getEnterpriseExecutors(id: string) { return http.get<EnterpriseExecutor[]>(`${base}/${id}/executors`, undefined, true) }
export function getEnterpriseResources(id: string) { return http.get<EnterpriseResource[]>(`${base}/${id}/resources`, undefined, true) }

export function getEnterpriseMessages(id: string, conversationId: string) { return http.get<EnterpriseMessage[]>(`${base}/${id}/conversations/${conversationId}/messages`, undefined, true) }

export function getEnterpriseRevision(id: string, revisionId: string) { return http.get<EnterpriseRevision>(`${base}/${id}/revisions/${revisionId}`, undefined, true) }
export function getEnterpriseRevisionHistory(id: string, revisionId: string) { return http.get<EnterpriseAuditEvent[]>(`${base}/${id}/revisions/${revisionId}/history`, undefined, true) }

export function getEnterpriseImageSource(id: string, assetId: string) { return http.post<{ mimeType: string, base64: string }>(`${base}/${id}/image-assets/${assetId}/source`, {}) }

export function getEnterpriseKnowledgeVersion(id: string, knowledgeId: string) { return http.get<EnterpriseKnowledge>(`${base}/${id}/knowledge/${knowledgeId}`, undefined, true) }

export function createEnterpriseGeneration(id: string, data: RequestData) { return http.post<import('./enterprise.types').EnterpriseGeneration>(`${base}/${id}/generations`, data) }
export function getEnterpriseGeneration(id: string, generationId: string) { return http.get<import('./enterprise.types').EnterpriseGeneration>(`${base}/${id}/generations/${generationId}`, undefined, true) }
export function getEnterpriseUsage(id: string) { return http.get<import('./enterprise.types').EnterpriseGeneration[]>(`${base}/${id}/usage`, { pageSize: 100 }, true) }
