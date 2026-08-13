/**
 * form-edit.spec.ts — 3.5 编辑合同配置
 *
 * 用例：FT-BILLCFG-FORM-006/007/008/015/016
 *       ET-BILLCFG-FORM-020
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
import { test, expect } from "../fixtures/billing.fixture";
import { genContractNo } from "../data/billing.data";
import { VALIDATION_TEXTS, TOAST_TEXTS } from "../data/billing-texts";

test.describe("3.5 编辑合同配置", () => {
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
    billingList: import("../pages/billing-list.page").BillingListPage,
    billingForm: import("../pages/billing-form.page").BillingFormPage,
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
    billingList: import("../pages/billing-list.page").BillingListPage,
    billingForm: import("../pages/billing-form.page").BillingFormPage,
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
  test("FT-BILLCFG-FORM-006 编辑未消耗合同：修改字段后保存成功，主表刷新", async ({
    billingList,
    billingForm,
  }) => {
    // findEditableRow 是本 spec 文件已有的本地辅助函数（第 33 行）
    const row = await findEditableRow(billingList, billingForm);
    test.skip(row === -1, "未找到可编辑（未消耗）合同，跳过");

    // 记录编辑前值（验证形成真实变更：修改值必须 ≠ 原始值）
    const beforeStorage = await billingForm.getStorageDays();
    const beforeQuota0 = await billingForm.getQuota(0);

    // 修改字段。若原始值已是目标值，改为不同值确保形成真实变更（项目硬约束）
    const newStorage = beforeStorage === "120" ? "180" : "120";
    const newQuota0 = beforeQuota0 === "200" ? "150" : "200";
    await billingForm.inputStorageDays(newStorage);
    await billingForm.inputQuota(0, newQuota0);

    // 4 维度断言：接口 + toast + 弹窗关闭
    const result = await billingForm.submitAndVerify(
      "edit",
      TOAST_TEXTS.editSuccess,
    );
    expect(result.apiOk, `编辑接口失败：retCode 非 0`).toBe(true);
    expect(
      result.toastMatched,
      `toast 文案不匹配，期望="${TOAST_TEXTS.editSuccess}" 实际="${result.toastText}"`,
    ).toBe(true);
    expect(result.dialogClosed, `弹窗未关闭`).toBe(true);

    // 第 5 维度：主表刷新验证——保存后主表对应行的数据存储期限应实时更新为新值
    await billingList.waitForListLoaded();
    const listStorage = await billingList.getCellText(row, "storageDays");
    expect(
      listStorage,
      `主表未刷新：数据存储期限仍为"${listStorage}"，期望"${newStorage}"`,
    ).toBe(newStorage);

    // 字段持久化验证：重新打开编辑弹窗，回显值 = 修改值（≠ 原始值）
    await billingList.cleanOverlays();
    await billingList.clickEdit(row);
    await billingForm.waitForDialog();
    const echoedStorage = await billingForm.getStorageDays();
    const echoedQuota0 = await billingForm.getQuota(0);
    expect(echoedStorage).toBe(newStorage);
    expect(echoedStorage).not.toBe(beforeStorage);
    expect(echoedQuota0).toBe(newQuota0);
    expect(echoedQuota0).not.toBe(beforeQuota0);
  });

  // FT-BILLCFG-FORM-007 编辑已消耗合同：只读查看态
  test("FT-BILLCFG-FORM-007 编辑已消耗合同：字段置灰，确定按钮不可点击", async ({
    billingList,
    billingForm,
  }) => {
    const row = await findReadonlyRow(billingList, billingForm);
    test.skip(row === -1, "未找到只读（已消耗）合同，跳过");

    // 确定按钮不可点击
    expect(await billingForm.isConfirmDisabled()).toBe(true);

    // 字段全部置灰（合同编号、存储期限）
    expect(await billingForm.isInputDisabled(billingForm.contractNoInput)).toBe(
      true,
    );
    expect(
      await billingForm.isInputDisabled(billingForm.storageDaysInput),
    ).toBe(true);

    // 关闭弹窗
    await billingForm.clickCancel();
  });

  // FT-BILLCFG-FORM-008 删除旧行+新增行，保存后回显一致
  test("FT-BILLCFG-FORM-008 编辑删除旧行+新增行：保存后回显与保存内容一致", async ({
    billingList,
    billingForm,
  }) => {
    const row = await findEditableRow(billingList, billingForm);
    test.skip(row === -1, "未找到可编辑（未消耗）合同，跳过");

    // 前置：需多条配额行。若仅 1 行先添加，使其 >= 2
    let rowCount = await billingForm.quotaRowCount();
    if (rowCount < 2) {
      await billingForm.clickAddRow();
      await billingForm.pickRowProjectProduct(1, 1, 0);
      await billingForm.inputQuota(1, "50");
      rowCount = await billingForm.quotaRowCount();
    }
    test.skip(rowCount < 2, "可编辑合同配额行不足 2 行，跳过删除+新增验证");

    // 记录删除前配额
    const beforeQuota = await billingForm.getQuota(0);

    // 删除第 1 行（旧行）
    await billingForm.clickRemoveRow(0);

    // 新增 1 行（新行）
    await billingForm.clickAddRow();
    const lastIdx = (await billingForm.quotaRowCount()) - 1;
    await billingForm.pickRowProjectProduct(lastIdx, 0, 0);
    await billingForm.inputQuota(lastIdx, "88");

    // 4 维度断言：接口 + toast + 弹窗关闭
    const result = await billingForm.submitAndVerify(
      "edit",
      TOAST_TEXTS.editSuccess,
    );
    expect(result.apiOk, `编辑接口失败：retCode 非 0`).toBe(true);
    expect(
      result.toastMatched,
      `toast 文案不匹配，期望="${TOAST_TEXTS.editSuccess}" 实际="${result.toastText}"`,
    ).toBe(true);
    expect(result.dialogClosed, `弹窗未关闭`).toBe(true);

    // 字段持久化验证：重新打开编辑弹窗，新增行配额回显正确
    await billingList.waitForListLoaded();
    await billingList.cleanOverlays();
    await billingList.clickEdit(row);
    await billingForm.waitForDialog();

    const echoedQuota = await billingForm.getQuota(lastIdx);
    expect(echoedQuota).toBe("88");
    void beforeQuota;
  });

  // FT-BILLCFG-FORM-015 只读态下添加/删除按钮置灰
  test("FT-BILLCFG-FORM-015 只读态：添加一行/删除按钮置灰不可点击", async ({
    billingList,
    billingForm,
  }) => {
    const row = await findReadonlyRow(billingList, billingForm);
    test.skip(row === -1, "未找到只读（已消耗）合同，跳过");

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
  test('FT-BILLCFG-FORM-016 编辑改合同编号为已存在：提示"合同编号已存在"，保存被拒绝', async ({
    billingList,
    billingForm,
  }) => {
    const row = await findEditableRow(billingList, billingForm);
    test.skip(row === -1, "未找到可编辑（未消耗）合同，跳过");

    // 读取另一行的合同编号作为重复值（自适应取系统已有数据）
    const otherRow = row === 0 ? 1 : 0;
    const existingContractNo = await billingList.getRowContractNo(otherRow);
    test.skip(!existingContractNo, "未获取到其他行合同编号，跳过");

    // 修改合同编号为同机构下已存在的另一合同编号
    await billingForm.inputContractNo(existingContractNo);

    // 点击确定：校验是提交触发，用 clickConfirmOnlyAndCount 避免等 API 超时 15s 导致 toast 消失
    const { counter, click } =
      await billingForm.clickConfirmOnlyAndCount("edit");
    await click();

    // 提示"合同编号已存在"，保存被拒绝
    expect(
      await billingForm.waitForError(
        VALIDATION_TEXTS.contractNoDuplicate,
        5000,
      ),
    ).toBe(true);

    // 弹窗未关闭（保存被拒绝）
    expect(await billingForm.isDialogVisible()).toBe(true);

    // 清理：取消关闭弹窗
    await billingForm.clickCancel();
  });

  // ET-BILLCFG-FORM-020 编辑合同内产品套餐组合重复：确定可点击但不提交
  test("ET-BILLCFG-FORM-020 编辑合同内产品套餐组合重复：确定可点击但不提交", async ({
    billingList,
    billingForm,
  }) => {
    const row = await findEditableRow(billingList, billingForm);
    test.skip(row === -1, "未找到可编辑（未消耗）合同，跳过");

    // 读取已有行中第一个有已选项目套餐的展示文案（用于在新行选同一组合触发重复）
    const existingRowCount = await billingForm.quotaRowCount();
    let displayExisting = "";
    for (let i = 0; i < existingRowCount; i++) {
      const d = await billingForm.getRowCascaderDisplay(i);
      if (d) {
        displayExisting = d;
        break;
      }
    }
    test.skip(!displayExisting, "可编辑合同无已选项目套餐的配额行，跳过");

    // 记录原第 0 行配额值（验证原合同数据不变）
    const originalQuota0 = await billingForm.getQuota(0);

    // 添加一行，在新行遍历级联选项，找到与已有行展示相同的组合（最多尝试 3 个一级选项）
    await billingForm.clickAddRow();
    const newIdx = (await billingForm.quotaRowCount()) - 1;

    let matched = false;
    for (let l1 = 0; l1 < 3 && !matched; l1++) {
      await billingForm.pickRowProjectProduct(newIdx, l1, 0);
      const displayNew = await billingForm.getRowCascaderDisplay(newIdx);
      if (displayNew && displayNew === displayExisting) {
        matched = true;
      }
    }
    test.skip(!matched, "未找到与已有行相同的项目套餐组合，跳过");

    // 新行填配额
    await billingForm.inputQuota(newIdx, "50");

    // 点确定并计数（不等待接口）
    const { counter, click } =
      await billingForm.clickConfirmOnlyAndCount("edit");
    await click();

    // 不调用编辑接口
    expect(counter.count).toBe(0);
    await counter.cleanup();

    // 展示动态重复提示
    expect(
      await billingForm.waitForError(
        VALIDATION_TEXTS.quotaComboDuplicate,
        5000,
      ),
    ).toBe(true);

    // 弹窗不关闭
    expect(await billingForm.isDialogVisible()).toBe(true);

    // 确定按钮保持可点击
    expect(await billingForm.isConfirmDisabled()).toBe(false);

    // 原合同数据不变（第 0 行配额未被修改）
    expect(await billingForm.getQuota(0)).toBe(originalQuota0);

    // 清理：取消关闭弹窗
    await billingForm.clickCancel();
  });
});
