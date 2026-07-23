import { test, expect } from "../fixtures/billing.fixture";
import { BillingConfigPage } from "../pages/billing.page";
import {
  VALID_CONTRACT,
  QUOTA_ROWS,
  INVALID_CONTRACT_NO,
  INVALID_QUOTA,
  DEFAULT_DIALOG_VALUES,
} from "../data/billing.data";

/**
 * REQ-CONFIG-BILLCFG-FORM-001 新增合同配置
 * 覆盖：FT-BILLCFG-FORM-001 ~ 005, 009 ~ 014, 018
 */
test.describe("新增合同配置", () => {
  let billingPage: BillingConfigPage;

  test.beforeEach(async ({ authedPage }) => {
    billingPage = new BillingConfigPage(authedPage);
    await billingPage.goto();
  });

  // ─── P0 ──────────────────────────────────────────────────────────────────

  test("FT-BILLCFG-FORM-001: 新增弹窗默认值", async () => {
    await billingPage.openCreateDialog();

    // 验证弹窗打开
    await expect(billingPage.editDialog).toBeVisible();

    // 验证默认值
    await expect(billingPage.storageDaysInput).toHaveValue(
      DEFAULT_DIALOG_VALUES.storageDays,
    );
    await expect(billingPage.downloadTimesInput).toHaveValue(
      DEFAULT_DIALOG_VALUES.downloadTimes,
    );

    // 验证文件下载次数不可编辑
    await expect(billingPage.downloadTimesInput).toBeDisabled();

    // 验证样本分析总次数不可编辑
    await expect(billingPage.totalQuotaInput).toBeDisabled();

    // 验证默认存在 1 条配额行
    await expect(billingPage.getQuotaInput(0)).toBeVisible();

    await billingPage.closeDialog();
  });

  test("FT-BILLCFG-FORM-002: 必填项校验", async () => {
    await billingPage.openCreateDialog();

    // 不填写任何内容，直接点击确定
    await billingPage.submitForm();

    // 验证弹窗未关闭
    await expect(billingPage.editDialog).toBeVisible();

    // 验证出现必填提示
    const formItems = billingPage.editDialog.locator(".el-form-item__error");
    await expect(formItems.first()).toBeVisible({ timeout: 5_000 });

    await billingPage.closeDialog();
  });

  test("FT-BILLCFG-FORM-003: 合同编号格式校验", async () => {
    await billingPage.openCreateDialog();

    // 输入非法字符
    await billingPage.contractNoInput.fill(INVALID_CONTRACT_NO);
    await billingPage.contractNoInput.press("Tab");

    // 验证格式校验提示
    const error = billingPage.editDialog
      .locator(".el-form-item__error")
      .filter({ hasText: "字母、数字" });
    await expect(error).toBeVisible({ timeout: 5_000 });

    await billingPage.closeDialog();
  });

  test("FT-BILLCFG-FORM-004: 新增合同成功", async () => {
    await billingPage.openCreateDialog();

    // 填写基础信息
    await billingPage.fillBasicInfo({
      orgName: VALID_CONTRACT.orgName,
      contractNo: `HT-UI-${Date.now()}`,
      dateRange: VALID_CONTRACT.dateRange,
      storageDays: VALID_CONTRACT.storageDays,
    });

    // 默认 1 行，再新增 1 行，合计 2 行配额
    await billingPage.addQuotaRow();

    // 填写两行配额
    await billingPage.fillQuotaRow(
      0,
      QUOTA_ROWS.single.selections,
      QUOTA_ROWS.single.quota,
    );
    await billingPage.fillQuotaRow(
      1,
      QUOTA_ROWS.multi.selections,
      QUOTA_ROWS.multi.quota,
    );

    // 验证总次数自动计算
    const totalQuota = await billingPage.totalQuotaInput.inputValue();
    expect(Number(totalQuota)).toBe(
      QUOTA_ROWS.single.quota + QUOTA_ROWS.multi.quota,
    );

    // 提交
    await billingPage.submitForm();
    await billingPage.page.waitForLoadState("networkidle");

    // 验证成功提示
    await billingPage.expectToast("新增成功");

    // 验证弹窗关闭
    await expect(billingPage.editDialog).toHaveCount(0);
  });

  test("FT-BILLCFG-FORM-009: 配额行未选择项目套餐", async () => {
    await billingPage.openCreateDialog();

    // 填写合法基础信息
    await billingPage.fillBasicInfo({
      orgName: VALID_CONTRACT.orgName,
      contractNo: `HT-UI-${Date.now()}`,
      dateRange: VALID_CONTRACT.dateRange,
      storageDays: VALID_CONTRACT.storageDays,
    });

    // 配额行不选择项目套餐，只填写配额
    await billingPage.getQuotaInput(0).fill("100");

    // 提交
    await billingPage.submitForm();

    // 验证阻止提交
    await expect(billingPage.editDialog).toBeVisible();
    await billingPage.expectToast("检测项目");

    await billingPage.closeDialog();
  });

  test("FT-BILLCFG-FORM-010: 配额行配额为空", async () => {
    await billingPage.openCreateDialog();

    await billingPage.fillBasicInfo({
      orgName: VALID_CONTRACT.orgName,
      contractNo: `HT-UI-${Date.now()}`,
      dateRange: VALID_CONTRACT.dateRange,
      storageDays: VALID_CONTRACT.storageDays,
    });

    // 选择项目套餐但不填配额
    await billingPage.fillQuotaRow(0, QUOTA_ROWS.single.selections, 0);
    await billingPage.getQuotaInput(0).fill("");

    await billingPage.submitForm();

    // 验证阻止提交
    await expect(billingPage.editDialog).toBeVisible();
    await billingPage.expectToast("样本分析次数配额");

    await billingPage.closeDialog();
  });

  test("FT-BILLCFG-FORM-014: 总次数自动汇总", async () => {
    await billingPage.openCreateDialog();

    // 添加 2 行配额
    await billingPage.addQuotaRow();

    // 填写配额值
    await billingPage.getQuotaInput(0).fill("100");
    await billingPage.getQuotaInput(0).press("Tab");
    await billingPage.getQuotaInput(1).fill("200");
    await billingPage.getQuotaInput(1).press("Tab");

    // 验证总次数 = 100 + 200 = 300
    const totalQuota = await billingPage.totalQuotaInput.inputValue();
    expect(Number(totalQuota)).toBe(300);

    // 验证总次数不可编辑
    await expect(billingPage.totalQuotaInput).toBeDisabled();

    await billingPage.closeDialog();
  });

  // ─── P1 ──────────────────────────────────────────────────────────────────

  test("FT-BILLCFG-FORM-005: 仅剩 1 行时删除按钮置灰", async () => {
    await billingPage.openCreateDialog();

    // 默认 1 行 → 删除按钮置灰
    await expect(billingPage.getRemoveRowBtn(0)).toBeDisabled();

    // 添加一行 → 两行均可删除
    await billingPage.addQuotaRow();
    await expect(billingPage.getRemoveRowBtn(0)).toBeEnabled();
    await expect(billingPage.getRemoveRowBtn(1)).toBeEnabled();

    await billingPage.closeDialog();
  });

  test("FT-BILLCFG-FORM-011: 配额非整数校验", async () => {
    await billingPage.openCreateDialog();
    await billingPage.fillBasicInfo({
      orgName: VALID_CONTRACT.orgName,
      contractNo: `HT-UI-${Date.now()}`,
      dateRange: VALID_CONTRACT.dateRange,
      storageDays: VALID_CONTRACT.storageDays,
    });

    await billingPage.fillQuotaRow(0, QUOTA_ROWS.single.selections, 0);
    await billingPage.getQuotaInput(0).fill(INVALID_QUOTA.decimal);

    await billingPage.submitForm();

    await expect(billingPage.editDialog).toBeVisible();
    await billingPage.expectToast("仅支持整数");

    await billingPage.closeDialog();
  });

  test("FT-BILLCFG-FORM-012: 级联多选", async () => {
    await billingPage.openCreateDialog();
    await billingPage.fillBasicInfo({
      orgName: VALID_CONTRACT.orgName,
      contractNo: `HT-UI-${Date.now()}`,
      dateRange: VALID_CONTRACT.dateRange,
      storageDays: VALID_CONTRACT.storageDays,
    });

    // 在同一行选择多个项目套餐
    await billingPage.fillQuotaRow(
      0,
      QUOTA_ROWS.multi.selections,
      QUOTA_ROWS.multi.quota,
    );

    // 验证级联折叠展示
    const cascader = billingPage.getQuotaProjectCascader(0);
    const tags = cascader.locator(".el-tag, .el-cascader__tags-text");
    expect(await tags.count()).toBeGreaterThan(0);

    await billingPage.closeDialog();
  });

  test("FT-BILLCFG-FORM-013: 文件下载次数只读", async () => {
    await billingPage.openCreateDialog();

    await expect(billingPage.downloadTimesInput).toBeDisabled();
    await expect(billingPage.downloadTimesInput).toHaveValue(
      DEFAULT_DIALOG_VALUES.downloadTimes,
    );

    await billingPage.closeDialog();
  });

  test("FT-BILLCFG-FORM-018: 校验失败后弹窗内容保持", async () => {
    await billingPage.openCreateDialog();

    // 填写部分合法数据
    await billingPage.fillBasicInfo({
      orgName: VALID_CONTRACT.orgName,
      contractNo: `HT-UI-${Date.now()}`,
      dateRange: VALID_CONTRACT.dateRange,
    });

    // 配额行不填（校验不通过）
    await billingPage.submitForm();

    // 验证弹窗未关闭
    await expect(billingPage.editDialog).toBeVisible();

    // 验证已填字段保持不变
    await expect(billingPage.contractNoInput).not.toHaveValue("");

    await billingPage.closeDialog();
  });
});
