import { Page, Locator, expect } from "@playwright/test";

/**
 * 付费配额配置页面 Page Object
 * 对应路由：/config/billingConfig
 *
 * 选择器策略：data-testid 优先，CSS class / 文本兜底（应对未确认的 DOM 结构）
 */
export class BillingConfigPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ─── 页面导航 ────────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto("/config/billingConfig", {
      waitUntil: "domcontentloaded",
    });
    await expect(this.searchInstCode).toBeVisible({ timeout: 15_000 });

    await this.tableRows
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(async () => {
        await this.page
          .locator(".el-table__empty-block:visible, .el-empty:visible")
          .first()
          .waitFor({ state: "visible", timeout: 10_000 });
      });
  }

  // ─── 查询区 ──────────────────────────────────────────────────────────────

  get searchArea(): Locator {
    return this.searchInstCode.locator(
      "xpath=ancestor::div[contains(@class,'el-form')][1]",
    );
  }

  get searchInstCode(): Locator {
    return this.page.getByTestId("billing-search-inst-code");
  }

  get searchProjectCode(): Locator {
    return this.page.getByTestId("billing-search-project-code");
  }

  get searchProductNo(): Locator {
    return this.page.getByTestId("billing-search-product-no");
  }

  get searchStatus(): Locator {
    return this.page.getByTestId("billing-search-status");
  }

  get searchKeyword(): Locator {
    return this.page.getByTestId("billing-search-keyword");
  }

  get searchBtn(): Locator {
    return this.page.locator('button:has-text("查询")').first();
  }

  get resetBtn(): Locator {
    return this.page.locator('button:has-text("重置")').first();
  }

  /** 获取当前可见的下拉面板（Element Plus 渲染所有下拉到 DOM，只有 :visible 是打开的） */
  private getVisibleDropdown(): Locator {
    return this.page.locator(".el-select-dropdown:visible").last();
  }

  /** 点击 el-select 打开下拉面板（点击内部 wrapper 而非外层 div） */
  private async clickSelect(select: Locator) {
    const inner = select
      .locator(".el-select__wrapper, .el-select__inner, input")
      .first();
    await inner.click({ timeout: 10_000 }).catch(async () => {
      await select.click({ force: true });
    });
    await this.page.waitForTimeout(200);
  }

  /** 在 el-select 多选中选择指定选项（支持多选） */
  async selectMultiOptions(select: Locator, optionTexts: string[]) {
    await this.clickSelect(select);
    const dropdown = this.getVisibleDropdown();
    await dropdown.waitFor({ state: "visible", timeout: 5_000 });

    for (const text of optionTexts) {
      const option = dropdown
        .locator(".el-select-dropdown__item:not(.is-disabled)")
        .filter({ hasText: text });
      await option
        .first()
        .click({ timeout: 3_000 })
        .catch(() => {});
    }
    await this.page.keyboard.press("Escape");
  }

  /** 在 el-select 单选中选择指定选项 */
  async selectSingleOption(select: Locator, optionText: string) {
    await this.clickSelect(select);
    const dropdown = this.getVisibleDropdown();
    await dropdown.waitFor({ state: "visible", timeout: 5_000 });

    const option = dropdown
      .locator(".el-select-dropdown__item:not(.is-disabled)")
      .filter({ hasText: optionText });
    await option.first().click({ timeout: 5_000 });
  }

  /** 执行查询 */
  async search() {
    await this.searchBtn.click({ force: true });
    await this.page.waitForLoadState("networkidle");
  }

  /** 重置查询 */
  async reset() {
    await this.resetBtn.click({ force: true });
    await this.page.waitForLoadState("networkidle");
  }

  // ─── 主列表操作区 ─────────────────────────────────────────────────────

  get addTenantBtn(): Locator {
    return this.page.getByTestId("billing-add-tenant-btn");
  }

  getRowEditBtn(index: number): Locator {
    return this.tableRows.nth(index).getByRole("button", { name: "编辑" });
  }

  getRowDetailBtn(index: number): Locator {
    return this.tableRows.nth(index).getByRole("button", { name: "明细" });
  }

  getRowToggleBtn(index: number): Locator {
    return this.tableRows
      .nth(index)
      .getByRole("button", { name: /启用|禁用/ });
  }

  get expandTable(): Locator {
    return this.page
      .locator(
        '[data-testid="billing-expand-table"]:visible, .el-table__expanded-cell .el-table:visible',
      )
      .first();
  }

  /** 获取主表行 */
  get tableRows(): Locator {
    return this.page.locator(".el-table__body-wrapper .el-table__row:visible");
  }

  async getRowCount(): Promise<number> {
    return this.tableRows.count();
  }

  /** 获取展开按钮 */
  getExpandToggleBtn(index: number): Locator {
    return this.tableRows
      .nth(index)
      .getByRole("button", { name: /展开当前行|收起当前行/ });
  }

  async expandRow(index: number) {
    const btn = this.getExpandToggleBtn(index);
    const targetCount = (await this.expandTable.count()) > 0 ? 0 : 1;

    await btn.waitFor({ state: "visible", timeout: 5_000 });
    await btn.click({ force: true });

    await expect
      .poll(async () => this.expandTable.count(), { timeout: 5_000 })
      .toBe(targetCount)
      .catch(async () => {
        await btn.click({ force: true });
        await expect.poll(async () => this.expandTable.count(), { timeout: 10_000 }).toBe(targetCount);
      });

    await this.page.waitForLoadState("networkidle");
  }

  // ─── 新增/编辑弹窗 ───────────────────────────────────────────────────

  get editDialog(): Locator {
    return this.page
      .locator('[data-testid="billing-edit-dialog"]:visible, .el-dialog:visible')
      .first();
  }

  get orgNameSelect(): Locator {
    return this.editDialog.getByRole("combobox", { name: /机构名称/ });
  }

  get contractNoInput(): Locator {
    return this.editDialog.getByRole("textbox", { name: /合同编号/ });
  }

  get contractRangeStartInput(): Locator {
    return this.editDialog.getByRole("combobox", { name: /合同周期/ });
  }

  get contractRangeEndInput(): Locator {
    return this.editDialog.getByRole("combobox", { name: /结束日期/ });
  }

  get storageDaysInput(): Locator {
    return this.editDialog.getByRole("textbox", { name: /数据存储期限/ });
  }

  get downloadTimesInput(): Locator {
    return this.editDialog.getByRole("textbox", { name: "文件下载次数" });
  }

  get totalQuotaInput(): Locator {
    return this.editDialog.getByRole("textbox", { name: "样本分析总次数" });
  }

  get addRowBtn(): Locator {
    return this.editDialog.getByRole("button", { name: "添加一行" });
  }

  getQuotaProjectCascader(index: number): Locator {
    return this.editDialog
      .getByTestId(`billing-quota-project-cascader-${index}`)
      .or(this.editDialog.locator(".el-cascader").nth(index));
  }

  getQuotaInput(index: number): Locator {
    return this.editDialog
      .getByTestId(`billing-quota-input-${index}`)
      .or(this.editDialog.locator('[data-testid^="billing-quota-input-"]').nth(index));
  }

  getRemoveRowBtn(index: number): Locator {
    return this.editDialog
      .getByTestId(`billing-remove-row-btn-${index}`)
      .or(this.editDialog.locator('button:has-text("删除")').nth(index));
  }

  get cancelBtn(): Locator {
    return this.editDialog.getByRole("button", { name: "取消" });
  }

  get confirmBtn(): Locator {
    return this.editDialog.getByRole("button", { name: "确定" });
  }

  /** 等待弹窗就绪 */
  async waitForDialogReady() {
    await this.editDialog.waitFor({ state: "visible", timeout: 10_000 });
    await expect(this.editDialog.locator(".el-loading-mask")).toHaveCount(0, {
      timeout: 10_000,
    });
  }

  /** 打开新增弹窗 */
  async openCreateDialog() {
    await this.addTenantBtn.click({ force: true });
    await this.waitForDialogReady();
  }

  /** 打开编辑弹窗 */
  async openEditDialog(rowId: number) {
    const btn = this.getRowEditBtn(rowId);
    await btn.waitFor({ state: "visible", timeout: 5_000 });
    await btn.click({ force: true });
    await this.editDialog.waitFor({ state: "visible", timeout: 5_000 }).catch(async () => {
      await btn.click({ force: true });
      await this.editDialog.waitFor({ state: "visible", timeout: 10_000 });
    });
    await expect(this.editDialog.locator(".el-loading-mask")).toHaveCount(0, {
      timeout: 10_000,
    });
  }

  /** 填写基础信息 */
  async fillBasicInfo(data: {
    orgName?: string;
    contractNo?: string;
    dateRange?: [string, string]; // 合同周期，格式 YYYY-MM-DD HH:mm:ss（精确到时分秒）
    storageDays?: number;
  }) {
    if (data.orgName) {
      await this.selectSingleOption(this.orgNameSelect, data.orgName);
    }
    if (data.contractNo !== undefined) {
      await this.contractNoInput.fill(data.contractNo);
    }
    if (data.dateRange) {
      await this.contractRangeStartInput.click({ force: true });
      await this.page.waitForTimeout(300);
      await this.contractRangeStartInput.fill(data.dateRange[0]);
      await this.contractRangeEndInput.fill(data.dateRange[1]);
      await this.contractRangeEndInput.press("Enter");
    }
    if (data.storageDays !== undefined) {
      await this.storageDaysInput.fill(String(data.storageDays));
      await this.storageDaysInput.press("Tab");
    }
  }

  /** 添加配额行 */
  async addQuotaRow() {
    await this.addRowBtn.click({ force: true });
  }

  /** 填写配额行（级联选择项目套餐 + 填写配额） */
  async fillQuotaRow(
    index: number,
    selections: [string, string][],
    quota: number,
  ) {
    const cascader = this.getQuotaProjectCascader(index);
    await cascader.click({ force: true });
    await this.page.waitForTimeout(300);

    for (const [project, product] of selections) {
      const firstPanel = this.page.locator(".el-cascader-menu:visible").first();
      const projectOption = firstPanel
        .locator(".el-cascader-node")
        .filter({ hasText: project })
        .first();
      await projectOption.click({ force: true });
      await this.page.waitForTimeout(300);

      const secondPanel = this.page.locator(".el-cascader-menu:visible").last();
      await secondPanel.waitFor({ state: "visible", timeout: 5_000 });

      const preferredProductOption = secondPanel
        .locator(".el-cascader-node")
        .filter({ hasText: product })
        .first();
      const productOption =
        (await preferredProductOption.count()) > 0
          ? preferredProductOption
          : secondPanel.locator(".el-cascader-node").first();

      await productOption.click({ force: true });
      await this.page.waitForTimeout(200);
    }

    await this.page.keyboard.press("Escape");
    await this.getQuotaInput(index).fill(String(quota));
    await this.getQuotaInput(index).press("Tab");
  }

  /** 删除配额行 */
  async removeQuotaRow(index: number) {
    await this.getRemoveRowBtn(index).click({ force: true });
  }

  /** 提交表单 */
  async submitForm() {
    await expect(this.confirmBtn).toBeVisible();
    await expect(this.confirmBtn).toBeEnabled();
    await this.confirmBtn.click();
  }

  /** 取消表单 */
  async cancelForm() {
    await this.cancelBtn.click({ force: true });
    await this.editDialog.waitFor({ state: "hidden", timeout: 5_000 });
  }

  /** 关闭弹窗 */
  async closeDialog() {
    const closeBtn = this.editDialog.locator(".el-dialog__headerbtn");
    if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeBtn.click({ force: true });
    } else {
      await this.page.keyboard.press("Escape");
    }
    await this.editDialog.waitFor({ state: "hidden", timeout: 5_000 });
  }

  // ─── 明细抽屉 ───────────────────────────────────────────────────────

  get detailDrawer(): Locator {
    return this.page
      .locator('[data-testid="billing-detail-drawer"]:visible, .el-drawer:visible')
      .first();
  }

  get detailCloseBtn(): Locator {
    return this.detailDrawer.getByTestId("billing-detail-close-btn");
  }

  get summaryBar(): Locator {
    return this.detailDrawer
      .locator(".summary-bar, .detail-summary, [class*='summary']")
      .first();
  }

  get usageTable(): Locator {
    return this.detailDrawer.locator(".el-table").first();
  }

  get historyTable(): Locator {
    return this.detailDrawer.locator(".el-table").nth(1);
  }

  /** 打开明细抽屉 */
  async openDetailDrawer(rowId: number) {
    const btn = this.getRowDetailBtn(rowId);
    await btn.waitFor({ state: "visible", timeout: 5_000 });
    await btn.click({ force: true });
    await this.detailDrawer.waitFor({ state: "visible", timeout: 5_000 }).catch(async () => {
      await btn.click({ force: true });
      await this.detailDrawer.waitFor({ state: "visible", timeout: 10_000 });
    });
    await expect(this.detailDrawer.locator(".el-loading-mask")).toHaveCount(0, {
      timeout: 10_000,
    });
  }

  /** 关闭明细抽屉 */
  async closeDetail() {
    // 策略1：点击 header 关闭按钮（aria-label="关闭此对话框"）
    const headerClose = this.detailDrawer.locator(
      'button[aria-label*="关闭"], .el-drawer__headerbtn, .el-drawer__close-btn',
    );
    if (
      await headerClose
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await headerClose.first().click({ force: true });
    } else {
      // 策略2：点击底部"关闭"按钮
      const bottomClose = this.detailDrawer
        .locator('button:has-text("关闭")')
        .last();
      if (await bottomClose.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await bottomClose.click({ force: true });
      } else {
        // 策略3：Escape 键
        await this.page.keyboard.press("Escape");
      }
    }
    await this.detailDrawer.waitFor({ state: "hidden", timeout: 5_000 });
  }

  // ─── 状态启停 ───────────────────────────────────────────────────────

  /** 点击启用/禁用按钮 */
  async clickToggleBtn(rowId: number) {
    await this.getRowToggleBtn(rowId).click({ force: true });
  }

  /** 确认启停操作 */
  async confirmToggle() {
    const confirmBtn = this.page
      .locator(
        '.el-message-box button:has-text("确定"), .el-message-box .el-button--primary',
      )
      .first();
    await confirmBtn.waitFor({ state: "visible", timeout: 5_000 });
    await confirmBtn.click({ force: true });
    await this.page.waitForLoadState("networkidle");
  }

  /** 取消启停操作 */
  async cancelToggle() {
    const cancelBtn = this.page
      .locator(
        '.el-message-box button:has-text("取消"), .el-message-box .el-button--default',
      )
      .first();
    await cancelBtn.waitFor({ state: "visible", timeout: 5_000 });
    await cancelBtn.click({ force: true });
  }

  // ─── 通用断言辅助 ───────────────────────────────────────────────────

  /** 等待提示消息出现 */
  async expectToast(text: string) {
    const toast = this.page
      .locator(".el-message:visible")
      .filter({ hasText: text });
    await expect(toast).toBeVisible({ timeout: 5_000 });
  }

  /** 获取状态标签文本 */
  async getRowStatusText(rowId: number): Promise<string> {
    const row = this.tableRows.nth(rowId);
    const tag = row.locator(".el-tag").first();
    return ((await tag.textContent()) || "").trim();
  }

  async getRowOrgName(rowId: number): Promise<string> {
    const row = this.tableRows.nth(rowId);
    return ((await row.locator(".el-table__cell").nth(2).textContent()) || "").trim();
  }

  async getRowContractNo(rowId: number): Promise<string> {
    const row = this.tableRows.nth(rowId);
    return ((await row.locator(".el-table__cell").nth(7).textContent()) || "").trim();
  }

  /** 获取状态标签类型 */
  async getRowStatusType(rowId: number): Promise<string> {
    const row = this.tableRows.nth(rowId);
    const tag = row.locator(".el-tag").first();
    const className = await tag.getAttribute("class");
    if (className?.includes("el-tag--success")) return "success";
    if (className?.includes("el-tag--warning")) return "warning";
    if (className?.includes("el-tag--info")) return "info";
    if (className?.includes("el-tag--danger")) return "danger";
    return "";
  }
}
