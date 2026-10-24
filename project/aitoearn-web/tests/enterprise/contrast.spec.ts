import { expect, test } from '@playwright/test'
import { prepareEnterprisePage } from './fixtures'

test('enterprise body and action colors meet minimum text contrast in both themes', async ({ page }) => {
  await prepareEnterprisePage(page)
  await page.goto('/zh-CN/enterprise')
  await expect(page.getByRole('heading', { name: '演示企业（自动化测试）' })).toBeVisible()
  const ratios = await page.evaluate(() => {
    const pixel = document.createElement('canvas')
    pixel.width = pixel.height = 1
    const context = pixel.getContext('2d')!
    const luminance = (color: string) => {
      context.fillStyle = color.trim()
      context.fillRect(0, 0, 1, 1)
      const channels = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
    }
    const ratio = (a: string, b: string) => {
      const x = luminance(a)
      const y = luminance(b)
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
    }
    return ['light', 'dark'].map((theme) => {
      document.documentElement.classList.toggle('dark', theme === 'dark')
      const style = getComputedStyle(document.documentElement)
      const color = (name: string) => style.getPropertyValue(name)
      return { theme, body: ratio(color('--muted-foreground'), color('--background')), actionStart: ratio(color('--gradient-foreground'), color('--brand-action-purple') || color('--brand-purple')), actionEnd: ratio(color('--gradient-foreground'), color('--brand-action-cyan') || color('--brand-cyan')), brandText: ratio(color('--brand-ink') || color('--brand-cyan'), color('--background')) }
    })
  })
  console.log(JSON.stringify(ratios))
  for (const result of ratios) {
    expect(result.body).toBeGreaterThanOrEqual(4.5)
    expect(result.actionStart).toBeGreaterThanOrEqual(4.5)
    expect(result.actionEnd).toBeGreaterThanOrEqual(4.5)
    expect(result.brandText).toBeGreaterThanOrEqual(4.5)
  }
})
