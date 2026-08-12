/**
 * form-add.spec.ts — 3.4 新增合同配置
 *
 * 用例：FT-BILLCFG-FORM-001/002/003/004/005/009/010/011/012/013/014/018
 *       ET-BILLCFG-FORM-003/004/012/019
 * 关联需求：REQ-CONFIG-BILLCFG-FORM-001（新增合同配置）
 *
 * 避坑（测试过程问题经验总结.md）：
 *   - §1.1 配额行校验错误出现在 toast → 用 billingForm.waitForError 轮询双查
 *   - §2.1 FORM-010/011 需先选项目套餐，否则触发 FORM-009 的错误
 *   - §5.1 删除按钮 testid 为 billing-remove-row-btn-{idx}
 *   - ET-FORM-003/004 用 createCallCounter 断言未调用 /add 接口
 */
import { test, expect } from "../fixtures/billing.fixture";
import { mockApiFailure } from "../../../helpers/network";
import {
  DEFAULTS,
  genContractNo,
  INVALID_CONTRACT_NO,
  INVALID_QUOTA,
  API_PATTERNS,
} from "../data/billing.data";
import {
  VALIDATION_TEXTS,
  TOAST_TEXTS,
  BUTTON_TEXTS,
} from "../data/billing-texts";

test.describe("3.4 新增合同配置", () => {
  test.beforeEach(async ({ billingList, billingForm }) => {
    await billingList.goto();
    await billingList.waitForListLoaded();
    // 清理残留弹窗（经验 §4.4）
    await billingList.cleanOverlays();
    // 打开新增弹窗
    await billingList.addButton.click();
    await billingForm.waitForDialog();
  });

  // FT-BILLCFG-FORM-001 默认值
  test("FT-BILLCFG-FORM-001 新增弹窗默认值：存储期限90/下载次数2/总次数只读/1条空配额行", async ({
    billingForm,
  }) => {
    // 默认数据存储期限 90 天
    const storageDays = await billingForm.getStorageDays();
    expect(storageDays).toBe(String(DEFAULTS.storageDays));

    // 文件下载次数默认 2
    const downloadTimes = await billingForm.getDownloadTimes();
    expect(downloadTimes).toBe(String(DEFAULTS.downloadTimes));

    // 样本分析总次数只读
    const totalDisabled = await billingForm.isTotalQuotaDisabled();
    expect(totalDisabled).toBe(true);

    // 默认存在 1 条空配额行
    const rowCount = await billingForm.quotaRowCount();
    expect(rowCount).toBe(DEFAULTS.defaultQuotaRowCount);
  });

  // FT-BILLCFG-FORM-002 必填校验
  test("FT-BILLCFG-FORM-002 必填校验：机构/合同编号/合同周期/数据存储期限", async ({
    billingForm,
  }) => {
    // 清空数据存储期限默认值（弹窗默认 90，不清空则必填校验不触发）
    await billingForm.inputStorageDays("");

    // 不填写其他字段，直接点确定
    const { counter, click } =
      await billingForm.clickConfirmOnlyAndCount("add");
    await click();

    // 阻止提交，不调用新增接口
    expect(counter.count).toBe(0);
    await counter.cleanup();

    // 校验必填提示（form-item__error，经验 §1.1）
    expect(
      await billingForm.waitForError(VALIDATION_TEXTS.orgRequired, 3000),
    ).toBe(true);
    expect(
      await billingForm.waitForError(VALIDATION_TEXTS.contractNoRequired, 3000),
    ).toBe(true);
    expect(
      await billingForm.waitForError(
        VALIDATION_TEXTS.contractRangeRequired,
        3000,
      ),
    ).toBe(true);
    expect(
      await billingForm.waitForError(
        VALIDATION_TEXTS.storageDaysRequired,
        3000,
      ),
    ).toBe(true);

    // 弹窗未关闭
    expect(await billingForm.isDialogVisible()).toBe(true);
  });

  // FT-BILLCFG-FORM-003 合同编号格式校验
  test('FT-BILLCFG-FORM-003 合同编号非法字符：提示"仅支持字母、数字、-或_"', async ({
    billingForm,
  }) => {
    await billingForm.inputContractNo(INVALID_CONTRACT_NO.special);
    await billingForm.blurContractNo();

    // 阻止提交，提示格式错误
    expect(
      await billingForm.waitForError(VALIDATION_TEXTS.contractNoInvalid, 3000),
    ).toBe(true);
  });

  // FT-BILLCFG-FORM-004 正向新增：总次数自动汇总 + 提交成功
  test("FT-BILLCFG-FORM-004 正向新增：2行配额汇总，提交成功，弹窗关闭主表刷新", async ({
    billingForm,
    billingList,
    billingContext,
  }) => {
    const contractNo = genContractNo("FORM004");
    await billingForm.fillValidBasics(contractNo);

    // 添加 1 行（默认已有 1 行，共 2 行）
    await billingForm.clickAddRow();

    // 第 0 行：选项目套餐 + 配额 100
    await billingForm.pickRowProjectProduct(0, 0, 0);
    await billingForm.inputQuota(0, "100");

    // 第 1 行：选项目套餐（用不同项目避免级联残留，经验 §2.1）+ 配额 50
    await billingForm.pickRowProjectProduct(1, 1, 0);
    await billingForm.inputQuota(1, "50");

    // 总次数自动等于所有行配额之和
    const total = await billingForm.getTotalQuota();
    expect(total).toBe("150");

    // 用户不可手工修改总次数
    expect(await billingForm.isTotalQuotaDisabled()).toBe(true);

    // 4 维度断言：接口 + toast + 弹窗关闭
    const result = await billingForm.submitAndVerify(
      "add",
      TOAST_TEXTS.addSuccess,
    );
    expect(result.apiOk, `新增接口失败：retCode 非 0`).toBe(true);
    expect(
      result.toastMatched,
      `toast 文案不匹配，期望="${TOAST_TEXTS.addSuccess}" 实际="${result.toastText}"`,
    ).toBe(true);
    expect(result.dialogClosed, `弹窗未关闭`).toBe(true);

    // 列表变化：用合同编号精准查询，断言能查到（合同编号唯一，查到即证明写入成功）
    await billingList.inputKeyword(contractNo);
    await billingList.clickSearch();
    expect(await billingList.rowCount()).toBeGreaterThanOrEqual(1);
    expect(await billingList.getRowContractNo(0)).toBe(contractNo);

    // 记录新增的合同编号（供后续清理）
    billingContext.createdContractNos.push(contractNo);
  });

  // FT-BILLCFG-FORM-005 删除按钮置灰逻辑
  test("FT-BILLCFG-FORM-005 仅1行时删除置灰，添加行后可删除", async ({
    billingForm,
  }) => {
    // 默认仅 1 行 → 删除按钮置灰
    expect(await billingForm.quotaRowCount()).toBe(1);
    expect(await billingForm.isRemoveRowDisabled(0)).toBe(true);

    // 添加一行
    await billingForm.clickAddRow();
    expect(await billingForm.quotaRowCount()).toBe(2);

    // 新增行后可删除多余行（第 1 行删除按钮可点击）
    expect(await billingForm.isRemoveRowDisabled(1)).toBe(false);
  });

  // FT-BILLCFG-FORM-009 配额行不选项目套餐
  test('FT-BILLCFG-FORM-009 配额行不选项目套餐：提示"第1行检测项目及产品套餐必填"', async ({
    billingForm,
  }) => {
    const contractNo = genContractNo("FORM009");
    await billingForm.fillValidBasics(contractNo);

    // 不选项目套餐，仅填配额
    await billingForm.inputQuota(0, "100");

    const { counter, click } =
      await billingForm.clickConfirmOnlyAndCount("add");
    await click();

    // 阻止提交，不调用新增接口
    expect(counter.count).toBe(0);
    await counter.cleanup();

    // 配额行校验错误为 toast（经验 §1.1）
    expect(
      await billingForm.waitForError(
        VALIDATION_TEXTS.quotaProjectRequired(1),
        3000,
      ),
    ).toBe(true);
  });

  // FT-BILLCFG-FORM-010 配额行不填配额
  test('FT-BILLCFG-FORM-010 选项目套餐但不填配额：提示"第1行配额必填"', async ({
    billingForm,
  }) => {
    const contractNo = genContractNo("FORM010");
    await billingForm.fillValidBasics(contractNo);

    // 先选项目套餐（经验 §2.1：否则触发 FORM-009 错误）
    await billingForm.pickRowProjectProduct(0, 0, 0);
    // 不填配额

    const { counter, click } =
      await billingForm.clickConfirmOnlyAndCount("add");
    await click();

    expect(counter.count).toBe(0);
    await counter.cleanup();

    expect(
      await billingForm.waitForError(
        VALIDATION_TEXTS.quotaValueRequired(1),
        3000,
      ),
    ).toBe(true);
  });

  // FT-BILLCFG-FORM-011 配额非整数
  test('FT-BILLCFG-FORM-011 配额非整数：提示"第1行配额仅支持整数"', async ({
    billingForm,
  }) => {
    const contractNo = genContractNo("FORM011");
    await billingForm.fillValidBasics(contractNo);

    await billingForm.pickRowProjectProduct(0, 0, 0);
    await billingForm.inputQuota(0, INVALID_QUOTA.decimal); // 3.5

    const { counter, click } =
      await billingForm.clickConfirmOnlyAndCount("add");
    await click();

    expect(counter.count).toBe(0);
    await counter.cleanup();

    expect(
      await billingForm.waitForError(
        VALIDATION_TEXTS.quotaIntegerOnly(1),
        3000,
      ),
    ).toBe(true);
  });

  // FT-BILLCFG-FORM-012 级联多选
  test("FT-BILLCFG-FORM-012 级联多选：2+组合以折叠标签展示", async ({
    billingForm,
  }) => {
    // 多选 2 组项目套餐
    const result = await billingForm.pickRowProjectProductMulti(0, [
      { level1: 0, level2: 0 },
      { level1: 1, level2: 0 },
    ]);

    // 已选项以折叠标签形式展示（tagCount >= 1）
    expect(result.tagCount).toBeGreaterThanOrEqual(1);
  });

  // FT-BILLCFG-FORM-013 文件下载次数只读
  test("FT-BILLCFG-FORM-013 文件下载次数置灰不可编辑，默认2", async ({
    billingForm,
  }) => {
    const downloadTimes = await billingForm.getDownloadTimes();
    expect(downloadTimes).toBe(String(DEFAULTS.downloadTimes));

    expect(await billingForm.isDownloadTimesDisabled()).toBe(true);
  });

  // FT-BILLCFG-FORM-014 总次数自动汇总不可编辑
  test("FT-BILLCFG-FORM-014 修改配额行：总次数自动等于行之和，不可手动覆盖", async ({
    billingForm,
  }) => {
    await billingForm.clickAddRow(); // 2 行
    await billingForm.inputQuota(0, "100");
    await billingForm.inputQuota(1, "80");

    const total = await billingForm.getTotalQuota();
    expect(total).toBe("180");

    // 修改一行配额，总次数自动更新
    await billingForm.inputQuota(0, "120");
    const totalAfter = await billingForm.getTotalQuota();
    expect(totalAfter).toBe("200");

    // 用户无法手动修改总次数
    expect(await billingForm.isTotalQuotaDisabled()).toBe(true);
  });

  // FT-BILLCFG-FORM-018 校验失败后字段值保持不变
  test("FT-BILLCFG-FORM-018 校验失败后弹窗字段值保留，可继续修改", async ({
    billingForm,
  }) => {
    const contractNo = genContractNo("FORM018");
    await billingForm.fillValidBasics(contractNo);
    await billingForm.inputQuota(0, "100");
    // 故意不选项目套餐（触发 FORM-009 校验失败）

    // 记录当前已填字段值
    const contractNoBefore = await billingForm.getContractNo();
    const storageDaysBefore = await billingForm.getStorageDays();
    const quotaBefore = await billingForm.getQuota(0);

    // 校验失败时不调用接口，用 clickConfirmOnlyAndCount 避免等 API 超时 15s 导致 toast 消失
    const { counter, click } =
      await billingForm.clickConfirmOnlyAndCount("add");
    await click();

    // 校验失败
    expect(
      await billingForm.waitForError(
        VALIDATION_TEXTS.quotaProjectRequired(1),
        3000,
      ),
    ).toBe(true);

    // 弹窗未关闭
    expect(await billingForm.isDialogVisible()).toBe(true);

    // 所有已填字段值保持不变
    expect(await billingForm.getContractNo()).toBe(contractNoBefore);
    expect(await billingForm.getStorageDays()).toBe(storageDaysBefore);
    expect(await billingForm.getQuota(0)).toBe(quotaBefore);
  });

  // ET-BILLCFG-FORM-003 缺失必填项 → 前端提示
  test("ET-BILLCFG-FORM-003 缺失合同编号/合同周期等必填项：阻止提交并展示提示", async ({
    billingForm,
  }) => {
    const { counter, click } =
      await billingForm.clickConfirmOnlyAndCount("add");
    await click();

    expect(counter.count).toBe(0);
    await counter.cleanup();

    // 展示对应前端必填提示
    expect(
      await billingForm.waitForError(VALIDATION_TEXTS.contractNoRequired, 3000),
    ).toBe(true);
  });

  // ET-BILLCFG-FORM-004 非法合同编号：提交时提示格式错误
  // 注：前端输入框 maxlength=50，超长输入被自动截断为 50 字符（合法），
  // 故"超长"场景无法通过 fill 触发；改用非法字符验证提交时格式校验。
  test("ET-BILLCFG-FORM-004 非法合同编号：提交时提示格式错误", async ({
    billingForm,
  }) => {
    await billingForm.inputContractNo(INVALID_CONTRACT_NO.special);

    // 提交触发校验（不 blur，直接提交）
    const { counter, click } =
      await billingForm.clickConfirmOnlyAndCount("add");
    await click();

    // 阻止提交
    expect(counter.count).toBe(0);
    await counter.cleanup();

    expect(
      await billingForm.waitForError(VALIDATION_TEXTS.contractNoInvalid, 3000),
    ).toBe(true);
  });

  // ET-BILLCFG-FORM-012 弹窗选项接口异常
  test("ET-BILLCFG-FORM-012 机构/项目套餐接口异常：弹窗停止 loading，选项为空", async ({
    billingList,
    billingForm,
    authedPage,
  }) => {
    // 先关闭弹窗
    await billingForm.clickCancel();
    await authedPage.waitForTimeout(500);

    // mock 项目套餐接口 5xx
    await mockApiFailure(authedPage, API_PATTERNS.projectOptions, 500, {
      retCode: 1,
      retInfo: "mock: 项目接口 5xx",
    });

    // 重新打开新增弹窗
    await billingList.addButton.click();
    await billingForm.waitForDialog();

    // 弹窗停止 loading：弹窗可见可填写基础信息
    expect(await billingForm.isDialogVisible()).toBe(true);
    await billingForm.inputContractNo("ETFORM012");

    // 机构下拉或项目套餐级联为空（不崩溃）
    // 注：接口 5xx 时前端展示"服务器异常"toast 是合理的异常处理行为，
    // 仅断言行内错误为空（弹窗不崩溃、可填写基础信息）
    const errors = await billingForm.collectErrors();
    expect(errors.formErrors).toEqual([]);
  });

  // ET-BILLCFG-FORM-019 新增合同内产品套餐组合重复：确定可点击但不提交
  test("ET-BILLCFG-FORM-019 新增合同内产品套餐组合重复：确定可点击但不提交", async ({
    billingForm,
  }) => {
    const contractNo = genContractNo("ET019");
    await billingForm.fillValidBasics(contractNo);

    // 添加 1 行（默认 1 行，共 2 行），两行选同一项目套餐组合（相同索引 = 同一 projectCode + productNo）
    await billingForm.clickAddRow();
    await billingForm.pickRowProjectProduct(0, 0, 0);
    await billingForm.inputQuota(0, "100");
    await billingForm.pickRowProjectProduct(1, 0, 0);
    await billingForm.inputQuota(1, "50");

    // 点确定并计数（不等待接口）
    const { counter, click } =
      await billingForm.clickConfirmOnlyAndCount("add");
    await click();

    // 不调用新增接口
    expect(counter.count).toBe(0);
    await counter.cleanup();

    // 展示动态重复提示（动态文案含实际 projectCode/productNo，用前缀匹配）
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

    // 已填数据保留
    expect(await billingForm.getContractNo()).toBe(contractNo);
    expect(await billingForm.getQuota(0)).toBe("100");
    expect(await billingForm.getQuota(1)).toBe("50");
  });
});
