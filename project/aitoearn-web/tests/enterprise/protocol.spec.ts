import { expect, test } from '@playwright/test'
import { buildEnterpriseExecutionPayload, canPrepareBrowserExecution, connectApprovedPublishJob, displayFromServer, fileFromApprovedPackage, replayProtocolSample, resolvePublishJobMode } from '../../src/store/plugin/enterpriseExecution'

const executor = { id: 'eeeeeeeeeeeeeeeeeeeeeeee', accountId: 'account', online: true, revoked: false, capabilities: ['image_text', 'approval_gate', 'manual_confirmation'] }
const job = { id: 'job', mode: 'browser', status: 'waiting_executor', accountId: 'account', version: 1 }
const packagePayload = { revisionId: 'rev', contentHash: 'hash', title: '标题', body: '正文', topics: ['企业运营'], files: [{ name: 'note.png', base64: 'aGk=' }], review: { reviewedBy: 'reviewer', reason: '' } }

test('protocol sample keeps file, media url and topics separate from success', async () => {
  const file = new File([Uint8Array.from([104, 105])], 'note.png', { type: 'image/png' })
  const sample = replayProtocolSample({
    contentHash: 'hash',
    title: '标题',
    body: '正文',
    topics: [' 企业运营 ', ''],
    files: [file],
    mediaUrls: [{ name: 'remote.png', url: 'https://cdn.example.com/remote.png' }],
    steps: [
      { signal: { type: 'progress', stage: 'upload', progress: 40 }, serverStatus: 'submitting' },
      { signal: { type: 'cancel' }, serverStatus: 'awaiting_confirmation' },
      { signal: { type: 'error', code: 'upload_failed' }, serverStatus: 'submitting' },
      { signal: { type: 'plugin_success' }, serverStatus: 'unknown' },
      { signal: { type: 'plugin_success' }, serverStatus: 'submitted' },
      { signal: { type: 'plugin_success' }, serverStatus: 'published' },
      { signal: { type: 'plugin_success' }, serverStatus: 'awaiting_confirmation' },
      { signal: { type: 'plugin_success' }, serverStatus: 'submitting' },
      { signal: { type: 'plugin_success' }, serverStatus: 'not-a-status' },
    ],
  })
  expect(sample.autoSubmit).toBe(false)
  expect(sample.payload.title).toBe('标题')
  expect(sample.payload.body).toBe('正文')
  expect(sample.payload.topics).toEqual(['企业运营'])
  expect(sample.payload.media.map(item => item.kind)).toEqual(['file', 'url'])
  expect(sample.payload.media[0]).toMatchObject({ name: 'note.png' })
  expect(sample.payload.media[1]).toMatchObject({ name: 'remote.png', url: 'https://cdn.example.com/remote.png' })
  expect(sample.steps[0]).toMatchObject({ displayed: 'in_progress', action: 'renew-lease', eventOutcome: null })
  expect(sample.steps[1]).toMatchObject({ displayed: 'awaiting_confirmation', action: 'cancel', eventOutcome: null })
  expect(sample.steps[2]).toMatchObject({ displayed: 'submitting', action: 'events', eventOutcome: 'failed' })
  expect(sample.steps[3]).toMatchObject({ displayed: 'unknown', action: 'none', eventOutcome: null })
  expect(sample.steps[4]).toMatchObject({ displayed: 'submitted', action: 'none' })
  expect(sample.steps[5]).toMatchObject({ displayed: 'published', action: 'none' })
  expect(sample.steps[6]).toMatchObject({ displayed: 'awaiting_confirmation', action: 'none' })
  expect(sample.steps[7]).toMatchObject({ displayed: 'submitting', action: 'events', eventOutcome: 'unknown' })
  expect(sample.steps[8]).toMatchObject({ displayed: 'unknown', action: 'none' })
  expect(displayFromServer('unknown', { type: 'plugin_success' })).not.toBe('published')
})

test('approved package restores a file and rejects unsafe media urls', async () => {
  const file = fileFromApprovedPackage({ name: 'note.png', base64: 'aGk=' })
  expect(file.name).toBe('note.png')
  expect(file.type).toBe('image/png')
  expect(new TextDecoder().decode(await file.arrayBuffer())).toBe('hi')
  expect(() => buildEnterpriseExecutionPayload({ contentHash: 'hash', title: '标题', body: '正文', topics: ['企业运营'], mediaUrls: [{ name: 'bad', url: 'javascript:alert(1)' }] })).toThrow(/unsupported media url/)
  expect(() => buildEnterpriseExecutionPayload({ contentHash: 'hash', title: '标题', body: '正文', topics: ['企业运营'], mediaUrls: [{ name: 'bad', url: 'https://user:pass@cdn.example.com/a.png' }] })).toThrow(/unsupported media url/)
})

test('plugins without the approval protocol stay on the manual path', async () => {
  const calls: string[] = []
  const result = await connectApprovedPublishJob({
    supportsApprovalProtocol: false,
    job,
    executor,
    claim: async () => { calls.push('claim'); throw new Error('should not claim') },
    renew: async () => { calls.push('renew'); return { expiresAt: '' } },
    cancel: async () => { calls.push('cancel') },
    reportEvent: async () => { calls.push('events'); return 'submitted' },
    readServerStatus: async () => 'unknown',
    execute: async () => { calls.push('execute'); return { type: 'plugin_success' } },
  })
  expect(result).toMatchObject({ path: 'manual', calls: [], displayed: 'waiting_executor', autoSubmit: false })
  expect(calls).toEqual([])
  expect(resolvePublishJobMode(false, 'browser')).toBe('manual')
  expect(resolvePublishJobMode(true, 'browser')).toBe('browser')
  expect(canPrepareBrowserExecution({ supportsApprovalProtocol: false, jobMode: 'browser', accountId: 'account', executor })).toBe(false)
})

test('plugin success with an unknown server status does not post submitted', async () => {
  const calls: string[] = []
  const result = await connectApprovedPublishJob({
    supportsApprovalProtocol: true,
    job,
    executor,
    mediaUrls: [{ name: 'remote.png', url: 'https://cdn.example.com/remote.png' }],
    claim: async (executorId) => {
      calls.push(`claim:${executorId}`)
      return { attemptId: '6f1b5c3e-8c1a-4f0e-9d2b-111111111111', leaseToken: 'ab'.repeat(32), expiresAt: '2030-01-01T00:00:00.000Z', payload: packagePayload }
    },
    renew: async (lease) => { calls.push(`renew:${lease.attemptId}:${lease.leaseToken}`); return { expiresAt: '2030-01-01T00:01:30.000Z' } },
    cancel: async () => { calls.push('cancel') },
    reportEvent: async (outcome) => { calls.push(`events:${outcome}`); return outcome },
    readServerStatus: async () => 'unknown',
    execute: async (payload, emit) => {
      calls.push(`execute:${String(payload.autoSubmit)}:${payload.topics.join(',')}:${payload.media.map(item => item.kind).join('+')}`)
      emit({ type: 'progress', stage: 'upload', progress: 40 })
      return { type: 'plugin_success' }
    },
  })
  expect(result).toMatchObject({ path: 'prepared', displayed: 'unknown', progress: 40, autoSubmit: false, calls: ['claim', 'execute', 'renew-lease'], leaseExpiresAt: '2030-01-01T00:01:30.000Z' })
  expect(calls).toEqual([`claim:${executor.id}`, 'execute:false:企业运营:file+url', `renew:6f1b5c3e-8c1a-4f0e-9d2b-111111111111:${'ab'.repeat(32)}`])
  expect(result.displayed).not.toBe('published')
})

test('cancel and submitting errors do not become a submitted event', async () => {
  const cancelled = await connectApprovedPublishJob({
    supportsApprovalProtocol: true,
    job,
    executor,
    claim: async () => ({ attemptId: 'attempt', leaseToken: 'cd'.repeat(32), expiresAt: '2030-01-01T00:00:00.000Z', payload: packagePayload }),
    renew: async () => { throw new Error('should not renew') },
    cancel: async () => {},
    reportEvent: async () => { throw new Error('should not report') },
    readServerStatus: async () => 'awaiting_confirmation',
    execute: async () => ({ type: 'cancel' }),
  })
  expect(cancelled).toMatchObject({ calls: ['claim', 'execute', 'cancel'], displayed: 'awaiting_confirmation', autoSubmit: false })
  const failed = await connectApprovedPublishJob({
    supportsApprovalProtocol: true,
    job: { ...job, status: 'submitting' },
    executor,
    claim: async () => ({ attemptId: 'attempt', leaseToken: 'cd'.repeat(32), expiresAt: '2030-01-01T00:00:00.000Z', payload: packagePayload }),
    renew: async () => { throw new Error('should not renew') },
    cancel: async () => { throw new Error('should not cancel') },
    reportEvent: async (outcome, lease) => outcome === 'failed' && lease.leaseToken === 'cd'.repeat(32) ? 'failed' : 'submitted',
    readServerStatus: async () => 'submitting',
    execute: async () => { throw new Error('upload_failed') },
  })
  expect(failed).toMatchObject({ calls: ['claim', 'execute', 'events'], displayed: 'failed', autoSubmit: false })
  expect(failed.displayed).not.toBe('published')
})
