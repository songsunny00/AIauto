import { test as base, Page, expect } from '@playwright/test'

/**
 * 测试账号（报告配置维护人员）
 * 账号：shl，密码：@admin123
 */
export const TEST_USER = {
  username: 'shl',
  password: '@admin123',
}

/**
 * 基础 URL
 */
export const BASE_URL = 'http://10.17.227.10:30080'
export const REPORT_CONFIG_URL = `${BASE_URL}/config/reportConfig`

/**
 * 登录操作
 * 支持用户名/密码字段的多种选择器兜底
 */
async function warmProjectCodeList(page: Page) {
  await page.waitForFunction(() => !!localStorage.getItem('User1'), { timeout: 10_000 })

  await page.evaluate(() => {
    if (localStorage.getItem('projectCodeList')) return

    const rawUserStore = localStorage.getItem('User1')
    if (!rawUserStore) return

    try {
      const parsed = JSON.parse(rawUserStore)
      const userInfo = parsed?.userInfo || {}
      const projectCodes: string[] = userInfo.projectCodes || []
      const projectNames: string[] = userInfo.projectNames || []

      if (!projectCodes.length) return

      const projectCodeList = projectCodes.map((code, index) => ({
        label: projectNames[index] || code,
        value: code,
        status: 1,
      }))

      localStorage.setItem('projectCodeList', JSON.stringify(projectCodeList))
    } catch {
      // ignore cache warm-up failure and let page logic handle it
    }
  })
}

export async function login(page: Page, username = TEST_USER.username, password = TEST_USER.password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })

  // 填写用户名
  const usernameInput = page.locator(
    'input[name="username"], input[placeholder*="用户名"], input[placeholder*="账号"], input[type="text"]'
  ).first()
  await usernameInput.fill(username)

  // 填写密码
  const passwordInput = page.locator('input[type="password"]').first()
  await passwordInput.fill(password)

  // 点击登录按钮
  const loginBtn = page.locator(
    'button[type="submit"], button:has-text("登录"), .login-btn'
  ).first()
  await loginBtn.click()

  // 等待登录完成（跳转离开登录页）
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15_000,
  })

  await warmProjectCodeList(page)
}

/**
 * 自定义 fixture：带已登录状态的 page
 */
type AuthFixtures = {
  authedPage: Page
}

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    await login(page)
    await use(page)
  },
})

export { expect }
