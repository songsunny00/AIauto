/**
 * billing-form.page.ts — 商业化计费配置 新增/编辑弹窗页面对象
 *
 * 覆盖用例：FT-BILLCFG-FORM-001~018、ET-FORM-003/004/012。
 *
 * 定位依据：explore-testids-raw.json#editDialog
 *   - 有 testid：billing-org-name-select / -contract-no-input / -storage-days-input /
 *     -download-times-input / -total-quota-input / -add-row-btn / -quota-input-{i} /
 *     -remove-row-btn-{i} / -cancel-btn / -confirm-btn
 *   - 无 testid（兜底）：合同周期（.el-date-editor el-date-range-picker）、
 *     配额行检测项目套餐级联（.el-cascader）
 *
 * 避坑（测试过程问题经验总结.md）：
 *   - §1.1 配额行校验错误出现在 toast → 用 helpers/errors.collectErrors 双查
 *   - §1.2 el-select placeholder 拦截 → helpers/element-plus force click
 *   - §1.3 el-date-range-picker 用 .is-left/.is-right 面板 → helpers/element-plus.pickDateRange
 *   - §2.1 级联残留菜单干扰 → offsetParent !== null 过滤
 *   - §5.1 删除按钮 testid 为 billing-remove-row-btn-{idx}（非 row-delete）
 */
import type { Page, Locator } from '@playwright/test';
import {
  selectElOptionByText,
  selectElOptionByIndex,
  pickCascaderNode,
  pickCascaderMulti,
  pickDateRange,
} from '../../../helpers/element-plus';
import { collectErrors } from '../../../helpers/errors';
import { waitForApi, createCallCounter, type CallCounter } from '../../../helpers/network';
import { isVisible } from '../../../helpers/visibility';
import { API_PATTERNS, DEFAULTS } from '../data/billing.data';
import { VALIDATION_TEXTS, BUTTON_TEXTS, TOAST_TEXTS } from '../data/billing-texts';

export class BillingFormPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ============================================================
  // 弹窗定位与可见性（经验 §6.1：用 isVisible，禁止 getComputedStyle）
  // ============================================================

  /** 弹窗根（探索结果：billing-edit-dialog 未命中，回退 .el-dialog）。 */
  get dialog(): Locator {
    return this.page.locator('[data-testid=billing-edit-dialog], .el-dialog').first();
  }

  /** 弹窗是否可见。 */
  async isDialogVisible(): Promise<boolean> {
    return isVisible(this.dialog);
  }

  /** 等待弹窗可见。 */
  async waitForDialog(timeoutMs = 10_000): Promise<void> {
    await this.dialog.waitFor({ state: 'visible', timeout: timeoutMs });
    await this.page.waitForTimeout(800);
  }

  // ============================================================
  // 基础信息字段
  // ============================================================

  /** 机构名称选择器（el-select）。 */
  get orgSelect(): Locator {
    return this.page.locator('[data-testid=billing-org-name-select]');
  }

  /** 合同编号输入框。 */
  get contractNoInput(): Locator {
    return this.page.locator('[data-testid=billing-contract-no-input]');
  }

  /** 数据存储期限输入框。 */
  get storageDaysInput(): Locator {
    return this.page.locator('[data-testid=billing-storage-days-input]');
  }

  /** 文件下载次数输入框（只读，FT-FORM-013）。 */
  get downloadTimesInput(): Locator {
    return this.page.locator('[data-testid=billing-download-times-input]');
  }

  /** 样本分析总次数输入框（只读自动汇总，FT-FORM-014）。 */
  get totalQuotaInput(): Locator {
    return this.page.locator('[data-testid=billing-total-quota-input]');
  }

  /**
   * 合同周期日期范围选择器（无 testid，兜底定位弹窗内第一个 .el-date-editor）。
   */
  get contractRangeEditor(): Locator {
    return this.dialog.locator('.el-date-editor').first();
  }

  /** 选择机构（按文案）。 */
  async selectOrg(name: string): Promise<void> {
    await selectElOptionByText(this.page, 'billing-org-name-select', name);
  }

  /** 选择机构第一个选项。 */
  async selectOrgByIndex(index = 0): Promise<void> {
    await selectElOptionByIndex(this.page, 'billing-org-name-select', index);
  }

  /** 输入合同编号。 */
  async inputContractNo(text: string): Promise<void> {
    await this.contractNoInput.fill(text);
  }

  /** 触发合同编号失焦校验（FT-FORM-003）。 */
  async blurContractNo(): Promise<void> {
    await this.contractNoInput.blur();
    await this.page.waitForTimeout(500);
  }

  /** 输入数据存储期限。 */
  async inputStorageDays(text: string): Promise<void> {
    await this.storageDaysInput.fill(text);
  }

  /** 选择合同周期（点左/右面板首个可用日期）。 */
  async pickContractRange(): Promise<{ start: string; end: string }> {
    return pickDateRange(this.page, this.contractRangeEditor);
  }

  /** 读取合同编号当前值。 */
  async getContractNo(): Promise<string> {
    return this.contractNoInput.inputValue();
  }

  /** 读取数据存储期限当前值。 */
  async getStorageDays(): Promise<string> {
    return this.storageDaysInput.inputValue();
  }

  /** 读取文件下载次数当前值。 */
  async getDownloadTimes(): Promise<string> {
    return this.downloadTimesInput.inputValue();
  }

  /** 读取样本分析总次数当前值。 */
  async getTotalQuota(): Promise<string> {
    return this.totalQuotaInput.inputValue();
  }

  /** 合同周期是否已填（两个 range-input 均非空）。 */
  async isContractRangeFilled(): Promise<boolean> {
    const inputs = this.contractRangeEditor.locator('.el-range-input');
    const start = await inputs.nth(0).inputValue().catch(() => '');
    const end = await inputs.nth(1).inputValue().catch(() => '');
    return start !== '' && end !== '';
  }

  // ============================================================
  // 只读/禁用状态判定（FT-FORM-007/013/014/015）
  // ============================================================

  /** 输入框是否禁用。 */
  async isInputDisabled(locator: Locator): Promise<boolean> {
    const disabled = await locator.getAttribute('disabled');
    if (disabled !== null) return true;
    const cls = (await locator.evaluate((el) => el.className)) || '';
    return cls.includes('is-disabled');
  }

  /** 文件下载次数是否只读/禁用（FT-FORM-013）。 */
  async isDownloadTimesDisabled(): Promise<boolean> {
    return this.isInputDisabled(this.downloadTimesInput);
  }

  /** 样本分析总次数是否只读/禁用（FT-FORM-014）。 */
  async isTotalQuotaDisabled(): Promise<boolean> {
    return this.isInputDisabled(this.totalQuotaInput);
  }

  // ============================================================
  // 配额行操作
  // ============================================================

  /** 指定行配额输入框。 */
  quotaInput(rowIndex: number): Locator {
    return this.page.locator(`[data-testid=billing-quota-input-${rowIndex}]`);
  }

  /**
   * 指定行检测项目套餐级联组件（无 testid，兜底定位弹窗内第 rowIndex 个 .el-cascader）。
   */
  cascaderAt(rowIndex: number): Locator {
    return this.dialog.locator('.el-cascader').nth(rowIndex);
  }

  /** "添加一行"按钮。 */
  get addRowButton(): Locator {
    return this.page.locator('[data-testid=billing-add-row-btn]');
  }

  /** 指定行"删除"按钮（经验 §5.1：billing-remove-row-btn-{idx}）。 */
  removeRowButton(rowIndex: number): Locator {
    return this.page.locator(`[data-testid=billing-remove-row-btn-${rowIndex}]`);
  }

  /** 当前配额行数（按配额输入框数量）。 */
  async quotaRowCount(): Promise<number> {
    return this.page.locator('[data-testid^=billing-quota-input-]').count();
  }

  /** 输入指定行配额值。 */
  async inputQuota(rowIndex: number, value: string): Promise<void> {
    await this.quotaInput(rowIndex).fill(value);
  }

  /** 读取指定行配额值。 */
  async getQuota(rowIndex: number): Promise<string> {
    return this.quotaInput(rowIndex).inputValue();
  }

  /**
   * 为指定行选择检测项目套餐（级联单选，默认第一项）。
   * @param rowIndex 配额行索引
   * @param level1Idx 一级菜单索引
   * @param level2Idx 二级菜单索引
   */
  async pickRowProjectProduct(
    rowIndex: number,
    level1Idx = 0,
    level2Idx = 0,
  ): Promise<{ tagCount: number; tagTexts: string[] }> {
    return pickCascaderNode(this.page, this.cascaderAt(rowIndex), level1Idx, level2Idx);
  }

  /**
   * 为指定行多选检测项目套餐（FT-FORM-012）。
   * @param picks 多组 { level1, level2 } 索引
   */
  async pickRowProjectProductMulti(
    rowIndex: number,
    picks: Array<{ level1: number; level2: number }>,
  ): Promise<{ tagCount: number; tagTexts: string[] }> {
    return pickCascaderMulti(this.page, this.cascaderAt(rowIndex), picks);
  }

  /** 点击"添加一行"。 */
  async clickAddRow(): Promise<void> {
    await this.addRowButton.click();
    await this.page.waitForTimeout(500);
  }

  /** 点击指定行"删除"。 */
  async clickRemoveRow(rowIndex: number): Promise<void> {
    await this.removeRowButton(rowIndex).click();
    await this.page.waitForTimeout(500);
  }

  /** "添加一行"按钮是否禁用（FT-FORM-015 只读态）。 */
  async isAddRowDisabled(): Promise<boolean> {
    const cls = (await this.addRowButton.getAttribute('class')) || '';
    return cls.includes('is-disabled');
  }

  /** 指定行"删除"按钮是否禁用（FT-FORM-005 仅1行置灰 / FT-FORM-015 只读态）。 */
  async isRemoveRowDisabled(rowIndex: number): Promise<boolean> {
    const cls = (await this.removeRowButton(rowIndex).getAttribute('class')) || '';
    return cls.includes('is-disabled');
  }

  // ============================================================
  // 提交/取消（FT-FORM-004/006、ET-FORM-003/004）
  // ============================================================

  /** "确定"按钮。 */
  get confirmButton(): Locator {
    return this.page.locator('[data-testid=billing-confirm-btn]');
  }

  /** "取消"按钮。 */
  get cancelButton(): Locator {
    return this.page.locator('[data-testid=billing-cancel-btn]');
  }

  /** "确定"按钮是否禁用（FT-FORM-007 只读态）。 */
  async isConfirmDisabled(): Promise<boolean> {
    const cls = (await this.confirmButton.getAttribute('class')) || '';
    return cls.includes('is-disabled');
  }

  /**
   * 点击"确定"提交，等待新增/编辑接口返回。
   * @param mode 'add'|'edit' 决定等待哪个接口
   */
  async clickConfirm(mode: 'add' | 'edit' = 'add'): Promise<void> {
    const apiPattern = mode === 'add' ? API_PATTERNS.contractAdd : API_PATTERNS.contractEdit;
    const resp = waitForApi(this.page, { url: apiPattern, method: 'POST' });
    await this.confirmButton.click();
    await resp.catch(() => {});
    await this.page.waitForTimeout(800);
  }

  /**
   * 仅点击"确定"不等待接口（用于 ET-FORM-003/004 验证不调用接口）。
   * 返回调用计数器，断言 count===0 表示未调用。
   */
  async clickConfirmOnlyAndCount(
    mode: 'add' | 'edit' = 'add',
  ): Promise<{ counter: CallCounter; click: () => Promise<void> }> {
    const pattern = mode === 'add' ? API_PATTERNS.contractAdd : API_PATTERNS.contractEdit;
    const counter = await createCallCounter(this.page, pattern);
    return {
      counter,
      click: async () => {
        await this.confirmButton.click();
        await this.page.waitForTimeout(1500);
      },
    };
  }

  /** 点击"取消"关闭弹窗。 */
  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
    await this.page.waitForTimeout(500);
  }

  // ============================================================
  // 错误收集（经验 §1.1：toast + form-item__error 双查）
  // ============================================================

  /** 收集弹窗内所有错误消息。 */
  async collectErrors() {
    return collectErrors(this.page);
  }

  /**
   * 等待指定错误文案出现（配额行校验为 toast，需要轮询）。
   * @param text 期望包含的文案片段
   * @param timeoutMs 超时（默认 3000）
   */
  async waitForError(text: string, timeoutMs = 3000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const errors = await collectErrors(this.page);
      if (errors.all.some((e) => e.includes(text))) return true;
      await this.page.waitForTimeout(200);
    }
    return false;
  }

  // ============================================================
  // Toast 成功消息（FT-FORM-004/006）
  // ============================================================

  /** 等待成功 toast 出现（新增成功 / 保存成功！）。 */
  async waitForSuccessToast(text: string, timeoutMs = 5000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const toasts = await this.page
        .locator('.el-message__content')
        .allTextContents();
      if (toasts.some((t) => t.includes(text))) return true;
      await this.page.waitForTimeout(200);
    }
    return false;
  }

  // ============================================================
  // 便捷：填写合法基础信息（FORM-004 等正向用例复用）
  // ============================================================

  /**
   * 填写合法基础信息：机构（第一个）、合同编号、合同周期、存储期限。
   * @param contractNo 合同编号
   */
  async fillValidBasics(contractNo: string): Promise<void> {
    await this.selectOrgByIndex(0);
    await this.page.waitForTimeout(500);
    await this.inputContractNo(contractNo);
    await this.pickContractRange();
    await this.inputStorageDays(String(DEFAULTS.storageDays));
  }
}
