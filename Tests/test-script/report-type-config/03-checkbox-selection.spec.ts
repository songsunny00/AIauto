import { test, expect } from './fixtures/auth'
import { ReportConfigPage } from './helpers/page-objects'

/**
 * 功能用例 3.3：位点类型报告类别勾选
 * 需求编号：REQ-CONFIG-REPORTCFG-TYPECFG-003
 * 测试账号：shl / @admin123（报告配置维护人员）
 */

/** 各位点类型 Tab 名称与期望的报告类别选项 */
const TAB_CHECKBOX_MAP: Record<string, string[]> = {
  'ExonCNV/SNV': ['主要', '次要', 'ACMG', '附加', '附表', '夫妻联合筛查', '罕见病表一', '罕见病表二', '罕见病表三'],
  LargeCNV: ['正式', '附加', '罕见病表一', '罕见病表二', '罕见病表三'],
  LOH: ['附加', '罕见病表一', '罕见病表二', '罕见病表三'],
  MT: ['正式', '附加', 'MT表一', 'MT表二'],
  STR: ['附加', 'STR表一', 'STR表二'],
  '地贫CNV': ['附加'],
  SV: ['附加', '罕见病表一', '罕见病表二', '罕见病表三'],
}

/** Tab 显示名称（页面上可能带空格或略有差异，做模糊匹配） */
const TAB_NAMES = ['ExonCNV', 'LargeCNV', 'LOH', 'MT', 'STR', '地贫', 'SV']

test.describe('FT-003 位点类型报告类别勾选（REQ-CONFIG-REPORTCFG-TYPECFG-003）', () => {
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
  // FT-CONFIG-REPORTCFG-TYPECFG-003-001  P0
  // 7 个位点类型 Tab 全部可正常切换
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-003-001 [P0] 7个位点类型Tab均可正常切换', async ({ authedPage }) => {
    const failedTabs: string[] = []

    for (const tabKeyword of TAB_NAMES) {
      try {
        await reportPage.clickTab(tabKeyword)
        // 验证 Tab 内容区域有复选框
        const checkboxes = reportPage.dialog.locator('.el-checkbox')
        const count = await checkboxes.count()
        if (count === 0) {
          failedTabs.push(`${tabKeyword} - 无复选框`)
        }
      } catch (e) {
        failedTabs.push(`${tabKeyword} - 切换失败: ${e}`)
      }
    }

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-003-001-pass.png',
    })

    expect(failedTabs, `以下Tab切换失败：${failedTabs.join(', ')}`).toHaveLength(0)
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-003-002  P0
  // ExonCNV/SNV Tab 仅显示 9 项报告类别
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-003-002 [P0] ExonCNV/SNV Tab显示且仅显示9项报告类别', async ({ authedPage }) => {
    await reportPage.clickTab('ExonCNV')

    const labels = await reportPage.getCheckboxLabels()
    console.log('ExonCNV/SNV 实际复选框:', labels)

    const expectedItems = TAB_CHECKBOX_MAP['ExonCNV/SNV']

    // 验证数量为 9
    expect(labels.length).toBe(expectedItems.length)

    // 验证每个期望项都存在
    for (const item of expectedItems) {
      const found = labels.some((l) => l.includes(item))
      expect(found, `ExonCNV/SNV 下缺少"${item}"`).toBe(true)
    }

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-003-002-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-003-003  P1
  // LargeCNV Tab 仅显示 5 项
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-003-003 [P1] LargeCNV Tab显示且仅显示5项报告类别', async ({ authedPage }) => {
    await reportPage.clickTab('LargeCNV')

    const labels = await reportPage.getCheckboxLabels()
    console.log('LargeCNV 实际复选框:', labels)

    const expectedItems = TAB_CHECKBOX_MAP['LargeCNV']
    expect(labels.length).toBe(expectedItems.length)

    for (const item of expectedItems) {
      const found = labels.some((l) => l.includes(item))
      expect(found, `LargeCNV 下缺少"${item}"`).toBe(true)
    }

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-003-003-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-003-004  P1
  // LOH Tab 仅显示 4 项
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-003-004 [P1] LOH Tab显示且仅显示4项报告类别', async ({ authedPage }) => {
    await reportPage.clickTab('LOH')

    const labels = await reportPage.getCheckboxLabels()
    console.log('LOH 实际复选框:', labels)

    const expectedItems = TAB_CHECKBOX_MAP['LOH']
    expect(labels.length).toBe(expectedItems.length)

    for (const item of expectedItems) {
      const found = labels.some((l) => l.includes(item))
      expect(found, `LOH 下缺少"${item}"`).toBe(true)
    }

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-003-004-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-003-005  P1
  // MT Tab 仅显示 4 项
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-003-005 [P1] MT Tab显示且仅显示4项报告类别', async ({ authedPage }) => {
    await reportPage.clickTab('MT')

    const labels = await reportPage.getCheckboxLabels()
    console.log('MT 实际复选框:', labels)

    const expectedItems = TAB_CHECKBOX_MAP['MT']
    expect(labels.length).toBe(expectedItems.length)

    for (const item of expectedItems) {
      const found = labels.some((l) => l.includes(item))
      expect(found, `MT 下缺少"${item}"`).toBe(true)
    }

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-003-005-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-003-006  P1
  // STR Tab 仅显示 3 项
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-003-006 [P1] STR Tab显示且仅显示3项报告类别', async ({ authedPage }) => {
    await reportPage.clickTab('STR')

    const labels = await reportPage.getCheckboxLabels()
    console.log('STR 实际复选框:', labels)

    const expectedItems = TAB_CHECKBOX_MAP['STR']
    expect(labels.length).toBe(expectedItems.length)

    for (const item of expectedItems) {
      const found = labels.some((l) => l.includes(item))
      expect(found, `STR 下缺少"${item}"`).toBe(true)
    }

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-003-006-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-003-007  P1
  // 地贫 CNV Tab 仅显示 1 项（附加）
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-003-007 [P1] 地贫CNV Tab显示且仅显示1项报告类别（附加）', async ({ authedPage }) => {
    await reportPage.clickTab('地贫')

    const labels = await reportPage.getCheckboxLabels()
    console.log('地贫CNV 实际复选框:', labels)

    expect(labels.length).toBe(1)
    expect(labels[0]).toContain('附加')

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-003-007-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-003-008  P1
  // SV Tab 仅显示 4 项
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-003-008 [P1] SV Tab显示且仅显示4项报告类别', async ({ authedPage }) => {
    await reportPage.clickTab('SV')

    const labels = await reportPage.getCheckboxLabels()
    console.log('SV 实际复选框:', labels)

    const expectedItems = TAB_CHECKBOX_MAP['SV']
    expect(labels.length).toBe(expectedItems.length)

    for (const item of expectedItems) {
      const found = labels.some((l) => l.includes(item))
      expect(found, `SV 下缺少"${item}"`).toBe(true)
    }

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-003-008-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-003-009  P0
  // 勾选"主要"后已选数量从 0 变为 1
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-003-009 [P0] 勾选复选框后已选数量实时更新', async ({ authedPage }) => {
    await reportPage.clickTab('ExonCNV')

    // 先取消所有选中（确保初始为 0 状态）
    const labels = await reportPage.getCheckboxLabels()
    for (const label of labels) {
      if (await reportPage.isCheckboxChecked(label)) {
        await reportPage.clickCheckbox(label)
      }
    }

    // 获取初始数量
    const countBefore = await reportPage.getSelectedCountText()
    expect(countBefore).toContain('0')

    // 勾选"主要"
    await reportPage.clickCheckbox('主要')
    await authedPage.waitForTimeout(300)

    // 验证"主要"已选中
    expect(await reportPage.isCheckboxChecked('主要')).toBe(true)

    // 验证数量变为 1
    const countAfter = await reportPage.getSelectedCountText()
    expect(countAfter).toContain('1')

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-003-009-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-003-010  P1
  // 取消勾选"主要"后数量变为 0
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-003-010 [P1] 取消勾选后已选数量减少', async ({ authedPage }) => {
    await reportPage.clickTab('ExonCNV')

    // 确保"主要"已选中
    const primaryChecked = await reportPage.isCheckboxChecked('主要')
    if (!primaryChecked) {
      await reportPage.clickCheckbox('主要')
    }

    // 取消其他选项，只保留"主要"
    const labels = await reportPage.getCheckboxLabels()
    for (const label of labels) {
      if (label !== '主要' && (await reportPage.isCheckboxChecked(label))) {
        await reportPage.clickCheckbox(label)
      }
    }

    // 此时应只有"主要"选中，数量=1
    const countBefore = await reportPage.getSelectedCountText()
    expect(countBefore).toContain('1')

    // 取消勾选"主要"
    await reportPage.clickCheckbox('主要')
    await authedPage.waitForTimeout(300)

    // 数量变为 0
    const countAfter = await reportPage.getSelectedCountText()
    expect(countAfter).toContain('0')

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-003-010-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-003-011  P0
  // Tab 切换不丢失本地草稿
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-003-011 [P0] Tab切换不丢失本地勾选草稿', async ({ authedPage }) => {
    await reportPage.clickTab('ExonCNV')

    // 确保"主要"未选中，然后勾选
    if (await reportPage.isCheckboxChecked('主要')) {
      await reportPage.clickCheckbox('主要')
    }
    await reportPage.clickCheckbox('主要')
    expect(await reportPage.isCheckboxChecked('主要')).toBe(true)

    // 切换到 LargeCNV Tab
    await reportPage.clickTab('LargeCNV')
    await authedPage.waitForTimeout(300)

    // 切回 ExonCNV Tab
    await reportPage.clickTab('ExonCNV')
    await authedPage.waitForTimeout(300)

    // 验证"主要"仍然选中
    expect(await reportPage.isCheckboxChecked('主要')).toBe(true)

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-003-011-pass.png',
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  // FT-CONFIG-REPORTCFG-TYPECFG-003-012  P2
  // 所有位点类型均不勾选时可正常提交（空配置合法）
  // ──────────────────────────────────────────────────────────────────────────────
  test('FT-003-012 [P2] 全部不勾选时可正常提交空配置', async ({ authedPage }) => {
    // 清空所有 Tab 的勾选
    for (const tabKeyword of TAB_NAMES) {
      try {
        await reportPage.clickTab(tabKeyword)
        const labels = await reportPage.getCheckboxLabels()
        for (const label of labels) {
          if (await reportPage.isCheckboxChecked(label)) {
            await reportPage.clickCheckbox(label)
          }
        }
      } catch {
        // Tab 切换失败时跳过
      }
    }

    // 监听保存请求
    let saveRequestMade = false
    authedPage.on('request', (req) => {
      if (req.url().includes('reportTypeConfigs/edit') && req.method() === 'POST') {
        saveRequestMade = true
      }
    })

    // 点击确定
    await reportPage.dialogConfirmBtn.click()
    await authedPage.waitForTimeout(2000)

    // 应该发出了保存请求（而不是被前端拦截阻止）
    expect(saveRequestMade).toBe(true)

    await authedPage.screenshot({
      path: 'test-reports/report-type-config/artifacts/FT-003-012-pass.png',
    })
  })
})
