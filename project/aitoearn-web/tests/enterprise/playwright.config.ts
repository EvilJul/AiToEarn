import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 60000,
  workers: 1,
  reporter: 'list',
  outputDir: '../../../../output/playwright/enterprise-results',
  use: { actionTimeout: 15000, baseURL: 'http://127.0.0.1:6061', channel: 'chrome', viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure' },
})
