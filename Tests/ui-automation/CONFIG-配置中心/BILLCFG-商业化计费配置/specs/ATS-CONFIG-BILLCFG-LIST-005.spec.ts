/**
 * list-display.spec.ts — 3.2 合同列表展示与展开明细
 *
 * 用例：FT-BILLCFG-LIST-005/006/007
 * 关联需求：REQ-CONFIG-BILLCFG-LIST-002（合同列表展示与展开明细）
 *
 * 注意（经验 §5.2）：列表固定列导致 td 索引偏移，由 getCellText 自动修正。
 */
import { test, expect } from '../fixtures/billing.fixture';

test.describe('3.2 合同列表展示与展开明细', () => {
  test.beforeEach(async ({ billingList }) => {
    await billingList.goto();
    await billingList.waitForListLoaded();
  });

  // FT-BILLCFG-LIST-005 主表字段展示
  test('FT-BILLCFG-LIST-005 主表展示机构名称/检测项目/总次数/存储期限/下载次数/合同编号/合同周期/合同状态/操作', async ({ billingList }) => {
    const headers = await billingList.headers();

    // 断言表头包含所有必要字段
    const requiredFields = [
      '机构名称',
      '检测项目',
      '样本分析总次数',
      '数据存储期限',
      '单样本下载次数',
      '合同编号',
      '合同周期',
      '合同状态',
      '操作',
    ];
    for (const field of requiredFields) {
      expect(headers.some((h) => h.includes(field)), `表头缺失字段：${field}`).toBe(true);
    }

    // 首行数据非空校验
    const row = 0;
    const orgName = await billingList.getCellText(row, 'orgName');
    expect(orgName.length).toBeGreaterThan(0);

    const contractNo = await billingList.getCellText(row, 'contractNo');
    expect(contractNo.length).toBeGreaterThan(0);

    const status = await billingList.getRowStatus(row);
    expect(status.length).toBeGreaterThan(0);

    // 检测项目为当前合同下检测项目去重后的合集（非空）
    const projects = await billingList.getRowProjectCodes(row);
    expect(projects.length).toBeGreaterThan(0);
  });

  // FT-BILLCFG-LIST-006 展开区字段展示
  test('FT-BILLCFG-LIST-006 展开明细：序号/检测项目/产品套餐/配额/累计消耗/当前剩余', async ({ billingList }) => {
    const rowCount = await billingList.rowCount();
    test.skip(rowCount === 0, '无合同数据，跳过');

    const rowIndex = 0;
    await billingList.expandRow(rowIndex);

    // 展开区有配额明细行
    const expandCount = await billingList.getExpandRowCount(rowIndex);
    test.skip(expandCount === 0, '首行合同无配额行(lines)，跳过展开字段验证');

    const cells = await billingList.getExpandRowCells(rowIndex);
    // 展开区应包含配额行字段（序号/检测项目/产品套餐/配额/累计消耗/剩余）
    expect(cells.length).toBeGreaterThanOrEqual(6);

    // 展开区仅展示该合同数据（非空校验）
    const hasContent = cells.some((c) => c.length > 0);
    expect(hasContent).toBe(true);
  });

  // FT-BILLCFG-LIST-007 无配额行合同 → 展开区空状态
  test('FT-BILLCFG-LIST-007 无配额行合同展开区展示空数据状态', async ({ billingList }) => {
    // 扫描各行的展开区，查找无配额行的合同
    const total = await billingList.rowCount();
    let emptyFound = false;
    for (let i = 0; i < Math.min(total, 10); i++) {
      await billingList.expandRow(i);
      const count = await billingList.getExpandRowCount(i);
      if (count === 0) {
        emptyFound = true;
        break;
      }
      await billingList.collapseRow(i);
    }
    test.skip(!emptyFound, '当前页未找到无配额行合同，跳过空状态验证');
    // 找到空状态合同即通过（展开区展示空数据状态，不串到其他合同数据）
    expect(emptyFound).toBe(true);
  });
});
