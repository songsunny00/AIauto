/**
 * billing-detail.page.ts — 商业化计费配置 明细抽屉页面对象
 *
 * 覆盖用例：FT-BILLCFG-DETAIL-001~006、ET-DETAIL-009/013/014。
 *
 * 定位依据：explore-testids-raw.json#detailDrawer
 *   - 有 testid：billing-detail-drawer（抽屉根）、billing-detail-close-btn（关闭按钮）
 *   - 无 testid（兜底）：顶部汇总区、用量明细表、历史变更表、分页
 *
 * 避坑（测试过程问题经验总结.md）：
 *   - §6.1 抽屉可见性必须用 isVisible()（父 .el-overlay display:none 隐藏，子 display 仍 flex）
 *   - §6.2 切换合同时 Vue 状态正确重置，不残留
 *   - DETAIL-006 关闭按钮不触发列表刷新（断言接口未调用）
 */
import type { Page, Locator } from '@playwright/test';
import { waitForApi, createCallCounter, type CallCounter } from '../../../helpers/network';
import { isVisible } from '../../../helpers/visibility';
import { API_PATTERNS } from '../data/billing.data';

export class BillingDetailPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ============================================================
  // 抽屉定位与可见性（经验 §6.1：用 isVisible）
  // ============================================================

  /** 抽屉根元素。 */
  get drawer(): Locator {
    return this.page.locator('[data-testid=billing-detail-drawer]');
  }

  /** 关闭按钮（底部）。 */
  get closeButton(): Locator {
    return this.page.locator('[data-testid=billing-detail-close-btn]');
  }

  /** 抽屉是否可见（经验 §6.1：禁止 getComputedStyle，用 isVisible）。 */
  async isDrawerVisible(): Promise<boolean> {
    return isVisible(this.drawer);
  }

  /** 等待抽屉打开并加载数据。 */
  async waitForDrawer(timeoutMs = 10_000): Promise<void> {
    await this.drawer.waitFor({ state: 'visible', timeout: timeoutMs });
    await this.page.waitForTimeout(1500);
  }

  // ============================================================
  // 关闭操作（DETAIL-005/006）
  // ============================================================

  /** 点击底部"关闭"按钮。 */
  async clickClose(): Promise<void> {
    await this.closeButton.click();
    await this.page.waitForTimeout(800);
  }

  /** 点击抽屉头部 X 按钮（兜底关闭方式）。 */
  async clickCloseIcon(): Promise<void> {
    await this.drawer.locator('.el-drawer__close-btn').click();
    await this.page.waitForTimeout(800);
  }

  /**
   * 创建列表分页接口调用计数器（DETAIL-006 断言关闭不触发列表刷新）。
   * 关闭抽屉后断言 counter.count === 0。
   */
  async createListRefreshCounter(): Promise<CallCounter> {
    return createCallCounter(this.page, API_PATTERNS.contractPage);
  }

  // ============================================================
  // 顶部汇总区（DETAIL-001/004）
  // 字段：样本分析总次数、样本分析次数累计消耗、样本分析次数当前剩余、数据存储期限、文件下载次数
  // ============================================================

  /**
   * 读取顶部汇总区某字段的数值（按标签文案定位相邻数值）。
   * 实现策略：在抽屉内查找包含标签文案的元素，取其紧邻的数值节点文本。
   * @param label 标签文案（如 "样本分析总次数"）
   */
  async getSummaryValue(label: string): Promise<string> {
    return this.page
      .evaluate((lbl) => {
        const drawer = document.querySelector('[data-testid=billing-detail-drawer]');
        if (!drawer) return '';
        // 查找包含标签文案的节点
        const all = Array.from(drawer.querySelectorAll('*'));
        const labelEl = all.find(
          (el) => el.children.length === 0 && el.textContent?.trim() === lbl,
        );
        if (!labelEl) return '';
        // 数值通常在标签的兄弟节点或父节点的相邻节点
        const parent = labelEl.parentElement;
        if (!parent) return '';
        const valueNode = Array.from(parent.children).find(
          (c) => c !== labelEl && c.textContent?.trim(),
        );
        return valueNode?.textContent?.trim() || '';
      }, label)
      .catch(() => '');
  }

  /** 样本分析总次数（DETAIL-004 顶部汇总）。 */
  async getTotalQuota(): Promise<string> {
    return this.getSummaryValue('样本分析总次数');
  }

  /** 样本分析次数累计消耗（红色展示，DETAIL-001）。 */
  async getConsumedCount(): Promise<string> {
    return this.getSummaryValue('样本分析次数累计消耗');
  }

  /** 样本分析次数当前剩余（DETAIL-004）。 */
  async getRemainCount(): Promise<string> {
    return this.getSummaryValue('样本分析次数当前剩余');
  }

  /** 数据存储期限。 */
  async getStorageDays(): Promise<string> {
    return this.getSummaryValue('数据存储期限');
  }

  /** 文件下载次数。 */
  async getDownloadTimes(): Promise<string> {
    return this.getSummaryValue('文件下载次数');
  }

  // ============================================================
  // 用量明细表（DETAIL-001/002/003/004）
  // 字段：序号、芯片ID/RunID、任务编号、检测项目、产品套餐、配额、累计消耗、当前剩余、创建时间
  // ============================================================

  /** 抽屉内第一个子表格（用量明细表）。 */
  get usageTable(): Locator {
    return this.drawer.locator('.el-table').first();
  }

  /** 用量明细表数据行数。 */
  async usageRowCount(): Promise<number> {
    return this.usageTable.locator('.el-table__row').count();
  }

  /** 用量明细表是否为空状态（DETAIL-002 无消耗记录）。 */
  async isUsageEmpty(): Promise<boolean> {
    const empty = this.usageTable.locator('.el-table__empty-text, .el-empty');
    return isVisible(empty);
  }

  /** 读取用量明细表表头文案列表。 */
  async usageHeaders(): Promise<string[]> {
    const texts = await this.usageTable.locator('th .cell').allTextContents();
    return texts.map((t) => t.trim()).filter((t) => t);
  }

  /**
   * 读取用量明细表指定行指定列文本。
   * @param rowIndex 行索引（0 起）
   * @param colIndex 列索引（0 起，按表头顺序）
   */
  async getUsageCell(rowIndex: number, colIndex: number): Promise<string> {
    const text = await this.usageTable
      .locator('.el-table__row')
      .nth(rowIndex)
      .locator('td')
      .nth(colIndex)
      .textContent();
    return (text || '').trim();
  }

  /**
   * 读取用量明细表"样本分析次数累计消耗"列所有数值并求和（DETAIL-004 汇总校验）。
   * @param colIndex 累计消耗列索引（需先通过 usageHeaders 定位）
   */
  async sumUsageColumn(colIndex: number): Promise<number> {
    const count = await this.usageRowCount();
    let sum = 0;
    for (let i = 0; i < count; i++) {
      const text = await this.getUsageCell(i, colIndex);
      const num = parseInt(text, 10);
      if (!Number.isNaN(num)) sum += num;
    }
    return sum;
  }

  // ============================================================
  // 历史变更表（DETAIL-001/003）
  // ============================================================

  /** 抽屉内第二个子表格（历史变更表）。 */
  get historyTable(): Locator {
    return this.drawer.locator('.el-table').nth(1);
  }

  /** 历史变更表数据行数。 */
  async historyRowCount(): Promise<number> {
    return this.historyTable.locator('.el-table__row').count();
  }

  /** 读取历史变更表表头文案列表。 */
  async historyHeaders(): Promise<string[]> {
    const texts = await this.historyTable.locator('th .cell').allTextContents();
    return texts.map((t) => t.trim()).filter((t) => t);
  }

  // ============================================================
  // 分页控制（DETAIL-003：用量分页 + 历史分页互不干扰）
  // ============================================================

  /** 用量明细表分页容器。 */
  get usagePagination(): Locator {
    return this.drawer.locator('.el-pagination').first();
  }

  /** 历史变更表分页容器。 */
  get historyPagination(): Locator {
    return this.drawer.locator('.el-pagination').nth(1);
  }

  /** 点击指定分页容器的下一页。 */
  async nextPage(container: 'usage' | 'history'): Promise<void> {
    const pager = container === 'usage' ? this.usagePagination : this.historyPagination;
    const apiPattern =
      container === 'usage' ? API_PATTERNS.usageDetail : API_PATTERNS.usageHistory;
    const resp = waitForApi(this.page, { url: apiPattern, method: 'POST' });
    await pager.locator('.btn-next').click();
    await resp.catch(() => {});
    await this.page.waitForTimeout(800);
  }

  /** 读取指定分页容器当前页码。 */
  async getCurrentPage(container: 'usage' | 'history'): Promise<string> {
    const pager = container === 'usage' ? this.usagePagination : this.historyPagination;
    return (await pager.locator('.number.active').textContent())?.trim() || '';
  }

  /** 读取指定分页容器总数文本。 */
  async getTotalText(container: 'usage' | 'history'): Promise<string> {
    const pager = container === 'usage' ? this.usagePagination : this.historyPagination;
    return (await pager.locator('.el-pagination__total').textContent())?.trim() || '';
  }

  // ============================================================
  // 接口等待（ET-DETAIL-013/014）
  // ============================================================

  /** 等待用量明细接口响应。 */
  async waitForUsageApi(timeoutMs = 15_000) {
    return waitForApi(
      this.page,
      { url: API_PATTERNS.usageDetail, method: 'POST' },
      timeoutMs,
    );
  }

  /** 等待历史变更接口响应。 */
  async waitForHistoryApi(timeoutMs = 15_000) {
    return waitForApi(
      this.page,
      { url: API_PATTERNS.usageHistory, method: 'POST' },
      timeoutMs,
    );
  }
}
