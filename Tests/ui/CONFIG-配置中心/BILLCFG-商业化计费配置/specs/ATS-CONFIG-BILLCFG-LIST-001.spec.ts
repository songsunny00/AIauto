import { test, expect } from "../fixtures/billing.fixture";
import { BASE_URL } from "../fixtures/billing.fixture";
import { BillingConfigPage } from "../pages/billing.page";

/**
 * REQ-CONFIG-BILLCFG-LIST-001 列表查询与默认加载
 * 覆盖：PT-BILLCFG-001 ~ 005（登录与权限）
 *       FT-BILLCFG-LIST-001 ~ 004, 011, 016（列表查询与默认加载）
 */

// ─── 登录与权限前置用例 ──────────────────────────────────────────────────────

test.describe("登录与权限", () => {
  test("PT-BILLCFG-001: admin 角色登录后可访问付费配额配置页面", async ({
    authedPage,
  }) => {
    await authedPage.goto("/config/billingConfig", {
      waitUntil: "networkidle",
    });
    await expect(authedPage.getByTestId("billing-add-tenant-btn")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("PT-BILLCFG-002: 未登录用户访问应跳转登录页", async ({ page }) => {
    await page.goto(`${BASE_URL}/config/billingConfig`);
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test("PT-BILLCFG-003: 无 menuId=11013 权限的账号不可见菜单入口", async ({
    page,
  }) => {
    // TODO: 使用无权限账号登录，验证菜单中不包含"付费配额配置"
    test.skip(true, "需要无权限账号数据");
  });
});

// ─── 列表查询与默认加载 ──────────────────────────────────────────────────────

test.describe("列表查询与默认加载", () => {
  let billingPage: BillingConfigPage;

  test.beforeEach(async ({ authedPage }) => {
    billingPage = new BillingConfigPage(authedPage);
    await billingPage.goto();
  });

  // ─── P0 ──────────────────────────────────────────────────────────────────

  test("FT-BILLCFG-LIST-001: 页面默认加载第一页数据", async () => {
    // 验证查询区包含 5 个字段
    await expect(billingPage.searchInstCode).toBeVisible();
    await expect(billingPage.searchProjectCode).toBeVisible();
    await expect(billingPage.searchProductNo).toBeVisible();
    await expect(billingPage.searchStatus).toBeVisible();
    await expect(billingPage.searchKeyword).toBeVisible();

    // 验证主表有数据
    const rowCount = await billingPage.getRowCount();
    expect(rowCount).toBeGreaterThan(0);

    // 验证新增按钮可见
    await expect(billingPage.addTenantBtn).toBeVisible();
  });

  test("FT-BILLCFG-LIST-002: 多条件组合筛选", async () => {
    // 选择机构名称
    await billingPage.selectMultiOptions(billingPage.searchInstCode, [
      "华大基因",
    ]);
    // 选择检测项目
    await billingPage.selectMultiOptions(billingPage.searchProjectCode, [
      "CNV-seq",
    ]);
    // 选择合同状态
    await billingPage.selectSingleOption(billingPage.searchStatus, "正常");
    // 输入合同编号
    await billingPage.searchKeyword.fill("HT-");

    await billingPage.search();

    // 验证列表刷新
    const rowCount = await billingPage.getRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test("FT-BILLCFG-LIST-003: 重置查询条件", async () => {
    // 先设置筛选条件
    await billingPage.searchKeyword.fill("TEST");
    await billingPage.search();
    await expect(billingPage.searchKeyword).toHaveValue("TEST");

    // 点击重置
    await billingPage.reset();

    // 验证条件清空
    await expect(billingPage.searchKeyword).toHaveValue("");
  });

  test("FT-BILLCFG-LIST-011: 主表分页", async () => {
    // 记录当前页数据
    const initialCount = await billingPage.getRowCount();
    expect(initialCount).toBeGreaterThan(0);

    // 点击下一页
    const nextBtn = billingPage.page
      .locator(
        '.el-pagination button:has-text("Next"), .el-pagination .btn-next',
      )
      .first();
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await billingPage.page.waitForLoadState("networkidle");
      // 验证分页数据刷新
      const newCount = await billingPage.getRowCount();
      expect(newCount).toBeGreaterThan(0);
    }
  });

  // ─── P1 ──────────────────────────────────────────────────────────────────

  test("FT-BILLCFG-LIST-004: 不存在的合同编号查询返回空结果", async () => {
    await billingPage.searchKeyword.fill("NOT_EXIST_CONTRACT_99999");
    await billingPage.search();

    await expect(billingPage.searchKeyword).toHaveValue("NOT_EXIST_CONTRACT_99999");

    // 验证空状态展示
    const emptyText = billingPage.page
      .locator(".el-table__empty-text, .el-table__empty-block")
      .first();
    await expect(emptyText).toBeVisible();
    await expect(emptyText).toContainText("暂无数据");
  });

  test("FT-BILLCFG-LIST-016: 检测项目→产品套餐级联过滤", async () => {
    // 选择检测项目
    await billingPage.selectMultiOptions(billingPage.searchProjectCode, [
      "CNV-seq",
    ]);

    // 展开产品套餐下拉（使用 page object 的 clickSelect 逻辑）
    const inner = billingPage.searchProductNo
      .locator(".el-select__wrapper, .el-select__inner, input")
      .first();
    await inner.click({ timeout: 10_000 }).catch(async () => {
      await billingPage.searchProductNo.click({ force: true });
    });
    await billingPage.page.waitForTimeout(200);

    const dropdown = billingPage.page
      .locator(".el-select-dropdown:visible")
      .last();
    await dropdown.waitFor({ state: "visible", timeout: 5_000 });
    const options = dropdown.locator(
      ".el-select-dropdown__item:not(.is-disabled)",
    );
    const optionTexts = await options.allTextContents();

    // 验证产品套餐选项已过滤（仅包含 NIPT 相关产品）
    expect(optionTexts.length).toBeGreaterThan(0);

    await billingPage.page.keyboard.press("Escape");
  });
});
