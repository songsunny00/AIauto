import { test, expect } from './fixtures/auth'
import { ReportConfigPage } from './helpers/page-objects'

/**
 * 功能用例 3.4：当前产品配置保存
 * 需求编号：REQ-CONFIG-REPORTCFG-TYPECFG-004
 * 测试账号：shl / @admin123（报告配置维护人员）
 */
test.describe('FT-004 当前产品配置保存（REQ-CONFIG-REPORTCFG-TYPECFG-004）', () => {
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
  // FT-CONFIG-REPORTCFG-TYPECFG-004-001  P0
  // 点击确定后，按钮进入 loading 状态，取消按钮变为禁用
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-004-001 [P0] 点击确定后确定按钮进入loading且取消禁用', async ({ authedPage }) => {
    // 选中 DX2489 并勾选"主要"和"ACMG"
    await reportPage.selectProduct('DX2489')
    await reportPage.clickTab('ExonCNV')
    await reportPage.clickCheckbox('主要')
    await reportPage.clickCheckbox('ACMG')

    // 模拟慢速网络以观察 loading 状态
    await authedPage.route('**/reportTypeConfigs/edit', async (route) => {
      await authedPage.waitForTimeout(2000)
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ retCode: 0, message: '保存成功' }),
        contentType: 'application/json',
      })
    })

    // 点击确定
    await reportPage.dialogConfirmBtn.click()

    // 立即验证 loading 状态
    const confirmBtn = reportPage.dialogConfirmBtn
    const isLoading = await confirmBtn.evaluate((el) => {
      return el.classList.contains('is-loading') || el.getAttribute('loading') !== null
    })
    expect(isLoading).toBe(true)

    // 取消按钮应为禁用
    const cancelBtn = reportPage.dialogCancelBtn
    const isCancelDisabled = await cancelBtn.isDisabled()
    expect(isCancelDisabled).toBe(true)

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-004-001-loading.png',
    })

    // 等待请求完成
    await authedPage.waitForTimeout(2500)
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-004-002  P0
  // 保存成功后弹窗关闭，页面显示成功提示
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-004-002 [P0] 保存成功后弹窗关闭并显示成功提示', async ({ authedPage }) => {
    // Mock 保存接口返回成功
    await authedPage.route('**/reportTypeConfigs/edit', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ retCode: 0, message: '保存成功' }),
        contentType: 'application/json',
      })
    })

    // 选中产品并勾选配置
    await reportPage.selectProduct('DX2489')
    await reportPage.clickTab('ExonCNV')
    await reportPage.clickCheckbox('主要')
    await reportPage.clickCheckbox('ACMG')

    // 点击确定
    await reportPage.dialogConfirmBtn.click()

    // 等待弹窗关闭
    await expect(reportPage.dialog).not.toBeVisible({ timeout: 10_000 })

    // 验证成功提示出现（element-plus message 组件）
    const successMsg = authedPage.locator(
      '.el-message--success, .el-notification--success, [class*="success"]:has-text("成功")'
    ).first()
    await expect(successMsg).toBeVisible({ timeout: 5_000 })

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-004-002-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-004-003  P0
  // 当前项目下无可用产品套餐时，确定按钮禁用且无法提交
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-004-003 [P0] 无可用产品时确定按钮禁用且无法提交', async ({ authedPage }) => {
    await reportPage.closeDialog()

    await authedPage.route('**/base/products/queryForReportTemplate/XOME', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ retCode: 0, result: [] }),
        contentType: 'application/json',
      })
    })

    await reportPage.clickReportTypeCfgBtn()
    await expect(reportPage.dialog).toBeVisible()

    await expect(reportPage.dialogConfirmBtn).toBeDisabled()
    await expect(reportPage.dialog).toContainText('暂无可用数据')

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-004-003-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-004-004  P0
  // 保存请求体中只包含当前激活产品（DX2489）的配置，不含其他产品数据
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-004-004 [P0] 保存请求体只含当前激活产品DX2489的配置', async ({ authedPage }) => {
    let capturedRequestBody: Record<string, unknown> = {}

    // 拦截保存请求捕获请求体
    await authedPage.route('**/reportTypeConfigs/edit', async (route) => {
      const postData = route.request().postData()
      if (postData) {
        try {
          capturedRequestBody = JSON.parse(postData)
        } catch {
          capturedRequestBody = { raw: postData }
        }
      }
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ retCode: 0, message: '保存成功' }),
        contentType: 'application/json',
      })
    })

    // 加载 DX2489
    await reportPage.selectProduct('DX2489')
    await reportPage.clickTab('ExonCNV')
    await reportPage.clickCheckbox('主要')
    await reportPage.clickCheckbox('ACMG')

    // 加载 DX2490 并进行本地编辑（不保存）
    try {
      await reportPage.selectProduct('DX2490')
      await reportPage.clickTab('LargeCNV')
      await reportPage.clickCheckbox('正式')
    } catch {
      // 若 DX2490 不存在则跳过此步
    }

    // 切回 DX2489
    await reportPage.selectProduct('DX2489')

    // 点击确定
    await reportPage.dialogConfirmBtn.click()
    await authedPage.waitForTimeout(2000)

    console.log('保存请求体:', JSON.stringify(capturedRequestBody, null, 2))

    // 验证请求体中 productNo 为 DX2489
    expect(capturedRequestBody.productNo).toBe('DX2489')

    // 验证请求体中不含 DX2490 相关数据
    const bodyStr = JSON.stringify(capturedRequestBody)
    expect(bodyStr).not.toContain('DX2490')

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-004-004-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-004-005  P0
  // 保存接口失败时弹窗保持打开，显示错误提示，勾选状态保留
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-004-005 [P0] 保存失败时弹窗保持打开且勾选状态保留', async ({ authedPage }) => {
    // Mock 保存接口返回失败
    await authedPage.route('**/reportTypeConfigs/edit', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ retCode: -1, retInfo: '服务器内部错误' }),
        contentType: 'application/json',
      })
    })

    await reportPage.selectProduct('DX2489')
    await reportPage.clickTab('ExonCNV')
    if (!(await reportPage.isCheckboxChecked('主要'))) {
      await reportPage.clickCheckbox('主要')
    }

    // 点击确定
    await reportPage.dialogConfirmBtn.click()
    await authedPage.waitForTimeout(1000)

    // 弹窗保持打开
    await expect(reportPage.dialog).toBeVisible()

    // 显示错误提示
    const errMsg = authedPage.locator(
      '.el-message--error, .el-notification--error, [class*="error"]'
    ).first()
    await expect(errMsg).toBeVisible({ timeout: 5_000 })

    // 已勾选状态保留
    await reportPage.clickTab('ExonCNV')
    const isStillChecked = await reportPage.isCheckboxChecked('主要')
    expect(isStillChecked).toBe(true)

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-004-005-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-004-006  P1
  // 保存中快速双击确定，不产生第二次请求
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-004-006 [P1] 保存中快速双击确定不产生第二次请求', async ({ authedPage }) => {
    let saveRequestCount = 0

    // 模拟慢速保存接口
    await authedPage.route('**/reportTypeConfigs/edit', async (route) => {
      saveRequestCount++
      await authedPage.waitForTimeout(2000) // 慢响应
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ retCode: 0, message: '保存成功' }),
        contentType: 'application/json',
      })
    })

    await reportPage.selectProduct('DX2489')
    await reportPage.clickTab('ExonCNV')
    await reportPage.clickCheckbox('主要')

    // 第一次点击
    await reportPage.dialogConfirmBtn.click()

    // 立即再次点击（模拟快速双击）
    await authedPage.waitForTimeout(100)
    try {
      await reportPage.dialogConfirmBtn.click()
    } catch {
      // 按钮可能已禁用，点击失败，属于正常
    }

    // 等待请求完成
    await authedPage.waitForTimeout(3000)

    // 只应发出 1 次保存请求
    expect(saveRequestCount).toBe(1)

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-004-006-pass.png',
    })
  })
})
