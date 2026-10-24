import { expect, test } from '@playwright/test'
import { prepareEnterprisePage, revisionId } from './fixtures'

const jobId = 'cccccccccccccccccccccccc'
const executorId = 'eeeeeeeeeeeeeeeeeeeeeeee'
const attemptId = '6f1b5c3e-8c1a-4f0e-9d2b-111111111111'
const leaseToken = 'ab'.repeat(32)
const imageId = '444444444444444444444444'

function envelope(data: unknown) {
  return { contentType: 'application/json', body: JSON.stringify({ code: 0, data, message: 'success' }) }
}

test('approval plugin prepares the server lease and keeps an unknown result unknown', async ({ page }) => {
  const calls: string[] = []
  let claimed = false
  await prepareEnterprisePage(page)
  await page.addInitScript(`(() => {
    window.AiToEarnEnterpriseExtension = {
      getCapabilities: async () => ({ protocolVersion: 1, version: '1.0.0', hostAccess: true, capabilities: ['image_text', 'approval_gate', 'manual_confirmation'] }),
      executeApprovedTask: async (task) => {
        window.__enterpriseTask = { autoSubmit: task.autoSubmit, topics: task.topics, media: task.media.map(item => ({ kind: item.kind, name: item.name })) }
        task.onSignal?.({ type: 'progress', stage: 'upload', progress: 40 })
        return { success: true }
      },
    }
  })()`)
  await page.route(url => new URL(url).pathname.endsWith('/revisions'), route => route.fulfill(envelope([{ id: revisionId, contentId: revisionId, parentRevisionId: '', revisionNumber: 1, imageHashes: [], title: '企业内容运营的三个步骤', body: '先确认事实，再完成内容审核，最后核验发布结果。', status: 'approved', topics: ['企业运营'], imageAssetIds: [imageId], knowledgeIds: [], contentHash: 'fixture', createdAt: '2026-10-23T00:00:00Z', createdBy: 'operator', version: 0 }])))
  await page.route(url => new URL(url).pathname.endsWith('/image-assets'), route => route.fulfill(envelope([{ id: imageId, filename: 'workspace-image.png', url: 'http://127.0.0.1:6062/api/workspace-image.png' }])))
  await page.route(url => new URL(url).pathname.endsWith('/executors'), route => route.fulfill(envelope([{ id: executorId, deviceId: 'device', accountId: 'account', pluginVersion: '1.0.0', lastHeartbeatAt: '2030-01-01T00:00:00.000Z', online: true, revoked: false, capabilities: ['image_text', 'approval_gate', 'manual_confirmation'] }])))
  await page.route(url => new URL(url).pathname.includes('/publish-jobs'), async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/publish/flows') || path.includes('/publish/tasks'))
      calls.push('legacy-publish')
    if (path.endsWith('/authorize-submit'))
      calls.push('authorize-submit')
    if (path.endsWith('/claim')) {
      calls.push(`claim:${route.request().postDataJSON().executorId}`)
      claimed = true
      await route.fulfill(envelope({ jobId, attemptId, leaseToken, expiresAt: '2030-01-01T00:01:30.000Z', payload: { revisionId, contentHash: 'fixture', title: '企业内容运营的三个步骤', body: '先确认事实，再完成内容审核，最后核验发布结果。', topics: ['企业运营'], files: [{ name: 'note.png', base64: 'aGk=' }], review: { reviewedBy: 'reviewer', reason: '' } } }))
      return
    }
    if (path.endsWith('/renew-lease')) {
      calls.push('renew-lease')
      await route.fulfill(envelope({ expiresAt: '2030-01-01T00:01:30.000Z' }))
      return
    }
    if (path.endsWith('/events')) {
      calls.push(`events:${route.request().postDataJSON().outcome}`)
      await route.fulfill(envelope({ jobId, status: 'unknown' }))
      return
    }
    await route.fulfill(envelope([{ id: jobId, revisionId, accountId: 'account', status: claimed ? 'unknown' : 'waiting_executor', mode: 'browser', scheduledAt: '2026-10-24T02:00:00Z', workLink: '', verificationMethod: '', version: claimed ? 1 : 0, executorId: claimed ? executorId : '', attemptId: claimed ? attemptId : '', leaseExpiresAt: claimed ? '2030-01-01T00:01:30.000Z' : null }]))
  })
  await page.goto('/zh-CN/enterprise')
  await page.getByRole('button', { name: '发布管理', exact: true }).click()
  await page.getByRole('button', { name: '准备执行', exact: true }).click()
  await expect(page.getByText('结果未知', { exact: true })).toBeVisible()
  await expect(page.getByText('插件回调不能当作发布成功。服务端结果仍未知。', { exact: true })).toBeVisible()
  await expect(page.getByText('准备进度 40%', { exact: true })).toBeVisible()
  await expect(page.getByText(/设备租约至/)).toContainText('2030')
  await expect(page.getByText('发布已核验', { exact: true })).toHaveCount(0)
  const task = await page.evaluate(() => (window as Window & { __enterpriseTask?: { autoSubmit: boolean, topics: string[], media: { kind: string, name: string }[] } }).__enterpriseTask)
  expect(task).toEqual({ autoSubmit: false, topics: ['企业运营'], media: [{ kind: 'file', name: 'note.png' }, { kind: 'url', name: 'workspace-image.png' }] })
  expect(calls).toEqual([`claim:${executorId}`, 'renew-lease'])
})

test('original plugin keeps manual assistance and does not claim a browser job', async ({ page }) => {
  const calls: string[] = []
  await prepareEnterprisePage(page)
  await page.addInitScript(`(() => {
    window.AIToEarnPlugin = { checkPermission: async () => ({ granted: true, hostAccess: true }), getVersion: async () => ({ version: '3.3.11' }), publish: async () => { window.__legacyPublish = true } }
  })()`)
  await page.route(url => new URL(url).pathname.includes('/publish-jobs'), async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/claim') || path.endsWith('/renew-lease') || path.endsWith('/events') || path.endsWith('/authorize-submit') || path.includes('/publish/flows') || path.includes('/publish/tasks'))
      calls.push(path)
    await route.fulfill(envelope([{ id: jobId, revisionId, accountId: 'account', status: 'awaiting_confirmation', mode: 'browser', scheduledAt: '2026-10-24T02:00:00Z', workLink: '', verificationMethod: '', version: 0 }]))
  })
  await page.goto('/zh-CN/enterprise')
  await page.getByRole('button', { name: '发布管理', exact: true }).click()
  await expect(page.getByRole('button', { name: '下载发布素材包', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '回填作品链接', exact: true })).toBeVisible()
  await expect(page.getByText('当前插件不能校验服务端审核许可，只开放人工素材包、回填和核验。', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '准备执行', exact: true })).toHaveCount(0)
  expect(calls).toEqual([])
  expect(await page.evaluate(() => (window as Window & { __legacyPublish?: boolean }).__legacyPublish || false)).toBe(false)
})
