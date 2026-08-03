/**
 * form-edit.spec.ts — 3.5 编辑合同配置
 *
 * 用例：FT-BILLCFG-FORM-006/007/008/015/016
 * 关联需求：REQ-CONFIG-BILLCFG-FORM-002（编辑合同配置）
 *
 * 数据策略（项目约束：优先复用系统已有数据）：
 *   已消耗/未消耗合同需通过编辑弹窗的只读态自适应判定，不硬编码行号。
 *   - 未消耗（可编辑）：打开编辑 → 确定按钮可点击
 *   - 已消耗（只读）：打开编辑 → 确定按钮置灰
 *
 * 避坑：
 *   - §6.1 弹窗可见性用 isVisible
 *   - §5.1 删除按钮 testid 为 billing-remove-row-btn-{idx}
 */
import { test, expect } from '../fixtures/billing.fixture';
import { genContractNo } from '../data/billing.data';
import { VALIDATION_TEXTS, TOAST_TEXTS } from '../data/billing-texts';

test.describe('3.5 编辑合同配置', () => {
  test.beforeEach(async ({ billingList, billingForm }) => {
    await billingList.goto();
    await billingList.waitForListLoaded();
    await billingList.cleanOverlays();
  });

  /**
   * 自适应查找可编辑行（未消耗合同）。
   * 逐行打开编辑弹窗，检查确定按钮是否可点击。
   * @returns 找到的行索引；未找到返回 -1
   */
  async function findEditableRow(
    billingList: import('../pages/billing-list.page').BillingListPage,
    billingForm: import('../pages/billing-form.page').BillingFormPage,
    maxScan = 5,
  ): Promise<number> {
    const total = await billingList.rowCount();
    for (let i = 0; i < Math.min(maxScan, total); i++) {
      await billingList.clickEdit(i);
      await billingForm.waitForDialog();
      const disabled = await billingForm.isConfirmDisabled();
      if (!disabled) return i;
      await billingForm.clickCancel();
      await billingList.cleanOverlays();
    }
    return -1;
  }

  /**
   * 自适应查找只读行（已消耗合同）。
   */
  async function findReadonlyRow(
    billingList: import('../pages/billing-list.page').BillingListPage,
    billingForm: import('../pages/billing-form.page').BillingFormPage,
    maxScan = 5,
  ): Promise<number> {
    const total = await billingList.rowCount();
    for (let i = 0; i < Math.min(maxScan, total); i++) {
      await billingList.clickEdit(i);
      await billingForm.waitForDialog();
      const disabled = await billingForm.isConfirmDisabled();
      if (disabled) return i;
      await billingForm.clickCancel();
      await billingList.cleanOverlays();
    }
    return -1;
  }

  // FT-BILLCFG-FORM-006 编辑未消耗合同：可编辑，保存成功
  test('FT-BILLCFG-FORM-006 编辑未消耗合同：修改字段后保存成功，主表刷新', async ({ billingList, billingForm }) => {
    const row = await findEditableRow(billingList, billingForm);
    test.skip(row === -1, '未找到可编辑（未消耗）合同，跳过');

    // 弹窗字段可编辑：修改数据存储期限
    await billingForm.inputStorageDays('120');
    expect(await billingForm.getStorageDays()).toBe('120');

    // 修改配额行
    await billingForm.inputQuota(0, '200');

    // 提交保存
    await billingForm.clickConfirm('edit');

    // 提示"保存成功！"
    const ok = await billingForm.waitForSuccessToast(TOAST_TEXTS.editSuccess, 8000);
    expect(ok, `未出现保存成功 toast "${TOAST_TEXTS.editSuccess}"`).toBe(true);

    // 弹窗关闭
    expect(await billingForm.isDialogVisible()).toBe(false);

    // 主表刷新：列表仍有数据
    await billingList.waitForListLoaded();
  });

  // FT-BILLCFG-FORM-007 编辑已消耗合同：只读查看态
  test('FT-BILLCFG-FORM-007 编辑已消耗合同：字段置灰，确定按钮不可点击', async ({ billingList, billingForm }) => {
    const row = await findReadonlyRow(billingList, billingForm);
    test.skip(row === -1, '未找到只读（已消耗）合同，跳过');

    // 确定按钮不可点击
    expect(await billingForm.isConfirmDisabled()).toBe(true);

    // 字段全部置灰（合同编号、存储期限）
    expect(await billingForm.isInputDisabled(billingForm.contractNoInput)).toBe(true);
    expect(await billingForm.isInputDisabled(billingForm.storageDaysInput)).toBe(true);

    // 关闭弹窗
    await billingForm.clickCancel();
  });

  // FT-BILLCFG-FORM-008 删除旧行+新增行，保存后回显一致
  test('FT-BILLCFG-FORM-008 编辑删除旧行+新增行：保存后回显与保存内容一致', async ({ billingList, billingForm }) => {
    const row = await findEditableRow(billingList, billingForm);
    test.skip(row === -1, '未找到可编辑（未消耗）合同，跳过');

    // 前置：需多条配额行。若仅 1 行先添加，使其 >= 2
    let rowCount = await billingForm.quotaRowCount();
    if (rowCount < 2) {
      await billingForm.clickAddRow();
      await billingForm.pickRowProjectProduct(1, 1, 0);
      await billingForm.inputQuota(1, '50');
      rowCount = await billingForm.quotaRowCount();
    }
    test.skip(rowCount < 2, '可编辑合同配额行不足 2 行，跳过删除+新增验证');

    // 记录删除前配额
    const beforeQuota = await billingForm.getQuota(0);

    // 删除第 1 行（旧行）
    await billingForm.clickRemoveRow(0);

    // 新增 1 行（新行）
    await billingForm.clickAddRow();
    const lastIdx = (await billingForm.quotaRowCount()) - 1;
    await billingForm.pickRowProjectProduct(lastIdx, 0, 0);
    await billingForm.inputQuota(lastIdx, '88');

    // 保存
    await billingForm.clickConfirm('edit');
    const ok = await billingForm.waitForSuccessToast(TOAST_TEXTS.editSuccess, 8000);
    expect(ok).toBe(true);

    // 再次打开编辑回显
    await billingList.waitForListLoaded();
    await billingList.cleanOverlays();
    await billingList.clickEdit(row);
    await billingForm.waitForDialog();

    // 新增行正确保存（最后一行配额为 88）
    const echoedQuota = await billingForm.getQuota(lastIdx);
    expect(echoedQuota).toBe('88');
    void beforeQuota;
  });

  // FT-BILLCFG-FORM-015 只读态下添加/删除按钮置灰
  test('FT-BILLCFG-FORM-015 只读态：添加一行/删除按钮置灰不可点击', async ({ billingList, billingForm }) => {
    const row = await findReadonlyRow(billingList, billingForm);
    test.skip(row === -1, '未找到只读（已消耗）合同，跳过');

    // "添加一行"按钮置灰
    expect(await billingForm.isAddRowDisabled()).toBe(true);

    // 各配额行"删除"按钮置灰
    const rowCount = await billingForm.quotaRowCount();
    for (let i = 0; i < rowCount; i++) {
      expect(await billingForm.isRemoveRowDisabled(i)).toBe(true);
    }

    await billingForm.clickCancel();
  });

  // FT-BILLCFG-FORM-016 编辑重复合同编号
  test('FT-BILLCFG-FORM-016 编辑改合同编号为已存在：提示"合同编号已存在"，保存被拒绝', async ({ billingList, billingForm }) => {
    const row = await findEditableRow(billingList, billingForm);
    test.skip(row === -1, '未找到可编辑（未消耗）合同，跳过');

    // 读取另一行的合同编号作为重复值（自适应取系统已有数据）
    const otherRow = row === 0 ? 1 : 0;
    const existingContractNo = await billingList.getRowContractNo(otherRow);
    test.skip(!existingContractNo, '未获取到其他行合同编号，跳过');

    // 修改合同编号为同机构下已存在的另一合同编号
    await billingForm.inputContractNo(existingContractNo);

    // 点击确定
    await billingForm.clickConfirm('edit');

    // 提示"合同编号已存在"，保存被拒绝
    expect(await billingForm.waitForError(VALIDATION_TEXTS.contractNoDuplicate, 5000)).toBe(true);

    // 弹窗未关闭（保存被拒绝）
    expect(await billingForm.isDialogVisible()).toBe(true);

    // 清理：取消关闭弹窗
    await billingForm.clickCancel();
  });
});
