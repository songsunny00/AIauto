import { Page, Locator, expect } from '@playwright/test'

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 报告配置页面 Page Object
 * 封装页面元素定位与常用操作
 */
export class ReportConfigPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  // ─── 页面导航 ────────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/config/reportConfig', { waitUntil: 'networkidle' })
    await expect(this.searchHeader).toBeVisible({ timeout: 10_000 })
  }

  // ─── 项目选择 ────────────────────────────────────────────────────────────────

  get searchHeader(): Locator {
    return this.page.locator('.search-header').first()
  }

  get searchForm(): Locator {
    return this.searchHeader.locator('.top-search').first()
  }

  get projectFormItem(): Locator {
    return this.searchForm.locator('.el-form-item').first()
  }

  /** 获取页面顶部项目选择器 */
  get projectSelector(): Locator {
    return this.projectFormItem.locator('.el-select').first()
  }

  async getSelectedProjectText(): Promise<string> {
    const input = this.projectFormItem.locator('input').first()
    if ((await input.count()) > 0) {
      const value = await input.inputValue().catch(() => '')
      if (value.trim()) return value.trim()
    }

    return ((await this.projectFormItem.textContent()) || '').replace(/\s+/g, ' ').trim()
  }

  /**
   * 切换到指定项目
   * @param projectText 项目显示名，如 "WGS/WES" 或非 XOME 项目名称
   */
  async switchProject(projectText: string) {
    const currentProject = await this.getSelectedProjectText()
    if (currentProject.includes(projectText)) {
      return
    }

    for (let cycle = 0; cycle < 2; cycle++) {
      for (let attempt = 0; attempt < 2; attempt++) {
        await this.projectSelector.click()
        const dropdown = this.page.locator('.el-select-dropdown:visible').last()
        const option = dropdown
          .locator('.el-select-dropdown__item:not(.is-disabled)')
          .filter({ hasText: projectText })
          .first()

        if ((await option.count()) > 0) {
          await option.click()
          await expect(this.projectFormItem).toContainText(projectText, { timeout: 10_000 })
          await this.page.waitForLoadState('networkidle')
          return
        }

        await this.page.keyboard.press('Escape')
        await this.page.waitForTimeout(300)
      }

      await this.page.reload({ waitUntil: 'networkidle' })
      await expect(this.searchHeader).toBeVisible({ timeout: 10_000 })
    }

    throw new Error(`未找到项目选项: ${projectText}`)
  }

  async ensureProject(projectText: string) {
    await this.switchProject(projectText)
    await expect(this.projectFormItem).toContainText(projectText, { timeout: 10_000 })
  }

  async switchToFirstNonProject(excludedTexts: string[]): Promise<string> {
    await this.projectSelector.click()
    const dropdown = this.page.locator('.el-select-dropdown:visible').last()
    const options = dropdown.locator('.el-select-dropdown__item:not(.is-disabled)')
    const count = await options.count()

    for (let i = 0; i < count; i++) {
      const text = ((await options.nth(i).textContent()) || '').trim()
      if (text && excludedTexts.every(excluded => !text.includes(excluded))) {
        await options.nth(i).click()
        await expect(this.projectFormItem).toContainText(text, { timeout: 10_000 })
        await this.page.waitForLoadState('networkidle')
        return text
      }
    }

    throw new Error(`未找到排除 ${excludedTexts.join(', ')} 后的项目选项`)
  }

  // ─── 报告类别配置入口按钮 ─────────────────────────────────────────────────────

  get reportTypeCfgBtn(): Locator {
    return this.page.locator('button:has-text("报告类别配置"), .el-button:has-text("报告类别配置")')
  }

  async clickReportTypeCfgBtn() {
    await this.reportTypeCfgBtn.click()
    await this.waitForDialogReady()
  }

  async waitForDialogReady() {
    await this.dialog.waitFor({ state: 'visible', timeout: 10_000 })
    await expect(this.dialog.locator('.el-loading-mask')).toHaveCount(0, { timeout: 10_000 })
  }

  // ─── 弹窗 ─────────────────────────────────────────────────────────────────────

  get dialog(): Locator {
    return this.page.locator('.el-dialog:has(.el-dialog__title:has-text("报告类别配置"))')
  }

  get dialogTitle(): Locator {
    return this.dialog.locator('.el-dialog__title')
  }

  get dialogCloseBtn(): Locator {
    return this.dialog.locator('.el-dialog__headerbtn, button.el-dialog__headerbtn')
  }

  get dialogCancelBtn(): Locator {
    return this.dialog.locator('button:has-text("取消")')
  }

  get dialogConfirmBtn(): Locator {
    return this.dialog.locator('button:has-text("确定")')
  }

  /** 检测项目显示字段 */
  get currentProjectLabel(): Locator {
    return this.dialog.locator(':has-text("检测项目"), [class*="current-project"]')
  }

  // ─── 产品套餐下拉 ─────────────────────────────────────────────────────────────

  get productSelect(): Locator {
    return this.dialog.locator('.config-toolbar .el-select').first()
  }

  async getVisibleSelectDropdown(): Promise<Locator> {
    return this.page.locator('.el-select-dropdown:visible').last()
  }

  /** 选择产品套餐 */
  async selectProduct(productText: string) {
    const currentProduct = await this.getSelectedProduct()
    if (currentProduct.includes(productText)) {
      return
    }

    await this.productSelect.click()
    const dropdown = await this.getVisibleSelectDropdown()
    const option = dropdown.locator('.el-select-dropdown__item:not(.is-disabled)').filter({ hasText: productText }).first()
    await expect(option).toBeVisible({ timeout: 5_000 })
    await option.click()
    await this.page.waitForLoadState('networkidle')
  }

  async getProductOptions(): Promise<string[]> {
    await this.productSelect.click()
    const dropdown = await this.getVisibleSelectDropdown()
    const texts = await dropdown.locator('.el-select-dropdown__item:not(.is-disabled)').allTextContents()
    return texts.map(text => text.trim()).filter(Boolean)
  }

  /** 获取产品下拉当前已选项文本 */
  async getSelectedProduct(): Promise<string> {
    const input = this.productSelect.locator('input').first()
    if ((await input.count()) > 0) {
      const value = await input.inputValue().catch(() => '')
      if (value.trim()) return value.trim()
    }

    return ((await this.productSelect.textContent()) || '').replace(/\s+/g, ' ').trim()
  }

  // ─── 位点类型 Tab ─────────────────────────────────────────────────────────────

  /** 点击指定位点类型 Tab */
  async clickTab(tabText: string) {
    const exactTab = this.dialog.getByRole('tab', {
      name: new RegExp(`^${escapeRegExp(tabText)}$`),
    }).first()
    const tab = ((await exactTab.count()) > 0)
      ? exactTab
      : this.dialog.locator('.el-tabs__item, [role="tab"]').filter({ hasText: tabText }).first()

    await tab.click()

    await expect.poll(async () => await this.getActiveTabText(), {
      timeout: 5_000,
    }).toContain(tabText)
    await expect(this.activeTabPane).toBeVisible({ timeout: 5_000 })
  }

  /** 当前激活 Tab 文本 */
  async getActiveTabText(): Promise<string> {
    const activeTab = this.dialog.locator('.el-tabs__item.is-active, [role="tab"][aria-selected="true"]')
    return ((await activeTab.textContent()) || '').trim()
  }

  get activeTabPane(): Locator {
    return this.dialog.locator('.el-tab-pane:visible').first()
  }

  // ─── 复选框区域 ───────────────────────────────────────────────────────────────

  /** 获取当前 Tab 下的所有复选框标签文本 */
  async getCheckboxLabels(): Promise<string[]> {
    const labels = await this.activeTabPane.locator('.option-group .el-checkbox__label').allTextContents()
    return [...new Set(labels.map((label) => label.trim()).filter(Boolean))]
  }

  /** 点击指定标签的复选框 */
  async clickCheckbox(labelText: string) {
    const cb = this.activeTabPane.locator('.option-group .el-checkbox').filter({ hasText: labelText }).first()
    await cb.click()
  }

  /** 判断指定复选框是否选中 */
  async isCheckboxChecked(labelText: string): Promise<boolean> {
    const cb = this.activeTabPane.locator('.option-group .el-checkbox').filter({ hasText: labelText }).first()
    return cb.locator('input[type="checkbox"]').isChecked()
  }

  /** 获取"当前位点类型已选择"数量提示文本 */
  async getSelectedCountText(): Promise<string> {
    const el = this.activeTabPane.locator('.summary-count').first()
    return ((await el.textContent()) || '').trim()
  }

  // ─── 关闭弹窗 ─────────────────────────────────────────────────────────────────

  async closeDialog() {
    // 优先点关闭按钮，次之取消
    const closeBtn = this.dialogCloseBtn
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    } else {
      await this.dialogCancelBtn.click()
    }
    await this.dialog.waitFor({ state: 'hidden', timeout: 5_000 })
  }

  async cancelDialog() {
    await this.dialogCancelBtn.click()
    await this.dialog.waitFor({ state: 'hidden', timeout: 5_000 })
  }
}
