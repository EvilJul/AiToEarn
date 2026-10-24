import type { MaterialPackage } from '@/api/enterprise/enterprise.types'

/** 自动提交保持关闭，调用方不能改成开启。 */
export const ENTERPRISE_AUTO_SUBMIT = false as const

const approvalCapabilities = ['image_text', 'approval_gate', 'manual_confirmation']

export interface EnterpriseMediaFile {
  kind: 'file'
  name: string
  file: File
}

export interface EnterpriseMediaUrl {
  kind: 'url'
  name: string
  url: string
}

export interface EnterpriseExecutionPayload {
  autoSubmit: false
  contentHash: string
  title: string
  body: string
  topics: string[]
  media: Array<EnterpriseMediaFile | EnterpriseMediaUrl>
}

export type PluginProtocolSignal =
  | { type: 'progress', stage: 'download' | 'upload' | 'publish', progress: number }
  | { type: 'cancel' }
  | { type: 'error', code: string }
  | { type: 'plugin_success' }

export interface ProtocolMapping {
  action: 'renew-lease' | 'cancel' | 'events' | 'none'
  eventOutcome: 'failed' | 'unknown' | null
}

export interface ApprovalExecutor {
  id: string
  accountId: string
  online: boolean
  revoked: boolean
  capabilities: string[]
}

const serverStatuses = new Set(['scheduled', 'waiting_executor', 'awaiting_confirmation', 'submitting', 'submitted', 'published', 'unknown', 'failed', 'cancelled', 'blocked'])

/**
 * 把已审素材中的 File 与媒体 URL 编成执行负载。
 * 不抓取 URL，不把话题拼进成功状态；自动提交恒为关闭。
 */
export function buildEnterpriseExecutionPayload(input: {
  contentHash: string
  title: string
  body: string
  topics: string[]
  files?: File[]
  mediaUrls?: { name: string, url: string }[]
}): EnterpriseExecutionPayload {
  const topics = input.topics.map(topic => topic.trim()).filter(Boolean)
  const files = (input.files || []).map(file => ({ kind: 'file' as const, name: file.name, file }))
  const mediaUrls = (input.mediaUrls || []).map(item => ({ kind: 'url' as const, name: item.name, url: normalizeMediaUrl(item.url) }))
  if (!files.length && !mediaUrls.length)
    throw new Error('approved media is required')
  return { autoSubmit: ENTERPRISE_AUTO_SUBMIT, contentHash: input.contentHash, title: input.title, body: input.body, topics, media: [...files, ...mediaUrls] }
}

/**
 * 把素材包里的 base64 图片还原为 File，供协议样本和插件准备使用。
 * 不访问网络，也不写入旧发布队列。
 */
export function fileFromApprovedPackage(file: { name: string, base64: string }) {
  const binary = atob(file.base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index)
  const type = file.name.endsWith('.png') ? 'image/png' : file.name.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
  return new File([bytes], file.name, { type })
}

/**
 * 决定浏览器准备是否可用。
 * 原插件未声明审核许可时返回 false，调用方只能走人工路径。
 */
export function canPrepareBrowserExecution(input: { supportsApprovalProtocol: boolean, jobMode: string, accountId: string, executor: ApprovalExecutor | null }) {
  if (!input.supportsApprovalProtocol || input.jobMode !== 'browser' || !input.executor)
    return false
  if (!input.executor.online || input.executor.revoked || input.executor.accountId !== input.accountId)
    return false
  return approvalCapabilities.every(capability => input.executor?.capabilities.includes(capability))
}

/**
 * 创建任务时的执行方式。
 * 未声明审核协议时忽略浏览器选项，避免把人工任务送进自动执行。
 */
export function resolvePublishJobMode(supportsApprovalProtocol: boolean, requested?: string) {
  return supportsApprovalProtocol && requested === 'browser' ? 'browser' : 'manual'
}

/**
 * 把插件进度、取消、错误和自报成功映射到服务端动作。
 * 不会产生 authorize-submit，也不会把自报成功写成 submitted。
 */
export function mapPluginSignal(signal: PluginProtocolSignal, serverStatus: string | null | undefined): ProtocolMapping {
  const status = normalizeServerStatus(serverStatus)
  if (status === 'published' || status === 'cancelled')
    return { action: 'none', eventOutcome: null }
  if (signal.type === 'progress')
    return { action: 'renew-lease', eventOutcome: null }
  if (signal.type === 'cancel')
    return { action: 'cancel', eventOutcome: null }
  if (signal.type === 'error')
    return status === 'submitting' ? { action: 'events', eventOutcome: 'failed' } : { action: 'none', eventOutcome: null }
  if (status === 'submitting')
    return { action: 'events', eventOutcome: 'unknown' }
  return { action: 'none', eventOutcome: null }
}

/**
 * 用服务端状态决定页面展示。
 * 只有服务端已是 published 才显示成功；未知、提交中或待确认都不能被插件回调提升为成功。
 */
export function displayFromServer(serverStatus: string | null | undefined, signal: PluginProtocolSignal) {
  const status = normalizeServerStatus(serverStatus)
  if (status === 'published')
    return 'published'
  if (signal.type === 'progress')
    return status === 'unknown' ? 'unknown' : 'in_progress'
  if (signal.type === 'plugin_success')
    return status
  if (signal.type === 'error')
    return status === 'failed' || status === 'unknown' ? status : status === 'submitting' ? 'submitting' : 'unknown'
  return status
}

/**
 * 回放协议样本，核对媒体、话题和每一步展示状态。
 * 样本结果只用于约束映射，不代表真实小红书发布。
 */
export function replayProtocolSample(input: {
  contentHash: string
  title: string
  body: string
  topics: string[]
  files: File[]
  mediaUrls: { name: string, url: string }[]
  steps: { signal: PluginProtocolSignal, serverStatus: string }[]
}) {
  const payload = buildEnterpriseExecutionPayload(input)
  return {
    payload,
    autoSubmit: payload.autoSubmit,
    steps: input.steps.map(step => ({
      signal: step.signal.type,
      serverStatus: step.serverStatus,
      displayed: displayFromServer(step.serverStatus, step.signal),
      ...mapPluginSignal(step.signal, step.serverStatus),
    })),
  }
}

export interface ApprovedPublishConnection {
  path: 'manual' | 'prepared'
  calls: string[]
  displayed: string
  progress: number | null
  leaseExpiresAt: string | null
  autoSubmit: false
}

/**
 * 连接已实现的领取、续租和进度回执。
 * 不调用旧渠道发布队列，也不调用提交许可。
 */
export async function connectApprovedPublishJob(input: {
  supportsApprovalProtocol: boolean
  job: { id: string, mode: string, status: string, accountId: string, version: number }
  executor: ApprovalExecutor | null
  mediaUrls?: { name: string, url: string }[]
  claim: (executorId: string) => Promise<{ attemptId: string, leaseToken: string, expiresAt: string, payload: MaterialPackage }>
  renew: (lease: { executorId: string, attemptId: string, leaseToken: string }) => Promise<{ expiresAt: string }>
  cancel: () => Promise<void>
  reportEvent: (outcome: 'failed' | 'unknown', lease: { executorId: string, attemptId: string, leaseToken: string }) => Promise<string>
  readServerStatus: () => Promise<string>
  execute: (payload: EnterpriseExecutionPayload, emit: (signal: PluginProtocolSignal) => void) => Promise<PluginProtocolSignal | undefined>
  onSignal?: (signal: PluginProtocolSignal) => void
}): Promise<ApprovedPublishConnection> {
  const manual: ApprovedPublishConnection = { path: 'manual', calls: [], displayed: normalizeServerStatus(input.job.status), progress: null, leaseExpiresAt: null, autoSubmit: false }
  if (!canPrepareBrowserExecution({ supportsApprovalProtocol: input.supportsApprovalProtocol, jobMode: input.job.mode, accountId: input.job.accountId, executor: input.executor }) || !input.executor)
    return manual
  const calls = ['claim']
  const claimed = await input.claim(input.executor.id)
  const payload = buildEnterpriseExecutionPayload({
    contentHash: claimed.payload.contentHash,
    title: claimed.payload.title,
    body: claimed.payload.body,
    topics: claimed.payload.topics,
    files: claimed.payload.files.map(file => fileFromApprovedPackage(file)),
    mediaUrls: input.mediaUrls,
  })
  let progress: number | null = null
  let last: PluginProtocolSignal = { type: 'progress', stage: 'publish', progress: 0 }
  calls.push('execute')
  try {
    const returned = await input.execute(payload, (signal) => {
      last = signal
      if (signal.type === 'progress')
        progress = signal.progress
      input.onSignal?.(signal)
    })
    if (returned)
      last = returned
  }
  catch (error) {
    last = { type: 'error', code: error instanceof Error ? error.message : 'execute_failed' }
  }
  let leaseExpiresAt = claimed.expiresAt
  if (last.type === 'cancel') {
    calls.push('cancel')
    await input.cancel()
  }
  else if (last.type !== 'error') {
    calls.push('renew-lease')
    leaseExpiresAt = (await input.renew({ executorId: input.executor.id, attemptId: claimed.attemptId, leaseToken: claimed.leaseToken })).expiresAt
  }
  let serverStatus = await input.readServerStatus()
  const mapped = mapPluginSignal(last, serverStatus)
  if (mapped.action === 'events' && mapped.eventOutcome) {
    calls.push('events')
    serverStatus = await input.reportEvent(mapped.eventOutcome, { executorId: input.executor.id, attemptId: claimed.attemptId, leaseToken: claimed.leaseToken })
  }
  const displayed = displayFromServer(serverStatus, last)
  if (displayed === 'published' && serverStatus !== 'published')
    throw new Error('refusing to display success without server publication')
  return { path: 'prepared', calls, displayed, progress, leaseExpiresAt, autoSubmit: false }
}

/**
 * 解释插件 executeApprovedTask 的返回值。
 * success 只表示插件回调，不表示服务端已发布。
 */
export function interpretExecuteResult(result: unknown): PluginProtocolSignal | undefined {
  if (result == null)
    return undefined
  if (typeof result !== 'object')
    return { type: 'plugin_success' }
  const record = result as Record<string, unknown>
  if (record.cancelled === true || record.type === 'cancel')
    return { type: 'cancel' }
  if (typeof record.error === 'string')
    return { type: 'error', code: record.error }
  if (record.type === 'error' && typeof record.code === 'string')
    return { type: 'error', code: record.code }
  if (record.type === 'progress' && (record.stage === 'download' || record.stage === 'upload' || record.stage === 'publish') && typeof record.progress === 'number')
    return { type: 'progress', stage: record.stage, progress: record.progress }
  return { type: 'plugin_success' }
}

/** 只接受 http/https 媒体地址，拒绝把任意 URL 当成已发布证据。 */
function normalizeMediaUrl(url: string) {
  const parsed = new URL(url)
  if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.username || parsed.password)
    throw new Error('unsupported media url')
  return parsed.toString()
}

/** 无法识别的服务端状态按未知处理，避免页面自行补成成功。 */
function normalizeServerStatus(status: string | null | undefined) {
  return status && serverStatuses.has(status) ? status : 'unknown'
}
