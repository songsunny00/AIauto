/**
 * billing-list.page.ts — 商业化计费配置 列表页面对象
 *
 * 覆盖用例：FT-BILLCFG-LIST-001~016、ET-LIST-001/011。
 *
 * 定位依据：Tests/playwright-cli-test/exploration/explore-testids-raw.json
 *   - 查询区 testid：billing-search-inst-code / -project-code / -product-no / -status / -keyword
 *   - 行操作 testid：billing-row-edit-btn-{i} / -detail-btn-{i} / -toggle-btn-{i}
 *   - 主操作 testid：billing-add-tenant-btn
 *
 * 避坑（Tests/playwright-cli-test/测试过程问题经验总结.md）：
 *   - §1.2 el-select placeholder 拦截 → 复用 helpers/element-plus 的 force click 方案
 *   - §5.2 列表固定列导致 td 索引偏移 → 复用 helpers/visibility 的 getCellText
 *   - §6.1 抽屉可见性用 isVisible() → 复用 helpers/visibility
 */
import type { Page, Locator } from "@playwright/test";
import {
  selectElOptionByText,
  selectElOptionByIndex,
  clearElSelect,
  confirmMessageBox,
  cancelMessageBox,
  isMessageBoxVisible,
  waitForMessageBox,
} from "../../../helpers/element-plus";
import { collectErrors } from "../../../helpers/errors";
import { waitForApi } from "../../../helpers/network";
import {
  isVisible,
  removeResidualOverlays,
  safeGoto,
  getCellText,
  LIST_COLUMN_INDEX,
  cellIndex,
} from "../../../helpers/visibility";
import { API_PATTERNS, EXISTING_DATA, TARGET_URL } from "../data/billing.data";
import {
  STATUS_TEXTS,
  STATUS_TAG_TYPE,
  BUTTON_TEXTS,
} from "../data/billing-texts";

/** 行操作按钮 testid 前缀（探索结果：edit/detail/toggle） */
const ROW_EDIT_PREFIX = "billing-row-edit-btn-";
const ROW_DETAIL_PREFIX = "billing-row-detail-btn-";
const ROW_TOGGLE_PREFIX = "billing-row-toggle-btn-";

export class BillingListPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ============================================================
  // 定位器（data-testid 优先）
  // ============================================================

  /** 新增计费方案按钮（FT-FORM-001 入口） */
  get addButton(): Locator {
    return this.page.locator(`[data-testid=billing-add-tenant-btn]`);
  }

  /** 机构名称查询选择器（多选，CSV 传递） */
  get searchOrg(): Locator {
    return this.page.locator("[data-testid=billing-search-inst-code]");
  }

  /** 检测项目查询选择器（多选，CSV 传递） */
  get searchProject(): Locator {
    return this.page.locator("[data-testid=billing-search-project-code]");
  }

  /** 产品套餐查询选择器（多选，CSV 传递） */
  get searchProduct(): Locator {
    return this.page.locator("[data-testid=billing-search-product-no]");
  }

  /** 合同状态查询选择器（单选） */
  get searchStatus(): Locator {
    return this.page.locator("[data-testid=billing-search-status]");
  }

  /** 合同编号查询输入框 */
  get searchKeywordInput(): Locator {
    return this.page.locator("[data-testid=billing-search-keyword]");
  }

  /** 查询按钮 */
  get searchButton(): Locator {
    return this.page.getByRole("button", { name: BUTTON_TEXTS.search });
  }

  /** 重置按钮 */
  get resetButton(): Locator {
    return this.page.getByRole("button", { name: BUTTON_TEXTS.reset });
  }

  /** 主表所有数据行 */
  get tableRows(): Locator {
    return this.page.locator(".el-table__row");
  }

  /** 主表表头单元格文本 */
  get headerCells(): Locator {
    return this.page.locator(".el-table__header th .cell");
  }

  // ============================================================
  // 通用导航与等待
  // ============================================================

  /**
   * 安全进入页面：goto + 清理残留遮罩 + 等首行可见。
   * 每个 spec/test 开头推荐调用（经验 §4.4）。
   */
  async goto(): Promise<void> {
    await safeGoto(this.page, TARGET_URL);
  }

  /** 等待列表加载完成（首行可见，不依赖 networkidle）。 */
  async waitForListLoaded(timeoutMs = 10_000): Promise<void> {
    await this.tableRows
      .first()
      .waitFor({ state: "visible", timeout: timeoutMs })
      .catch(() => {});
  }

  /** 等待分页查询接口响应（FT-LIST-002 组合筛选断言用）。 */
  async waitForPageApi(timeoutMs = 15_000) {
    return waitForApi(
      this.page,
      { url: API_PATTERNS.contractPage, method: "POST" },
      timeoutMs,
    );
  }

  /** 移除残留弹窗遮罩（经验 §4.4）。 */
  async cleanOverlays(): Promise<void> {
    await removeResidualOverlays(this.page);
  }

  // ============================================================
  // 查询区操作
  // ============================================================

  /**
   * 选择机构名称（按文案，多选）。
   * @param name 机构名称选项文案
   */
  async selectOrg(name: string): Promise<void> {
    await selectElOptionByText(this.page, "billing-search-inst-code", name);
  }

  /** 选择机构第一个选项（首轮探索回填 EXISTING_DATA 前的兼容用法）。 */
  async selectOrgByIndex(index = 0): Promise<void> {
    await selectElOptionByIndex(this.page, "billing-search-inst-code", index);
  }

  /** 选择检测项目（多选）。 */
  async selectProject(name: string): Promise<void> {
    await selectElOptionByText(this.page, "billing-search-project-code", name);
  }

  async selectProjectByIndex(index = 0): Promise<void> {
    await selectElOptionByIndex(
      this.page,
      "billing-search-project-code",
      index,
    );
  }

  /** 选择产品套餐（多选）。 */
  async selectProduct(name: string): Promise<void> {
    await selectElOptionByText(this.page, "billing-search-product-no", name);
  }

  /** 选择合同状态（单选）。 */
  async selectStatus(statusText: string): Promise<void> {
    await selectElOptionByText(this.page, "billing-search-status", statusText);
  }

  /** 输入合同编号片段。 */
  async inputKeyword(text: string): Promise<void> {
    await this.searchKeywordInput.fill(text);
  }

  /** 清空合同编号输入。 */
  async clearKeyword(): Promise<void> {
    await this.searchKeywordInput.fill("");
  }

  /** 点击查询按钮，并等待分页接口返回。 */
  async clickSearch(): Promise<void> {
    const respPromise = this.waitForPageApi();
    await this.searchButton.click();
    await respPromise.catch(() => {});
    await this.page.waitForTimeout(800);
  }

  /** 仅点击查询按钮（不等待接口，用于 ET 超时场景）。 */
  async clickSearchOnly(): Promise<void> {
    await this.searchButton.click();
  }

  /** 点击重置按钮。 */
  async clickReset(): Promise<void> {
    const respPromise = this.waitForPageApi();
    await this.resetButton.click();
    await respPromise.catch(() => {});
    await this.page.waitForTimeout(800);
  }

  /**
   * 读取查询区机构已选标签文案（多选以标签展示）。
   * 用于断言重置后条件清空（FT-LIST-003）。
   */
  async getSearchOrgTags(): Promise<string[]> {
    return this.searchOrg
      .locator(".el-tag__text, .el-select__tags-text")
      .allTextContents();
  }

  /** 读取合同状态选择器当前已选文案。 */
  async getSearchStatusText(): Promise<string> {
    return (await this.searchStatus.textContent())?.trim() || "";
  }

  /**
   * 读取产品套餐下拉选项文案列表（FT-LIST-016 联动验证）。
   * 需先点开下拉，读取可见下拉的选项，读完后按 Escape 关闭。
   */
  async getProductOptions(): Promise<string[]> {
    await this.searchProduct.click({ force: true });
    await this.page.waitForTimeout(800);
    const options = await this.page.evaluate(() => {
      const dropdowns = Array.from(
        document.querySelectorAll(".el-select-dropdown"),
      ).filter((d) => (d as HTMLElement).offsetParent !== null);
      if (dropdowns.length === 0) return [];
      return Array.from(
        dropdowns[0].querySelectorAll(".el-select-dropdown__item"),
      ).map((i) => i.textContent?.trim() || "");
    });
    await this.page.keyboard.press("Escape");
    await this.page.waitForTimeout(300);
    return options;
  }

  // ============================================================
  // 主表数据读取（注意展开列偏移，经验 §5.2）
  // ============================================================

  /** 主表数据行数。 */
  async rowCount(): Promise<number> {
    return this.tableRows.count();
  }

  /** 读取表头文案列表。 */
  async headers(): Promise<string[]> {
    const texts = await this.headerCells.allTextContents();
    return texts.map((t) => t.trim()).filter((t) => t);
  }

  /**
   * 读取指定行指定列文本（自动修正展开列偏移）。
   * @param rowIndex 行索引（0 起）
   * @param column 列名（见 LIST_COLUMN_INDEX）
   */
  async getCellText(
    rowIndex: number,
    column: keyof typeof LIST_COLUMN_INDEX,
  ): Promise<string> {
    return getCellText(this.page, rowIndex, column);
  }

  /** 读取指定行的合同状态文案。 */
  async getRowStatus(rowIndex: number): Promise<string> {
    return this.getCellText(rowIndex, "status");
  }

  /** 读取指定行的合同编号。 */
  async getRowContractNo(rowIndex: number): Promise<string> {
    return this.getCellText(rowIndex, "contractNo");
  }

  /** 读取指定行的检测项目文案。 */
  async getRowProjectCodes(rowIndex: number): Promise<string> {
    return this.getCellText(rowIndex, "projectCodes");
  }

  /**
   * 读取指定行状态标签的 Element Plus 类型（颜色语义）。
   * 通过标签 class 中的 el-tag--{type} 判定。
   * @returns 'success'|'warning'|'info'|'danger'|''
   */
  async getRowStatusTagType(rowIndex: number): Promise<string> {
    const tdIndex = cellIndex(LIST_COLUMN_INDEX.status);
    const tag = this.tableRows
      .nth(rowIndex)
      .locator("td")
      .nth(tdIndex)
      .locator(".el-tag");
    const cls = (await tag.getAttribute("class")) || "";
    const match = cls.match(/el-tag--(success|warning|info|danger|primary)/);
    return match ? match[1] : "";
  }

  // ============================================================
  // 行操作按钮
  // ============================================================

  /** 指定行的编辑按钮。 */
  editButton(rowIndex: number): Locator {
    return this.page.locator(`[data-testid=${ROW_EDIT_PREFIX}${rowIndex}]`);
  }

  /** 指定行的明细按钮。 */
  detailButton(rowIndex: number): Locator {
    return this.page.locator(`[data-testid=${ROW_DETAIL_PREFIX}${rowIndex}]`);
  }

  /** 指定行的启停按钮（禁用/启用）。 */
  toggleButton(rowIndex: number): Locator {
    return this.page.locator(`[data-testid=${ROW_TOGGLE_PREFIX}${rowIndex}]`);
  }

  /** 读取启停按钮文案（禁用/启用）。 */
  async getToggleButtonText(rowIndex: number): Promise<string> {
    return (await this.toggleButton(rowIndex).textContent())?.trim() || "";
  }

  /** 启停按钮是否禁用（已终止合同置灰，FT-LIST-013）。 */
  async isToggleDisabled(rowIndex: number): Promise<boolean> {
    const cls = (await this.toggleButton(rowIndex).getAttribute("class")) || "";
    return cls.includes("is-disabled");
  }

  /** 点击编辑按钮。 */
  async clickEdit(rowIndex: number): Promise<void> {
    await this.editButton(rowIndex).click();
    await this.page.waitForTimeout(1000);
  }

  /** 点击明细按钮。 */
  async clickDetail(rowIndex: number): Promise<void> {
    await this.detailButton(rowIndex).click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * 点击启停按钮并确认（FT-LIST-009/010）。
   * @param confirm true=确认，false=取消（FT-LIST-009 第2步）
   */
  async clickToggle(rowIndex: number, confirm = true): Promise<void> {
    await this.toggleButton(rowIndex).click();
    // 等待确认 MessageBox 可见再操作，解决点击后异步渲染时序问题（LIST-009/010）
    await waitForMessageBox(this.page, 5000);
    if (confirm) {
      await confirmMessageBox(this.page, BUTTON_TEXTS.confirm);
    } else {
      await cancelMessageBox(this.page);
    }
  }

  /** 仅点击启停按钮弹出确认框（不操作确认框）。 */
  async clickToggleOnly(rowIndex: number): Promise<void> {
    await this.toggleButton(rowIndex).click();
    // 等待确认 MessageBox 可见再返回，供 spec 断言 isMessageBoxVisible（LIST-009）
    await waitForMessageBox(this.page, 5000);
  }

  /** 确认 MessageBox 是否可见。 */
  async isConfirmBoxVisible(): Promise<boolean> {
    return isMessageBoxVisible(this.page);
  }

  // ============================================================
  // 展开明细区（FT-LIST-006/007/012/015）
  // 注意：展开区无 data-testid（探索结果 expandArea 为空），用 .el-table__expand-icon 兜底。
  // ============================================================

  /** 指定行的展开图标。 */
  expandIcon(rowIndex: number): Locator {
    return this.tableRows.nth(rowIndex).locator(".el-table__expand-icon");
  }

  /** 展开指定行。 */
  async expandRow(rowIndex: number): Promise<void> {
    const icon = this.expandIcon(rowIndex);
    if (
      !(await icon.getAttribute("class"))?.includes(
        "el-table__expand-icon--expanded",
      )
    ) {
      await icon.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /** 收起指定行。 */
  async collapseRow(rowIndex: number): Promise<void> {
    const icon = this.expandIcon(rowIndex);
    if (
      (await icon.getAttribute("class"))?.includes(
        "el-table__expand-icon--expanded",
      )
    ) {
      await icon.click();
      await this.page.waitForTimeout(800);
    }
  }

  /** 指定行是否已展开。 */
  async isRowExpanded(rowIndex: number): Promise<boolean> {
    const cls = (await this.expandIcon(rowIndex).getAttribute("class")) || "";
    return cls.includes("el-table__expand-icon--expanded");
  }

  /**
   * 读取展开区配额明细行数（FT-LIST-006/007）。
   * 展开区无 testid，用 .el-table__expanded-row 内的子表格行兜底。
   */
  async getExpandRowCount(rowIndex: number): Promise<number> {
    if (!(await this.isRowExpanded(rowIndex))) await this.expandRow(rowIndex);
    const expanded = this.page.locator(".el-table__expanded-row").nth(rowIndex);
    return expanded.locator(".el-table__row").count();
  }

  /**
   * 读取展开区首行各单元格文本（验证字段：序号/检测项目/产品套餐/配额/累计消耗/剩余）。
   */
  async getExpandRowCells(rowIndex: number): Promise<string[]> {
    if (!(await this.isRowExpanded(rowIndex))) await this.expandRow(rowIndex);
    const expanded = this.page.locator(".el-table__expanded-row").nth(rowIndex);
    const cells = await expanded
      .locator(".el-table__row")
      .first()
      .locator("td")
      .allTextContents();
    return cells.map((c) => c.trim());
  }

  // ============================================================
  // 分页控制（FT-LIST-011）
  // ============================================================

  /** 下一页按钮。 */
  get nextPageButton(): Locator {
    return this.page.locator(".el-pagination .btn-next");
  }

  /** 上一页按钮。 */
  get prevPageButton(): Locator {
    return this.page.locator(".el-pagination .btn-prev");
  }

  /** 每页条数选择器。 */
  get pageSizeSelect(): Locator {
    return this.page.locator(".el-pagination .el-pagination__sizes");
  }

  /** 点击下一页并等待接口。 */
  async nextPage(): Promise<void> {
    const resp = this.waitForPageApi();
    await this.nextPageButton.click();
    await resp.catch(() => {});
    await this.page.waitForTimeout(800);
  }

  /**
   * 切换每页条数（FT-LIST-011）。
   * @param size 目标条数文案（如 "20"）
   */
  async changePageSize(size: string): Promise<void> {
    await this.pageSizeSelect.click();
    await this.page.waitForTimeout(500);
    await this.page.evaluate((text) => {
      const dropdowns = Array.from(
        document.querySelectorAll(".el-select-dropdown"),
      ).filter((d) => (d as HTMLElement).offsetParent !== null);
      for (const d of dropdowns) {
        const items = d.querySelectorAll(".el-select-dropdown__item");
        for (const it of items) {
          if (it.textContent?.trim() === text) {
            (it as HTMLElement).click();
            return;
          }
        }
      }
    }, size);
    await this.waitForPageApi().catch(() => {});
    await this.page.waitForTimeout(800);
  }

  /** 读取分页总数文本（如 "共 60 条"）。 */
  async getTotalText(): Promise<string> {
    return (
      (
        await this.page.locator(".el-pagination__total").textContent()
      )?.trim() || ""
    );
  }

  /** 读取当前页码。 */
  async getCurrentPage(): Promise<string> {
    return (
      (
        await this.page.locator(".el-pager .number.active").textContent()
      )?.trim() || ""
    );
  }

  // ============================================================
  // 空状态与错误（FT-LIST-004、ET-LIST-001）
  // ============================================================

  /** 列表是否展示空状态（FT-LIST-004 不存在的合同编号）。 */
  async isEmptyState(): Promise<boolean> {
    const empty = this.page.locator(".el-table__empty-text, .el-empty");
    return isVisible(empty);
  }

  /** 收集页面所有错误消息（toast + 行内，经验 §1.1）。 */
  async collectErrors() {
    return collectErrors(this.page);
  }

  // ============================================================
  // 数据自适应行查找（项目约束：优先复用系统已有数据，不凭空编造）
  // 扫描当前页各行，按状态文案返回首个匹配行索引，避免硬编码行号。
  // ============================================================

  /**
   * 在当前页查找首个指定状态的行索引。
   * @param statusText 状态文案（如 "正常"/"已停用"/"已终止"）
   * @param maxScan 最多扫描行数（默认当前页全部）
   * @returns 行索引；未找到返回 -1
   */
  async findRowByStatus(statusText: string, maxScan?: number): Promise<number> {
    const total = await this.rowCount();
    const limit = maxScan ?? total;
    for (let i = 0; i < Math.min(limit, total); i++) {
      const status = await this.getRowStatus(i);
      if (status === statusText) return i;
    }
    return -1;
  }

  /**
   * 查找首个启停按钮文案匹配的行索引（启用/禁用）。
   * @param buttonText "启用" | "禁用"
   */
  async findRowByToggleText(buttonText: string): Promise<number> {
    const total = await this.rowCount();
    for (let i = 0; i < total; i++) {
      const text = await this.getToggleButtonText(i);
      if (text === buttonText && !(await this.isToggleDisabled(i))) return i;
    }
    return -1;
  }

  /** 读取状态分布（用于断言多状态存在，FT-LIST-008）。 */
  async getStatusDistribution(): Promise<Record<string, number>> {
    const total = await this.rowCount();
    const dist: Record<string, number> = {};
    for (let i = 0; i < total; i++) {
      const s = await this.getRowStatus(i);
      dist[s] = (dist[s] || 0) + 1;
    }
    return dist;
  }
}
