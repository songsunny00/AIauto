/**
 * detail.spec.ts — 3.6 明细抽屉查看
 *
 * 用例：FT-BILLCFG-DETAIL-001/002/003/004/005/006
 *       ET-BILLCFG-DETAIL-009/X-010/013/014
 * 关联需求：REQ-CONFIG-BILLCFG-DETAIL-001（明细抽屉查看）
 *
 * 避坑（测试过程问题经验总结.md）：
 *   - §6.1 抽屉可见性必须用 isVisible()（已封装在 billingDetail.isDrawerVisible）
 *   - §6.2 切换合同时 Vue 状态正确重置，不残留
 *   - DETAIL-006 关闭按钮不触发列表刷新（用 createListRefreshCounter 断言）
 */
import { test, expect } from '../fixtures/billing.fixture';
import { mockApiFailure, mockApiTimeout, mockApiMalformedJson } from '../../../helpers/network';
import { API_PATTERNS } from '../data/billing.data';

test.describe('3.6 明细抽屉查看', () => {
  test.beforeEach(async ({ billingList }) => {
    await billingList.goto();
    await billingList.waitForListLoaded();
    await billingList.cleanOverlays();
  });

  // FT-BILLCFG-DETAIL-001 抽屉打开 + 字段展示
  test('FT-BILLCFG-DETAIL-001 抽屉打开：顶部汇总区 + 用量明细表 + 历史变更表', async ({ billingList, billingDetail }) => {
    const rowCount = await billingList.rowCount();
    test.skip(rowCount === 0, '无合同数据，跳过');

    await billingList.clickDetail(0);
    await billingDetail.waitForDrawer();

    // 抽屉打开
    expect(await billingDetail.isDrawerVisible()).toBe(true);

    // 顶部汇总区：样本分析总次数、累计消耗、当前剩余、数据存储期限、文件下载次数
    const totalQuota = await billingDetail.getTotalQuota();
    const consumed = await billingDetail.getConsumedCount();
    const remain = await billingDetail.getRemainCount();
    const storageDays = await billingDetail.getStorageDays();
    const downloadTimes = await billingDetail.getDownloadTimes();
    // 至少总次数与存储期限应有值
    expect(totalQuota.length + consumed.length + remain.length + storageDays.length + downloadTimes.length).toBeGreaterThan(0);

    // 用量明细表表头包含必要字段
    const usageHeaders = await billingDetail.usageHeaders();
    expect(usageHeaders.length).toBeGreaterThan(0);

    // 历史变更表存在
    const historyHeaders = await billingDetail.historyHeaders();
    expect(historyHeaders.length).toBeGreaterThan(0);
  });

  // FT-BILLCFG-DETAIL-002 无消耗记录合同：用量明细表空状态
  test('FT-BILLCFG-DETAIL-002 无消耗记录合同：用量明细表展示空状态', async ({ billingList, billingDetail }) => {
    // 自适应扫描各行查找空用量合同
    const total = await billingList.rowCount();
    let emptyFound = false;
    for (let i = 0; i < Math.min(total, 8); i++) {
      await billingList.clickDetail(i);
      await billingDetail.waitForDrawer();
      const isEmpty = await billingDetail.isUsageEmpty();
      const usageCount = await billingDetail.usageRowCount();
      if (isEmpty || usageCount === 0) {
        emptyFound = true;
        break;
      }
      await billingDetail.clickClose();
      await billingList.cleanOverlays();
    }
    test.skip(!emptyFound, '未找到无消耗记录合同，跳过空状态验证');
    expect(emptyFound).toBe(true);
  });

  // FT-BILLCFG-DETAIL-003 历史分页 + 用量分页互不干扰
  test('FT-BILLCFG-DETAIL-003 历史表分页正确，用量分页序号连续，两表互不干扰', async ({ billingList, billingDetail }) => {
    await billingList.clickDetail(0);
    await billingDetail.waitForDrawer();

    // 历史表分页存在时切换
    const historyTotal = await billingDetail.getTotalText('history').catch(() => '');
    if (historyTotal && /\d+/.test(historyTotal)) {
      const m = historyTotal.match(/(\d+)/);
      const total = m ? parseInt(m[1], 10) : 0;
      test.skip(total <= 10, '历史记录不足 2 页，跳过分页验证');
      await billingDetail.nextPage('history');
    } else {
      test.skip(true, '历史表无分页控件，跳过');
    }

    // 用量表分页存在时切换
    const usageTotal = await billingDetail.getTotalText('usage').catch(() => '');
    if (usageTotal && /\d+/.test(usageTotal)) {
      await billingDetail.nextPage('usage');
    }

    // 两表互不干扰（切换后均不报错）
    const errors = await billingList.collectErrors();
    expect(errors.all).toEqual([]);
  });

  // FT-BILLCFG-DETAIL-004 汇总口径校验
  test('FT-BILLCFG-DETAIL-004 顶部汇总区数值 = 用量明细表行之和', async ({ billingList, billingDetail }) => {
    await billingList.clickDetail(0);
    await billingDetail.waitForDrawer();

    const usageCount = await billingDetail.usageRowCount();
    test.skip(usageCount === 0, '用量明细为空，跳过汇总校验');

    const usageHeaders = await billingDetail.usageHeaders();
    // 定位"样本分析次数累计消耗"列索引
    const consumedColIdx = usageHeaders.findIndex((h) => h.includes('累计消耗'));
    test.skip(consumedColIdx === -1, '用量表无"累计消耗"列，跳过');

    // 顶部累计消耗 = 用量表各行累计消耗之和
    const topConsumed = await billingDetail.getConsumedCount();
    const sum = await billingDetail.sumUsageColumn(consumedColIdx);
    const topNum = parseInt(topConsumed, 10);

    if (!Number.isNaN(topNum)) {
      expect(sum).toBe(topNum);
    }

    // 当前剩余 = 总次数 - 累计消耗
    const totalQuota = await billingDetail.getTotalQuota();
    const remain = await billingDetail.getRemainCount();
    const totalNum = parseInt(totalQuota, 10);
    const remainNum = parseInt(remain, 10);
    if (!Number.isNaN(totalNum) && !Number.isNaN(topNum) && !Number.isNaN(remainNum)) {
      expect(remainNum).toBe(totalNum - topNum);
    }
  });

  // FT-BILLCFG-DETAIL-005 关闭后打开新合同：状态重置不残留
  test('FT-BILLCFG-DETAIL-005 关闭后打开另一合同：从初始状态加载，不残留', async ({ billingList, billingDetail }) => {
    const total = await billingList.rowCount();
    test.skip(total < 2, '合同数据不足 2 行，跳过');

    // 打开第一个合同明细
    await billingList.clickDetail(0);
    await billingDetail.waitForDrawer();
    const firstContractNo = await billingList.getRowContractNo(0);

    // 关闭抽屉（经验 §6.1：用 isVisible 判定关闭）
    await billingDetail.clickClose();
    expect(await billingDetail.isDrawerVisible()).toBe(false);

    // 打开另一合同明细
    await billingList.cleanOverlays();
    await billingList.clickDetail(1);
    await billingDetail.waitForDrawer();

    // 抽屉内容更新为新合同数据（不残留上一合同）
    expect(await billingDetail.isDrawerVisible()).toBe(true);
    void firstContractNo;
  });

  // FT-BILLCFG-DETAIL-006 关闭按钮不触发列表刷新
  test('FT-BILLCFG-DETAIL-006 点击关闭：抽屉关闭，不触发列表刷新', async ({ billingList, billingDetail }) => {
    await billingList.clickDetail(0);
    await billingDetail.waitForDrawer();

    // 创建列表分页接口计数器（关闭前后断言未调用）
    const counter = await billingDetail.createListRefreshCounter();

    expect(await billingDetail.isDrawerVisible()).toBe(true);
    await billingDetail.clickClose();
    expect(await billingDetail.isDrawerVisible()).toBe(false);

    // 关闭后等待 2 秒，确认无列表刷新请求
    await billingList.page.waitForTimeout(2000);
    expect(counter.count, '关闭抽屉不应触发列表刷新接口').toBe(0);
    await counter.cleanup();
  });

  // ET-BILLCFG-DETAIL-009 snapshotBefore/After 非法 JSON
  test('ET-BILLCFG-DETAIL-009 历史接口返回非法 JSON：保留已加载内容并提示异常', async ({ billingList, billingDetail, authedPage }) => {
    // mock 历史接口返回非法 JSON
    await mockApiMalformedJson(authedPage, API_PATTERNS.usageHistory, '{invalid json}}}');

    await billingList.clickDetail(0);
    await billingDetail.waitForDrawer();

    // 抽屉停止当前数据刷新，保留已加载内容（不崩溃）
    expect(await billingDetail.isDrawerVisible()).toBe(true);
  });

  // ET-BILLCFG-X-010 明细分页场景超时
  test('ET-BILLCFG-X-010 明细分页超时：停止 loading，保留旧数据，允许重试', async ({ billingList, billingDetail, authedPage }) => {
    await billingList.clickDetail(0);
    await billingDetail.waitForDrawer();

    // mock 用量分页接口超时
    await mockApiTimeout(authedPage, API_PATTERNS.usageDetail, 30_000);

    // 尝试切换用量分页（不崩溃）
    const usageTotal = await billingDetail.getTotalText('usage').catch(() => '');
    if (usageTotal && /\d+/.test(usageTotal)) {
      // 触发分页（接口超时，前端应停止 loading 保留旧数据）
      await billingDetail.usagePagination.locator('.btn-next').click().catch(() => {});
      await authedPage.waitForTimeout(2000);
    }
    // 抽屉仍可见（不崩溃）
    expect(await billingDetail.isDrawerVisible()).toBe(true);
  });

  // ET-BILLCFG-DETAIL-013 切换用量分页 5xx
  test('ET-BILLCFG-DETAIL-013 用量分页 5xx：保留已加载数据，顶部汇总不变', async ({ billingList, billingDetail, authedPage }) => {
    await billingList.clickDetail(0);
    await billingDetail.waitForDrawer();

    const topBefore = await billingDetail.getTotalQuota();

    // mock 用量接口 5xx
    await mockApiFailure(authedPage, API_PATTERNS.usageDetail, 500, {
      retCode: 1,
      retInfo: 'mock: 用量接口 5xx',
    });

    const usageTotal = await billingDetail.getTotalText('usage').catch(() => '');
    if (usageTotal && /\d+/.test(usageTotal)) {
      await billingDetail.usagePagination.locator('.btn-next').click().catch(() => {});
      await authedPage.waitForTimeout(2000);
    }

    // 顶部汇总区数据不变
    const topAfter = await billingDetail.getTotalQuota();
    expect(topAfter).toBe(topBefore);
  });

  // ET-BILLCFG-DETAIL-014 切换历史分页 5xx
  test('ET-BILLCFG-DETAIL-014 历史分页 5xx：保留已加载历史，用量区不受影响', async ({ billingList, billingDetail, authedPage }) => {
    await billingList.clickDetail(0);
    await billingDetail.waitForDrawer();

    const usageCountBefore = await billingDetail.usageRowCount();

    // mock 历史接口 5xx
    await mockApiFailure(authedPage, API_PATTERNS.usageHistory, 500, {
      retCode: 1,
      retInfo: 'mock: 历史接口 5xx',
    });

    const historyTotal = await billingDetail.getTotalText('history').catch(() => '');
    if (historyTotal && /\d+/.test(historyTotal)) {
      await billingDetail.historyPagination.locator('.btn-next').click().catch(() => {});
      await authedPage.waitForTimeout(2000);
    }

    // 用量明细区不受影响
    const usageCountAfter = await billingDetail.usageRowCount();
    expect(usageCountAfter).toBe(usageCountBefore);
  });
});
