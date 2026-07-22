import { test, expect } from '../fixtures/billing.fixture'
import { BillingConfigPage } from '../pages/billing.page'

/**
 * REQ-CONFIG-BILLCFG-LIST-002 合同列表展示与展开明细
 * 覆盖：FT-BILLCFG-LIST-005 ~ 007, 012, 015
 */
test.describe('合同列表展示与展开明细', () => {
  let billingPage: BillingConfigPage

  test.beforeEach(async ({ authedPage }) => {
    billingPage = new BillingConfigPage(authedPage)
    await billingPage.goto()
  })

  // ─── P0 ──────────────────────────────────────────────────────────────────

  test('FT-BILLCFG-LIST-005: 主列表字段完整性', async () => {
    const rowCount = await billingPage.getRowCount()
    expect(rowCount).toBeGreaterThan(0)

    // 验证列头包含所有必要字段
    const headers = billingPage.page.locator('.el-table__header-wrapper .el-table__cell')
    const headerTexts = await headers.allTextContents()
    const allHeaders = headerTexts.map(h => h.trim()).join(' ')

    expect(allHeaders).toContain('机构名称')
    expect(allHeaders).toContain('检测项目')
    expect(allHeaders).toContain('样本分析总次数')
    expect(allHeaders).toContain('数据存储期限')
    expect(allHeaders).toContain('合同编号')
    expect(allHeaders).toContain('合同周期')
    expect(allHeaders).toContain('合同状态')
  })

  test('FT-BILLCFG-LIST-006: 展开行显示配额明细', async () => {
    // 展开第一行
    await billingPage.expandRow(0)

    // 验证展开区可见
    await expect(billingPage.expandTable).toBeVisible({ timeout: 10_000 })

    // 验证展开区表头
    const expandHeaders = billingPage.expandTable.locator('.el-table__header-wrapper .el-table__cell')
    const headerTexts = await expandHeaders.allTextContents()
    const allHeaders = headerTexts.map(h => h.trim()).join(' ')

    expect(allHeaders).toContain('检测项目')
    expect(allHeaders).toContain('产品套餐')
    expect(allHeaders).toContain('样本分析次数配额')
  })

  // ─── P1 ──────────────────────────────────────────────────────────────────

  test('FT-BILLCFG-LIST-007: 无配额行合同展开显示空状态', async () => {
    // TODO: 需要准备一个无配额行的合同数据
    // 展开该合同 → 验证展开区展示空数据状态
    test.skip(true, '需要无配额行合同数据')
  })

  test('FT-BILLCFG-LIST-012: 二次展开复用缓存', async () => {
    // 第一次展开
    await billingPage.expandRow(0)
    await expect(billingPage.expandTable).toBeVisible()

    // 收起
    await billingPage.expandRow(0)
    await expect(billingPage.expandTable).toHaveCount(0)

    // 监听网络请求
    let requestCount = 0
    billingPage.page.on('request', (req) => {
      if (req.url().includes('/base/quota/contract/')) {
        requestCount++
      }
    })

    // 再次展开
    await billingPage.expandRow(0)
    await expect(billingPage.expandTable).toBeVisible()

    // 验证未发起新请求（使用缓存）
    expect(requestCount).toBe(0)
  })

  test('FT-BILLCFG-LIST-015: 查询后展开状态重置', async () => {
    // 先展开一行
    await billingPage.expandRow(0)
    await expect(billingPage.expandTable).toBeVisible()

    // 执行查询
    await billingPage.search()

    // 验证展开状态重置
    await expect(billingPage.expandTable).toHaveCount(0)
  })
})
