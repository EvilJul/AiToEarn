import type { Page } from '@playwright/test'
import type { Buffer } from 'node:buffer'

const id = 'aaaaaaaaaaaaaaaaaaaaaaaa'
export const revisionId = 'bbbbbbbbbbbbbbbbbbbbbbbb'
const jobId = 'cccccccccccccccccccccccc'

export async function prepareEnterprisePage(page: Page) {
  await page.addInitScript(() => localStorage.setItem('User', JSON.stringify({ state: { token: 'enterprise-test-token', lang: 'zh-CN', userInfo: { id: 'owner', name: '演示用户（自动化测试）' } }, version: 0 })))
  await page.route(url => !['127.0.0.1', 'localhost'].includes(url.hostname), route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }))
  const enterprise = { id, name: '演示企业（自动化测试）', industry: '企业服务', regions: ['上海'], timezone: 'Asia/Shanghai', enabled: true, allowSelfReview: false, role: 'admin', version: 0, responseReminderMinutes: 5 }
  const knowledge = { id: 'dddddddddddddddddddddddd', title: '已批准的企业服务范围', category: 'product', revision: 1, knowledgeId: 'dddddddddddddddddddddddd', supersedesId: '', evidenceAssetIds: [], body: '提供企业内容运营服务，实际报价由销售确认。', source: '测试专用资料，非客户事实', status: 'approved', validUntil: '2030-01-01T00:00:00Z', version: 0, createdBy: 'author', createdAt: '2026-10-23T00:00:00Z' }
  const revision = { id: revisionId, contentId: revisionId, parentRevisionId: '', revisionNumber: 1, imageHashes: [], title: '企业内容运营的三个步骤', body: '先确认事实，再完成内容审核，最后核验发布结果。', status: 'approved', topics: ['企业运营'], imageAssetIds: [], knowledgeIds: [knowledge.id], contentHash: 'fixture', createdAt: '2026-10-23T00:00:00Z', createdBy: 'operator', version: 0 }
  const faq = { ...knowledge, id: 'eeeeeeeeeeeeeeeeeeeeeeee', category: 'faq', title: '如何预约服务', body: '请联系销售确认服务范围与时间。' }
  const samplePhoto = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS90AAAAASUVORK5CYII='
  const caseKnowledge = { ...knowledge, id: '666666666666666666666666', category: 'case', title: '已审案例排版样本', body: '演示资料：本案例仅供界面测试，不代表真实客户事实。' }
  let templateBytes: Buffer | null = null
  let templateMime = 'image/png'
  const job = { id: jobId, revisionId, accountId: 'account', status: 'awaiting_confirmation', mode: 'manual', scheduledAt: '2026-10-24T02:00:00Z', workLink: '', verificationMethod: '', version: 0 }
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    let data: unknown = {}
    if (path.endsWith('/template-put')) {
      templateBytes = route.request().postDataBuffer()
      templateMime = route.request().headers()['content-type'] || 'image/png'
      await route.fulfill({ status: 200, body: '' })
      return
    }
    if (path.endsWith('/generated-template.png') && templateBytes) {
      await route.fulfill({ status: 200, contentType: templateMime, body: templateBytes })
      return
    }
    if (path.endsWith('/assets/uploadSign'))
      data = { id: '444444444444444444444444', url: 'http://127.0.0.1:6061/api/generated-template.png', uploadUrl: 'http://127.0.0.1:6061/api/template-put' }
    else if (/\/image-assets\/[a-f0-9]{24}\/source$/.test(path))
      data = { mimeType: 'image/png', base64: samplePhoto }
    else if (path.endsWith('/confirm'))
      data = { url: 'http://127.0.0.1:6061/api/generated-template.png' }
    else if (/\/knowledge\/[a-f0-9]{24}$/.test(path))
      data = knowledge
    else if (path.endsWith('/history'))
      data = [{ id: '555555555555555555555555', actorId: 'reviewer', action: 'content.approved', reason: '审核事实依据', createdAt: '2026-10-23T00:00:00Z' }]
    else if (path.endsWith('/user/info'))
      data = { id: 'owner', name: '演示用户（自动化测试）', mail: 'test@example.invalid' }
    else if (path.endsWith('/channels/account-groups'))
      data = []
    else if (path.endsWith('/channels/accounts'))
      data = { list: [], total: 0 }
    else if (path.endsWith('/enterprise-ops/enterprises'))
      data = [enterprise]
    else if (path.endsWith('/knowledge'))
      data = [knowledge, faq, caseKnowledge]
    else if (path.endsWith('/leads') || path.endsWith('/notifications') || path.endsWith('/executors') || path.endsWith('/resources'))
      data = []
    else if (path.endsWith('/topics'))
      data = []
    else if (path.endsWith('/revisions'))
      data = [revision]
    else if (path.endsWith('/publish-jobs'))
      data = [job]
    else if (path.endsWith('/conversations'))
      data = [{ id: 'eeeeeeeeeeeeeeeeeeeeeeee', customerName: '测试咨询', channel: 'rednote_dm', summary: '我想了解企业服务，请转人工。', source: '测试人工记录', state: 'waiting_human', ownerId: '', followUps: [], version: 0 }]
    else if (path.endsWith('/members'))
      data = [{ id: 'owner', userId: 'owner', role: 'admin', active: true, version: 0 }]
    else if (path.endsWith('/image-assets'))
      data = [{ id: '777777777777777777777777', filename: '测试用合成像素图', url: `data:image/png;base64,${samplePhoto}` }]
    else if (path.endsWith('/platforms'))
      data = []
    else if (path.endsWith('/material-package'))
      data = { revisionId, contentHash: 'fixture', title: revision.title, body: revision.body, topics: revision.topics, files: [], review: { reviewedBy: 'reviewer', reason: '' } }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 0, data, message: 'success' }) })
  })
}
