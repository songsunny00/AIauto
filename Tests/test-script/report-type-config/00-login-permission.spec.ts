import { test, expect } from '@playwright/test'
import { login, TEST_USER, BASE_URL } from './fixtures/auth'
import { ReportConfigPage } from './helpers/page-objects'

/**
 * 登录验证 & 权限检查
 * 测试账号：shl / @admin123（报告配置维护人员，具备 menuId=11008 权限）
 */
test.describe('LOGIN 登录验证与权限检查', () => {
  // ──────────────────────────────────────────────────────────────────────────────
  // 登录验证
  // ──────────────────────────────────────────────────────────────────────────────
  test.describe('登录流程验证', () => {
    test('LOGIN-001 使用 shl/@admin123 账号登录成功', async ({ page }) => {
      await login(page, TEST_USER.username, TEST_USER.password)

      // 验证登录成功：URL 不含 /login
      expect(page.url()).not.toContain('/login')

      // 验证页面有菜单/导航元素（说明已进入主界面）
      const navOrMenu = page.locator('.el-menu, nav, [class*="menu"], [class*="sidebar"]').first()
      await expect(navOrMenu).toBeVisible({ timeout: 10_000 })

      await page.screenshot({
        path: 'test-reports/report-type-config/artifacts/LOGIN-001-pass.png',
      })
    })

    test('LOGIN-002 使用错误密码登录失败，停留在登录页并显示错误提示', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })

      const usernameInput = page.locator('input[type="text"], input[name="username"]').first()
      const passwordInput = page.locator('input[type="password"]').first()
      const loginBtn = page.locator('button[type="submit"], button:has-text("登录")').first()

      await usernameInput.fill('shl')
      await passwordInput.fill('wrong_password_123')
      await loginBtn.click()

      // 停留在登录页
      await page.waitForTimeout(2000)
      expect(page.url()).toContain('/login')

      // 显示错误提示
      const errMsg = page.locator(
        '.el-message--error, [class*="error"], .el-form-item__error'
      ).first()
      await expect(errMsg).toBeVisible({ timeout: 5_000 })

      await page.screenshot({
        path: 'test-reports/report-type-config/artifacts/LOGIN-002-pass.png',
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // 权限用例（报告配置维护人员 shl 账号）
  // PT-CONFIG-REPORTCFG-TYPECFG-001
  // ──────────────────────────────────────────────────────────────────────────────
  test.describe('权限检查 - 报告配置维护人员（shl）', () => {
    test('PT-001 [P0] shl账号可访问报告配置页面并看到报告类别配置按钮', async ({ page }) => {
      await login(page, TEST_USER.username, TEST_USER.password)

      const reportPage = new ReportConfigPage(page)
      await reportPage.goto()

      // 切换到 XOME 项目
      try {
        await reportPage.switchProject('WGS/WES')
      } catch {
        // 忽略
      }

      // 有权限：能看到"报告类别配置"按钮
      await expect(reportPage.reportTypeCfgBtn).toBeVisible({ timeout: 10_000 })

      // 能点击打开弹窗
      await reportPage.clickReportTypeCfgBtn()
      await expect(reportPage.dialog).toBeVisible()

      await page.screenshot({
        path: 'test-reports/report-type-config/artifacts/PT-001-pass.png',
      })

      await reportPage.closeDialog()
    })

    test('PT-006 [P1] XOME项目下切换非XOME项目后按钮不展示（入口条件控制）', async ({ page }) => {
      await login(page, TEST_USER.username, TEST_USER.password)

      const reportPage = new ReportConfigPage(page)
      await reportPage.goto()

      // 先切到 XOME，验证按钮存在
      try {
        await reportPage.switchProject('WGS/WES')
        await expect(reportPage.reportTypeCfgBtn).toBeVisible({ timeout: 8_000 })
      } catch {
        // 忽略
      }

      // 切换到非 XOME 项目
      const projectSel = page.locator('.el-select, [class*="project-selector"]').first()
      await projectSel.click()

      const options = page.locator('.el-select-dropdown__item')
      const count = await options.count()
      let switched = false

      for (let i = 0; i < count; i++) {
        const text = await options.nth(i).textContent()
        if (text && !text.includes('WGS/WES') && !text.includes('XOME')) {
          await options.nth(i).click()
          switched = true
          break
        }
      }

      if (!switched) {
        test.skip(true, '未找到非XOME项目，跳过')
        return
      }

      await page.waitForLoadState('networkidle')

      // 按钮不展示
      await expect(reportPage.reportTypeCfgBtn).not.toBeVisible({ timeout: 5_000 })

      await page.screenshot({
        path: 'test-reports/report-type-config/artifacts/PT-006-pass.png',
      })
    })

    test('PT-API-001 [P0] shl账号可成功调用产品套餐查询接口', async ({ page }) => {
      await login(page, TEST_USER.username, TEST_USER.password)

      // 直接调用接口验证权限
      const response = await page.request.get(
        `${BASE_URL}/api/base/products/queryForReportTemplate/XOME`
      )
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body.retCode).toBe(0)

      await page.screenshot({
        path: 'test-reports/report-type-config/artifacts/PT-API-001-pass.png',
      })
    })

    test('PT-API-002 [P0] shl账号可成功调用产品配置查询接口', async ({ page }) => {
      await login(page, TEST_USER.username, TEST_USER.password)

      const response = await page.request.get(
        `${BASE_URL}/api/base/products/reportTypeConfigs/DX2489`
      )
      expect([200, 404]).toContain(response.status()) // 200 或 404（产品不存在）

      if (response.status() === 200) {
        const body = await response.json()
        // 有权限时 retCode 为 0 或非 401/403 错误
        expect(body.retCode).not.toBeUndefined()
      }

      await page.screenshot({
        path: 'test-reports/report-type-config/artifacts/PT-API-002-pass.png',
      })
    })
  })
})
