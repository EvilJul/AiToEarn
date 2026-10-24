import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS90AAAAASUVORK5CYII='

/** 拦截个人页面依赖，避免关闭企业模式的回归访问真实后端。 */
async function preparePersonalPage(page: Page) {
  await page.addInitScript(() => localStorage.setItem('User', JSON.stringify({ state: { token: 'personal-regression-token', lang: 'zh-CN', userInfo: { id: 'owner', name: '演示用户（自动化测试）' } }, version: 0 })))
  await page.route(url => !['127.0.0.1', 'localhost'].includes(url.hostname), route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }))
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    let data: unknown = {}
    if (path.includes('/user/mine') || path.endsWith('/user/info'))
      data = { id: 'owner', name: '演示用户（自动化测试）', mail: 'test@example.invalid' }
    else if (path.includes('/material/group/list/'))
      data = { list: [{ id: 'plan-existing', name: '既有草稿箱', title: '既有草稿箱', type: 'article' }], total: 1 }
    else if (path.includes('/material/group/info/'))
      data = { id: 'plan-existing', name: '既有草稿箱', title: '既有草稿箱', type: 'article' }
    else if (path.includes('/material/list/'))
      data = { list: [{ id: 'material-existing', groupId: 'plan-existing', title: '既有用户素材样稿', status: 0, createdAt: '2026-10-01T00:00:00.000Z', mediaList: [{ type: 'img', url: pixel }] }], total: 1 }
    else if (path.includes('/media/list/'))
      data = { list: [], total: 0 }
    else if (path.endsWith('/ai/assets'))
      data = { page: 1, pageSize: 20, total: 1, list: [{ id: 'asset-existing', url: pixel, type: 'aiImage', mimeType: 'image/png', filename: '既有生成素材.png', createdAt: '2026-10-01T00:00:00.000Z' }] }
    else if (path.endsWith('/channels/accounts'))
      data = { list: [], total: 0 }
    else if (path.endsWith('/channels/account-groups') || path.endsWith('/channels/platforms'))
      data = []
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 0, data, message: 'success' }) })
  })
}

test.beforeEach(async ({ page }) => preparePersonalPage(page))

test('original navigation, materials, publishing entry and plugin remain available with enterprise mode off', async ({ page }) => {
  await page.goto('/zh-CN')
  await expect(page.getByRole('link', { name: '企业工作台', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '内容管理', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'AI发布', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '任务记录', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '发布', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'AI 生成素材', exact: true })).toBeVisible()
  await expect(page.getByText('既有用户素材样稿', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'AI 生成素材', exact: true }).click()
  await expect(page).toHaveURL(/\/zh-CN\/agent-assets$/)
  await expect(page.getByRole('button', { name: '既有生成素材.png', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '发布', exact: true }).click()
  await expect(page).toHaveURL(/\/zh-CN\/accounts$/)
  await expect(page.getByTestId('accounts-new-work-btn')).toBeVisible()
  await expect(page.getByRole('button', { name: '新建作品', exact: true })).toBeVisible()
  await page.getByTestId('sidebar-plugin').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.goto('/zh-CN/enterprise')
  await expect(page.getByRole('link', { name: '企业工作台', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '内容管理', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '发布', exact: true })).toBeVisible()
  await expect(page.getByTestId('sidebar-plugin')).toBeVisible()
})
