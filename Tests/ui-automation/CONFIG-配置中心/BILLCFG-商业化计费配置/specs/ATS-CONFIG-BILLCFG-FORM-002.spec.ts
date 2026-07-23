import { test, expect } from "../fixtures/billing.fixture";
import { BillingConfigPage } from "../pages/billing.page";

/**
 * REQ-CONFIG-BILLCFG-FORM-002 编辑合同配置
 * 覆盖：FT-BILLCFG-FORM-006 ~ 008, 015, 016
 */
test.describe("编辑合同配置", () => {
  let billingPage: BillingConfigPage;

  test.beforeEach(async ({ authedPage }) => {
    billingPage = new BillingConfigPage(authedPage);
    await billingPage.goto();
  });

  // ─── P0 ──────────────────────────────────────────────────────────────────

  test("FT-BILLCFG-FORM-006: 编辑未消耗合同成功", async () => {
    // 找到第一行可编辑合同（未消耗）
    await billingPage.openEditDialog(0);

    // 验证弹窗打开且字段可编辑
    await expect(billingPage.editDialog).toBeVisible();
    await expect(billingPage.contractNoInput).toBeEditable();

    // 修改数据存储期限（必须与当前值不同，否则“确定”按钮可能不会进入可提交态）
    const currentStorageDays = await billingPage.storageDaysInput.inputValue();
    const newStorageDays = currentStorageDays === "90" ? "120" : "90";
    await billingPage.storageDaysInput.fill(newStorageDays);
    await billingPage.storageDaysInput.press("Tab");

    await expect(billingPage.confirmBtn).toBeEnabled();

    // 提交：明确等待编辑保存接口，避免只靠 toast 判断而无法区分“没点到”还是“没保存成功”
    const [saveResponse] = await Promise.all([
      billingPage.page.waitForResponse(
        (resp) =>
          resp.url().includes("/base/quota/contract/edit") &&
          resp.request().method() === "POST",
        { timeout: 10_000 },
      ),
      billingPage.submitForm(),
    ]);

    expect(saveResponse.ok()).toBeTruthy();
    const saveBody = await saveResponse.json();
    expect(saveBody.retCode).toBe(0);

    await billingPage.page.waitForLoadState("networkidle");

    // 验证成功提示
    await billingPage.expectToast("保存成功");
    await expect(billingPage.editDialog).toHaveCount(0);
  });

  test("FT-BILLCFG-FORM-007: 已消耗合同编辑进入只读态", async () => {
    // TODO: 需要准备 hasConsumed=true 的合同数据
    // 验证弹窗字段全部置灰
    // 验证"确定"按钮不可点击
    // 验证"添加一行"按钮置灰
    test.skip(true, "需要 hasConsumed=true 合同数据");
  });

  test("FT-BILLCFG-FORM-016: 编辑时重复合同编号", async () => {
    const rowCount = await billingPage.getRowCount();
    expect(rowCount).toBeGreaterThan(1);

    const existingOrgName = await billingPage.getRowOrgName(0);
    const existingContractNo = await billingPage.getRowContractNo(0);

    let targetRowId = -1;
    for (let rowId = 1; rowId < rowCount; rowId++) {
      if (
        (await billingPage.getRowOrgName(rowId)) === existingOrgName &&
        (await billingPage.getRowContractNo(rowId)) !== existingContractNo
      ) {
        targetRowId = rowId;
        break;
      }
    }
    expect(targetRowId).toBeGreaterThan(-1);

    await billingPage.openEditDialog(targetRowId);
    await billingPage.contractNoInput.fill(existingContractNo);

    await billingPage.submitForm();

    // 验证保存被拒绝
    await expect(billingPage.editDialog).toBeVisible();
    await billingPage.expectToast("合同编号已存在");

    await billingPage.closeDialog();
  });

  // ─── P1 ──────────────────────────────────────────────────────────────────

  test("FT-BILLCFG-FORM-008: 编辑时增删配额行", async () => {
    await billingPage.openEditDialog(0);

    // 记录当前配额行数
    const initialQuotaInputs = billingPage.editDialog.locator(
      '[data-testid^="billing-quota-input-"]',
    );
    const initialCount = await initialQuotaInputs.count();

    // 添加一行
    await billingPage.addQuotaRow();
    await expect(initialQuotaInputs).toHaveCount(initialCount + 1);

    // 删除最后一行
    await billingPage.removeQuotaRow(initialCount);
    await expect(initialQuotaInputs).toHaveCount(initialCount);

    await billingPage.closeDialog();
  });

  test("FT-BILLCFG-FORM-015: 只读态下添加/删除按钮置灰", async () => {
    // TODO: 需要 hasConsumed=true 合同数据
    // 验证"添加一行"按钮 disabled
    // 验证各配额行"删除"按钮 disabled
    test.skip(true, "需要 hasConsumed=true 合同数据");
  });
});
