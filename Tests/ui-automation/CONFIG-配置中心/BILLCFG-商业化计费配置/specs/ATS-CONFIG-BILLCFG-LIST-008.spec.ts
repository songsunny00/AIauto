/**
 * list-status.spec.ts — 3.3 合同状态展示与启停控制
 *
 * 用例：FT-BILLCFG-LIST-008/009/010
 * 关联需求：REQ-CONFIG-BILLCFG-LIST-003（合同状态展示与启停控制）
 *
 * 状态颜色映射（billing-texts.ts）：
 *   正常=success(绿)、即将到期=warning(橙)、已到期=info(灰)、已停用=danger(红)
 *
 * 数据策略：用 findRowByStatus / findRowByToggleText 自适应定位，数据缺失时 skip。
 */
import { test, expect } from '../fixtures/billing.fixture';
import { confirmMessageBox, isMessageBoxVisible } from '../../../helpers/element-plus';
import { STATUS_TEXTS, STATUS_TAG_TYPE, TOAST_TEXTS } from '../data/billing-texts';

test.describe('3.3 合同状态展示与启停控制', () => {
  test.beforeEach(async ({ billingList }) => {
    await billingList.goto();
    await billingList.waitForListLoaded();
  });

  // FT-BILLCFG-LIST-008 状态标签文案与颜色匹配
  test('FT-BILLCFG-LIST-008 状态标签文案与颜色匹配（正常绿/即将到期橙/已到期灰/已停用红）', async ({ billingList }) => {
    const dist = await billingList.getStatusDistribution();
    const present = Object.keys(dist);

    // 逐个验证已存在状态的颜色
    const checks: Array<{ text: string; type: string }> = [];
    for (const [text, count] of Object.entries(dist)) {
      if (count > 0 && STATUS_TAG_TYPE[text]) {
        checks.push({ text, type: STATUS_TAG_TYPE[text] });
      }
    }
    test.skip(checks.length === 0, '当前页无已知状态合同，跳过颜色验证');

    for (const { text, type } of checks) {
      const row = await billingList.findRowByStatus(text);
      expect(row).toBeGreaterThanOrEqual(0);
      const statusText = await billingList.getRowStatus(row);
      expect(statusText).toBe(text);
      const tagType = await billingList.getRowStatusTagType(row);
      expect(tagType, `状态"${text}"颜色应为 ${type}，实际 ${tagType}`).toBe(type);
    }
    void present;
  });

  // FT-BILLCFG-LIST-009 禁用合同：取消不发起变更，确认后禁用成功
  test('FT-BILLCFG-LIST-009 禁用合同：取消不发请求，确认后状态变已停用', async ({ billingList, authedPage }) => {
    const row = await billingList.findRowByToggleText('禁用');
    test.skip(row === -1, '当前页无可禁用（启用中）合同，跳过');

    // 第1步：点击"禁用"
    await billingList.clickToggleOnly(row);
    expect(await isMessageBoxVisible(authedPage)).toBe(true);

    // 第2步：点击"取消" → 不发起状态变更
    const cancelResp = authedPage.waitForResponse(
      (r) => r.url().includes('toggle') && r.request().method() === 'POST',
      { timeout: 3000 },
    ).catch(() => null);
    await billingList.clickToggle(row, false);
    expect(await cancelResp).toBeNull();

    // 第3步：再次点击"禁用"
    await billingList.clickToggleOnly(row);
    expect(await isMessageBoxVisible(authedPage)).toBe(true);

    // 第4步：点击"确认" → 提示禁用成功
    await billingList.clickToggle(row, true);

    const success = await billingList.collectErrors().then(() =>
      authedPage.locator('.el-message__content').allTextContents(),
    );
    // 验证成功 toast
    let ok = false;
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const toasts = await authedPage.locator('.el-message__content').allTextContents();
      if (toasts.some((t) => t.includes(TOAST_TEXTS.disableSuccess))) {
        ok = true;
        break;
      }
      await authedPage.waitForTimeout(200);
    }
    expect(ok, `未出现禁用成功 toast "${TOAST_TEXTS.disableSuccess}"，实际：${JSON.stringify(success)}`).toBe(true);

    // 状态变为已停用，操作按钮切换为"启用"
    const newStatus = await billingList.getRowStatus(row);
    expect(newStatus).toBe(STATUS_TEXTS.DISABLED);
    const newBtnText = await billingList.getToggleButtonText(row);
    expect(newBtnText).toBe('启用');
  });

  // FT-BILLCFG-LIST-010 启用合同：确认后状态按到期日重新显示
  test('FT-BILLCFG-LIST-010 启用合同：确认后状态变为正常/即将到期/已到期之一', async ({ billingList, authedPage }) => {
    const row = await billingList.findRowByToggleText('启用');
    test.skip(row === -1, '当前页无可启用（已停用）合同，跳过');

    await billingList.clickToggle(row, true);

    // 验证启用成功 toast
    let ok = false;
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const toasts = await authedPage.locator('.el-message__content').allTextContents();
      if (toasts.some((t) => t.includes(TOAST_TEXTS.enableSuccess))) {
        ok = true;
        break;
      }
      await authedPage.waitForTimeout(200);
    }
    expect(ok, `未出现启用成功 toast "${TOAST_TEXTS.enableSuccess}"`).toBe(true);

    // 状态按到期日重新显示为正常/即将到期/已到期之一
    const newStatus = await billingList.getRowStatus(row);
    const validStatuses = [STATUS_TEXTS.NORMAL, STATUS_TEXTS.EXPIRING_SOON, STATUS_TEXTS.EXPIRED];
    expect(validStatuses).toContain(newStatus);

    // 操作按钮切换为"禁用"
    const newBtnText = await billingList.getToggleButtonText(row);
    expect(newBtnText).toBe('禁用');
    void confirmMessageBox;
  });
});
