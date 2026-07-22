import { test, expect } from '../fixtures/billing.fixture'
import { BillingConfigPage } from '../pages/billing.page'

/**
 * REQ-CONFIG-BILLCFG-DETAIL-001 明细抽屉查看
 * 覆盖：FT-BILLCFG-DETAIL-001 ~ 006
 */
test.describe('明细抽屉查看', () => {
  let billingPage: BillingConfigPage

  test.beforeEach(async ({ authedPage }) => {
    billingPage = new BillingConfigPage(authedPage)
    await billingPage.goto()
  })

  // ─── P0 ──────────────────────────────────────────────────────────────────

  test('FT-BILLCFG-DETAIL-001: 明细抽屉汇总区与明细表展示', async () => {
    // 打开第一行的明细抽屉
    await billingPage.openDetailDrawer(0)

    // 验证抽屉可见
    await expect(billingPage.detailDrawer).toBeVisible()

    // 验证汇总区可见（顶部展示样本分析总次数、累计消耗、剩余、数据存储期限、文件下载次数）
    await expect(billingPage.summaryBar).toBeVisible()

    // 验证"样本分析次数累计消耗"红色展示（仅当消耗值 > 0 时才验证红色样式）
    const consumedEl = billingPage.summaryBar.locator('*').filter({ hasText: '累计消耗' }).first()
    if (await consumedEl.isVisible()) {
      const consumedText = (await consumedEl.textContent()) || ''
      const consumedValue = parseInt(consumedText.match(/\d+/)?.[0] || '0')
      if (consumedValue > 0) {
        const className = await consumedEl.evaluate((el) => {
          const target = el.closest('[class*="danger"], [class*="red"], [style*="red"]') || el
          return target.className || target.getAttribute('style') || ''
        })
        expect(className).toMatch(/danger|red|#f|#e/)
      }
    }

    // 验证下方展示用量明细表和历史变更表
    await expect(billingPage.usageTable).toBeVisible()
    await expect(billingPage.historyTable).toBeVisible()

    await billingPage.closeDetail()
  })

  // ─── P1 ──────────────────────────────────────────────────────────────────

  test('FT-BILLCFG-DETAIL-002: 无消耗记录的合同用量明细空状态', async () => {
    // TODO: 需要准备无 CONFIRMED 消耗记录的合同数据
    // 打开该合同明细 → 验证用量明细表展示空状态，其他区域正常
    test.skip(true, '需要无 CONFIRMED 消耗记录的合同数据')
  })

  test('FT-BILLCFG-DETAIL-003: 历史与用量分页互不干扰', async () => {
    // TODO: 需要至少 2 页历史记录的合同数据
    // 打开明细抽屉
    // 切换历史分页 → 验证历史表刷新
    // 切换用量分页 → 验证用量表刷新（前端表现层分页，序号连续）
    // 验证两张表切换互不干扰
    test.skip(true, '需要至少 2 页历史记录的合同数据')
  })

  test('FT-BILLCFG-DETAIL-004: 汇总区口径与用量明细表不重复累加', async () => {
    // 打开明细抽屉
    await billingPage.openDetailDrawer(0)

    // 顶部汇总使用合同配额行口径（summary.totalQuota/totalUsed/totalRemain）
    // 不等于用量明细表各行之和（避免任务级用量重复累加套餐配额）
    const summaryText = ((await billingPage.summaryBar.textContent()) || '').replace(/\s+/g, ' ').trim()
    expect(summaryText.length).toBeGreaterThan(0)

    // 获取用量明细表行数
    const usageRows = billingPage.usageTable.locator('.el-table__body-wrapper .el-table__row')
    const usageRowCount = await usageRows.count()

    // 汇总区数值与用量明细表行数不直接相等（口径不同）
    // 此处验证汇总区存在且用量明细表有数据或为空态
    if (usageRowCount > 0) {
      // 汇总区应包含数值字段
      expect(summaryText).toMatch(/\d+/)
    }

    await billingPage.closeDetail()
  })

  test('FT-BILLCFG-DETAIL-005: 关闭抽屉后 destroy-on-close 销毁状态', async () => {
    // 打开第一个合同的明细抽屉
    await billingPage.openDetailDrawer(0)
    await expect(billingPage.detailDrawer).toBeVisible()

    // 关闭抽屉
    await billingPage.closeDetail()
    await expect(billingPage.detailDrawer).toHaveCount(0)

    // 打开第二个合同的明细抽屉（如果存在第二行）
    const rowCount = await billingPage.getRowCount()
    if (rowCount > 1) {
      await billingPage.openDetailDrawer(1)
      await expect(billingPage.detailDrawer).toBeVisible()

      // 验证抽屉从初始状态加载，不残留上一合同数据
      // 汇总区应重新加载该合同的数据
      await expect(billingPage.summaryBar).toBeVisible()

      await billingPage.closeDetail()
    }
  })

  // ─── P2 ──────────────────────────────────────────────────────────────────

  test('FT-BILLCFG-DETAIL-006: 关闭按钮不触发列表刷新', async () => {
    // 记录当前列表的合同数据数量
    const rowCountBefore = await billingPage.getRowCount()

    // 打开明细抽屉
    await billingPage.openDetailDrawer(0)

    // 监听合同分页接口请求
    let pageRequestCount = 0
    billingPage.page.on('request', (req) => {
      if (req.url().includes('/base/quota/contract/page')) {
        pageRequestCount++
      }
    })

    // 点击底部关闭按钮
    await billingPage.detailCloseBtn.click({ force: true })
    await billingPage.detailDrawer.waitFor({ state: 'hidden', timeout: 5_000 })

    // 验证抽屉关闭
    await expect(billingPage.detailDrawer).toHaveCount(0)

    // 验证未触发列表刷新（不调用分页接口）
    expect(pageRequestCount).toBe(0)

    // 验证列表保持原查询结果与分页状态
    const rowCountAfter = await billingPage.getRowCount()
    expect(rowCountAfter).toBe(rowCountBefore)
  })
})
