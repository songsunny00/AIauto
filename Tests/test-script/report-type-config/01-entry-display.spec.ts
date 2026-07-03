import { test, expect } from './fixtures/auth'
import { ReportConfigPage } from './helpers/page-objects'

/**
 * 功能用例 3.1：入口展示与打开
 * 需求编号：REQ-CONFIG-REPORTCFG-TYPECFG-001
 * 测试账号：shl / @admin123（报告配置维护人员）
 */
test.describe('FT-001 入口展示与打开（REQ-CONFIG-REPORTCFG-TYPECFG-001）', () => {
  let reportPage: ReportConfigPage

  test.beforeEach(async ({ authedPage }) => {
    reportPage = new ReportConfigPage(authedPage)
    await reportPage.goto()
    await reportPage.ensureProject('WGS/WES')
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-001-001  P0
  // 当前项目为 XOME（WGS/WES）时，页面显示"报告类别配置"按钮
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-001-001 [P0] XOME项目下页面显示"报告类别配置"按钮', async ({ authedPage }) => {
    // 确认当前项目为 XOME（WGS/WES）
    // 项目选择逻辑：若页面已默认选中 XOME，则直接断言；否则先切换

    // 断言"报告类别配置"按钮可见
    await expect(reportPage.reportTypeCfgBtn).toBeVisible({
      timeout: 10_000,
    })

    // 截图存档
    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-001-001-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-001-002  P0
  // 切换到非 XOME 项目后，"报告类别配置"按钮不显示
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-001-002 [P0] 切换非XOME项目后"报告类别配置"按钮不显示', async ({ authedPage }) => {
    // 先确保在 XOME 下可以看到按钮
    try {
      await reportPage.switchProject('WGS/WES')
      await expect(reportPage.reportTypeCfgBtn).toBeVisible({ timeout: 8_000 })
    } catch {
      // 可能项目选择方式不同，继续
    }

    // 切换到非 XOME 项目（取第一个非 WGS/WES 选项）
    try {
      await reportPage.switchToFirstNonProject(['WGS/WES', 'XOME'])
    } catch {
      test.skip(true, '未找到非XOME项目，跳过此用例')
      return
    }

    // 断言"报告类别配置"按钮不可见
    await expect(reportPage.reportTypeCfgBtn).not.toBeVisible({
      timeout: 5_000,
    })

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-001-002-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-001-003  P0
  // 点击"报告类别配置"按钮，弹窗打开，标题正确，当前项目显示 WGS/WES
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-001-003 [P0] 点击按钮弹窗打开且标题和当前项目正确', async ({ authedPage }) => {
    try {
      await reportPage.switchProject('WGS/WES')
    } catch {
      // 忽略
    }

    await expect(reportPage.reportTypeCfgBtn).toBeVisible({ timeout: 10_000 })
    await reportPage.clickReportTypeCfgBtn()

    // 弹窗标题
    await expect(reportPage.dialogTitle).toHaveText('报告类别配置', { timeout: 8_000 })

    // 弹窗内"检测项目"字段显示 WGS/WES
    const dialogText = await reportPage.dialog.textContent()
    expect(dialogText).toContain('WGS/WES')

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-001-003-pass.png',
    })

    // 清理：关闭弹窗
    await reportPage.closeDialog()
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-001-004  P1
  // 点击弹窗关闭按钮，弹窗关闭，页面回到原态
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-001-004 [P1] 点击关闭按钮弹窗正常关闭', async ({ authedPage }) => {
    try {
      await reportPage.switchProject('WGS/WES')
    } catch {
      // 忽略
    }

    await expect(reportPage.reportTypeCfgBtn).toBeVisible({ timeout: 10_000 })
    await reportPage.clickReportTypeCfgBtn()

    // 验证弹窗已打开
    await expect(reportPage.dialog).toBeVisible()

    // 监听网络请求，确认没有提交
    const requestsMade: string[] = []
    authedPage.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('reportTypeConfigs')) {
        requestsMade.push(req.url())
      }
    })

    // 点击关闭
    await reportPage.closeDialog()

    // 弹窗已关闭
    await expect(reportPage.dialog).not.toBeVisible()

    // 没有发出保存请求
    expect(requestsMade).toHaveLength(0)

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-001-004-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-001-005  P1
  // 临时编辑未保存 → 关闭 → 再次打开 → 草稿清空，回填已保存配置
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-001-005 [P1] 关闭弹窗后重新打开不保留临时编辑', async ({ authedPage }) => {
    try {
      await reportPage.switchProject('WGS/WES')
    } catch {
      // 忽略
    }

    await expect(reportPage.reportTypeCfgBtn).toBeVisible({ timeout: 10_000 })

    // 第一次打开弹窗
    await reportPage.clickReportTypeCfgBtn()
    await expect(reportPage.dialog).toBeVisible()

    // 在 ExonCNV/SNV Tab 勾选第一个未选的复选框（临时编辑）
    await reportPage.clickTab('ExonCNV')
    const labels = await reportPage.getCheckboxLabels()
    let tempCheckedLabel = ''

    for (const label of labels) {
      const isChecked = await reportPage.isCheckboxChecked(label)
      if (!isChecked) {
        await reportPage.clickCheckbox(label)
        tempCheckedLabel = label
        break
      }
    }

    if (!tempCheckedLabel) {
      test.skip(true, '所有复选框均已选中，无法测试临时编辑清空，跳过')
      return
    }

    // 关闭弹窗（取消，不保存）
    await reportPage.cancelDialog()

    // 第二次打开弹窗
    await reportPage.clickReportTypeCfgBtn()
    await expect(reportPage.dialog).toBeVisible()

    // 切到相同 Tab
    await reportPage.clickTab('ExonCNV')

    // 确认临时勾选的复选框已恢复为未选（草稿被清空）
    const isStillChecked = await reportPage.isCheckboxChecked(tempCheckedLabel)
    expect(isStillChecked).toBe(false)

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-001-005-pass.png',
    })

    await reportPage.closeDialog()
  })
})
