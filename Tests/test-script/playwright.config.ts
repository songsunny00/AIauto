import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 配置
 * 测试目标：报告配置维护人员功能用例（FT-CONFIG-REPORTCFG-TYPECFG-*）
 * 环境：test | http://10.17.227.10:30080
 */
export default defineConfig({
  testDir: './report-type-config',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  retries: 1,
  workers: 1, // 顺序执行，避免登录态竞争

  use: {
    baseURL: 'http://10.17.227.10:30080',
    headless: true,
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },

  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: '../test-reports/report-type-config/html',
        open: 'never',
      },
    ],
    [
      'junit',
      {
        outputFile: '../test-reports/report-type-config/junit.xml',
      },
    ],
  ],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  outputDir: '../test-reports/report-type-config/artifacts',
})
