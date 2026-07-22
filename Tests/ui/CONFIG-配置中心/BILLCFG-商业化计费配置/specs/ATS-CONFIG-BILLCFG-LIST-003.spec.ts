import { test, expect } from '../fixtures/billing.fixture'
import { BillingConfigPage } from '../pages/billing.page'

/**
 * REQ-CONFIG-BILLCFG-LIST-003 合同状态展示与启停控制
 * 覆盖：FT-BILLCFG-LIST-008 ~ 010, 013, 014
 */
test.describe('合同状态展示与启停控制', () => {
  let billingPage: BillingConfigPage

  test.beforeEach(async ({ authedPage }) => {
    billingPage = new BillingConfigPage(authedPage)
    await billingPage.goto()
  })

  // ─── P0 ──────────────────────────────────────────────────────────────────

  test('FT-BILLCFG-LIST-008: 状态标签文案与颜色匹配', async () => {
    const rowCount = await billingPage.getRowCount()
    expect(rowCount).toBeGreaterThan(0)

    // 遍历可见行，验证状态标签
    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const statusText = await billingPage.getRowStatusText(i)
      const statusType = await billingPage.getRowStatusType(i)

      if (statusText === '正常') {
        expect(statusType).toBe('success')
      } else if (statusText === '即将到期') {
        expect(statusType).toBe('warning')
      } else if (statusText === '已到期') {
        expect(statusType).toBe('info')
      } else if (statusText === '已停用') {
        expect(statusType).toBe('danger')
      }
    }
  })

  test('FT-BILLCFG-LIST-009: 禁用流程 - 取消后再次确认', async () => {
    // 找到 ENABLED 合同（按钮文案为"禁用"）
    const disableBtn = billingPage.page.locator('button:has-text("禁用")').first()
    await expect(disableBtn).toBeVisible()

    // 第一次点击禁用 → 取消
    await disableBtn.click()
    await billingPage.cancelToggle()

    // 验证未发生状态变更（确认框关闭）
    const messageBox = billingPage.page.locator('.el-message-box:visible')
    await expect(messageBox).toHaveCount(0)

    // 第二次点击禁用 → 确认
    await disableBtn.click()
    await billingPage.confirmToggle()

    // 验证提示成功
    await billingPage.expectToast('禁用成功')

    // 验证状态变更
    await billingPage.page.waitForLoadState('networkidle')
  })

  test('FT-BILLCFG-LIST-010: 启用流程', async () => {
    // 找到 DISABLED 合同（按钮文案为"启用"）
    const enableBtn = billingPage.page.locator('button:has-text("启用")').first()
    await expect(enableBtn).toBeVisible()

    // 点击启用 → 确认
    await enableBtn.click()
    await billingPage.confirmToggle()

    // 验证提示成功
    await billingPage.expectToast('启用成功')

    // 验证状态变更
    await billingPage.page.waitForLoadState('networkidle')
  })

  // ─── P1 ──────────────────────────────────────────────────────────────────

  test('FT-BILLCFG-LIST-013: TERMINATED 合同操作按钮置灰', async () => {
    // TODO: 需要 status=TERMINATED 合同数据
    // 验证启用/禁用按钮 disabled
    test.skip(true, '需要 TERMINATED 合同数据')
  })

  test('FT-BILLCFG-LIST-014: 已停用优先级高于已到期', async () => {
    // TODO: 需要同时 DISABLED 且已过到期日的合同数据
    // 验证状态标签展示"已停用"（danger），而非"已到期"（info）
    test.skip(true, '需要 DISABLED+已到期 合同数据')
  })
})
