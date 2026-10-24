import { defineConfig } from '@playwright/test'

/** 企业开关关闭时的原功能回归。不要用 6061 的企业预览结果代替本配置。 */
export default defineConfig({
  testDir: '.',
  testMatch: ['personal-regression.spec.ts', 'execution.spec.ts', 'protocol.spec.ts'],
  timeout: 180000,
  expect: { timeout: 20000 },
  workers: 1,
  reporter: 'list',
  outputDir: '../../../../output/playwright/personal-regression-results',
  use: { actionTimeout: 20000, baseURL: 'http://127.0.0.1:6062', channel: 'chrome', viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure' },
})
