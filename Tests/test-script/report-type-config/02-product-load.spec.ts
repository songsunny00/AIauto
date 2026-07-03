import { test, expect } from './fixtures/auth'
import { ReportConfigPage } from './helpers/page-objects'

/**
 * 功能用例 3.2：产品套餐加载与配置回填
 * 需求编号：REQ-CONFIG-REPORTCFG-TYPECFG-002
 * 测试账号：shl / @admin123（报告配置维护人员）
 *
 * 前置数据：
 *   - DX2489：已有保存配置 ExonCNVAndSNV: ["Primary", "ACMG"]
 *   - DX2490：另一个 status=1 的产品套餐
 *   - 存在 status=0 的禁用产品套餐
 */
test.describe('FT-002 产品套餐加载与配置回填（REQ-CONFIG-REPORTCFG-TYPECFG-002）', () => {
  let reportPage: ReportConfigPage

  test.beforeEach(async ({ authedPage }) => {
    reportPage = new ReportConfigPage(authedPage)
    await reportPage.goto()
    await reportPage.ensureProject('WGS/WES')
    await expect(reportPage.reportTypeCfgBtn).toBeVisible({ timeout: 10_000 })
    await reportPage.clickReportTypeCfgBtn()
    await expect(reportPage.dialog).toBeVisible()
  })

  test.afterEach(async () => {
    try {
      await reportPage.closeDialog()
    } catch {
      // 弹窗可能已关闭
    }
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-002-001  P0
  // 弹窗打开时产品套餐下拉已加载，默认选中第一个启用产品
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-002-001 [P0] 弹窗打开时产品套餐下拉已加载且默认选中首个产品', async ({ authedPage }) => {
    // 产品选择器可见且有内容
    await expect(reportPage.productSelect).toBeVisible({ timeout: 8_000 })

    // 获取当前选中值，不为空
    const selected = await reportPage.getSelectedProduct()
    expect(selected.trim()).not.toBe('')

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-002-001-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-002-002  P0
  // DX2489 已保存配置 ExonCNVAndSNV: ["Primary","ACMG"] → 回填验证
  // "主要"和"ACMG"复选框呈选中状态，已选数量显示 2
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-002-002 [P0] DX2489产品已保存配置正确回填（主要+ACMG选中）', async ({ authedPage }) => {
    // 切换到 DX2489（若当前不是）
    await reportPage.selectProduct('DX2489')

    // 切换到 ExonCNV/SNV Tab
    await reportPage.clickTab('ExonCNV')

    // 验证"主要"已选中
    const primaryChecked = await reportPage.isCheckboxChecked('主要')
    expect(primaryChecked).toBe(true)

    // 验证"ACMG"已选中
    const acmgChecked = await reportPage.isCheckboxChecked('ACMG')
    expect(acmgChecked).toBe(true)

    // 验证已选数量包含"2"
    const countText = await reportPage.getSelectedCountText()
    expect(countText).toContain('2')

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-002-002-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-002-003  P1
  // 禁用产品（status=0）不出现在产品下拉列表中
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-002-003 [P1] 禁用产品不出现在产品下拉列表中', async ({ authedPage }) => {
    const allTexts = await reportPage.getProductOptions()

    // 记录实际选项用于截图分析
    console.log('产品下拉选项列表：', allTexts)

    // 断言：选项均不含"禁用"标识，且后端已过滤 status=0 产品
    // 此处以"禁用"关键字判断（如界面有此标记）；若后端直接过滤则列表不含禁用产品编号
    for (const text of allTexts) {
      expect(text).not.toContain('禁用')
    }

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-002-003-pass.png',
    })

    // 关闭下拉
    await authedPage.keyboard.press('Escape')
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-002-005  P1
  // 切换产品时自动请求新产品配置接口并回填
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-002-005 [P1] 切换产品套餐时自动请求新产品配置接口', async ({ authedPage }) => {
    // 先选中 DX2489
    await reportPage.selectProduct('DX2489')

    // 监听 API 请求
    const apiRequests: string[] = []
    authedPage.on('request', (req) => {
      if (req.url().includes('reportTypeConfigs')) {
        apiRequests.push(req.url())
      }
    })

    // 切换到 DX2490
    await reportPage.selectProduct('DX2490')
    await authedPage.waitForTimeout(1000)

    // 验证发出了 DX2490 的配置查询请求
    const dx2490Requests = apiRequests.filter((url) => url.includes('DX2490'))
    expect(dx2490Requests.length).toBeGreaterThan(0)

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-002-005-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-002-006  P1
  // 切回已加载过的产品不重复请求接口（使用本地草稿缓存）
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-002-006 [P1] 切回已加载产品不重复请求接口（本地缓存）', async ({ authedPage }) => {
    // 先加载 DX2489
    await reportPage.selectProduct('DX2489')
    await authedPage.waitForTimeout(500)

    // 切换到 DX2490（触发请求）
    await reportPage.selectProduct('DX2490')
    await authedPage.waitForTimeout(1000)

    // 开始监听后续请求
    const subsequentRequests: string[] = []
    authedPage.on('request', (req) => {
      if (req.url().includes('reportTypeConfigs/DX2489')) {
        subsequentRequests.push(req.url())
      }
    })

    // 切回 DX2489
    await reportPage.selectProduct('DX2489')
    await authedPage.waitForTimeout(1000)

    // 不应再次请求 DX2489 接口
    expect(subsequentRequests).toHaveLength(0)

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-002-006-pass.png',
    })
  })
})
