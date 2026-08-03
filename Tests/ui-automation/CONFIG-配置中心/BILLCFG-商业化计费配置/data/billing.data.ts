/**
 * billing.data.ts — 测试数据
 *
 * 原则（skill §7）：不凭空编造数据，优先复用系统已有数据。
 * 以下标「⚠️ 待回填」的字段须首轮探索页面后填入真实值。
 */

/**
 * 测试目标地址（取自 03-测试用例文档.md §2.1 前端入口，不拼接）。
 * skill §2.2 硬规则：目标地址直接取自测试文档，禁止从记忆/历史会话取。
 */
export const TARGET_URL = 'http://localhost:7001/config/billingConfig';

/** 弹窗默认值（FT-FORM-001） */
export const DEFAULTS = {
  storageDays: 90,
  downloadTimes: 2,
  defaultQuotaRowCount: 1,
} as const;

/** 合同编号前缀（动态拼接 Date.now 避免重复，FT-FORM-004） */
export const CONTRACT_NO_PREFIX = 'AUTOTEST';

/**
 * 生成唯一合同编号。
 * @param caseTag 用例标签（如 FORM-004）
 * @returns 如 AUTOTEST-FORM004-1785232341234
 */
export function genContractNo(caseTag: string): string {
  return `${CONTRACT_NO_PREFIX}-${caseTag}-${Date.now()}`;
}

/** 非法合同编号（FT-FORM-003/ET-FORM-004） */
export const INVALID_CONTRACT_NO = {
  special: 'test@bad!', // 含非法字符
  over: 'a'.repeat(51), // 超 50 字符
  valid: 'TEST-001', // 合法编号（字母+数字+-）
} as const;

/** 非法配额值（FT-FORM-011） */
export const INVALID_QUOTA = {
  decimal: '3.5', // 非整数
  nonNumber: 'abc', // 非数字
  valid: '100', // 合法配额
} as const;

/**
 * 系统已有数据（⚠️ 待首轮探索页面后回填）。
 * 运行前须确认这些值在测试环境中存在。
 */
export const EXISTING_DATA = {
  // 机构名称（至少 2 个启用机构，§2.3 第1条）
  orgName: '', // ⚠️ 待回填：查询区机构下拉第一个选项
  orgName2: '', // ⚠️ 待回填：第二个机构

  // 检测项目（至少 2 个，§2.3 第2条）
  projectName: '', // ⚠️ 待回填
  projectName2: '', // ⚠️ 待回填

  // 产品套餐（至少 1 个/项目）
  productNo: '', // ⚠️ 待回填

  // 合同编号（FT-FORM-016 重复校验用）
  existingContractNo: '', // ⚠️ 待回填：同机构下已存在的合同编号

  // 行索引（需根据实际数据定位）
  consumedRow: 0, // ⚠️ 待回填：已消耗合同行号（FT-FORM-007 只读态）
  unconsumedRow: 0, // ⚠️ 待回填：未消耗合同行号（FT-FORM-006 可编辑）
  normalRow: 0, // ⚠️ 待回填：正常状态合同行号（FT-LIST-009 禁用）
  disabledRow: 0, // ⚠️ 待回填：已停用合同行号（FT-LIST-010 启用）
  terminatedRow: 0, // ⚠️ 待回填：已终止合同行号（FT-LIST-013 按钮置灰）
  emptyLinesRow: 0, // ⚠️ 待回填：无配额行合同（FT-LIST-007）
  withUsageRow: 0, // ⚠️ 待回填：有用量历史合同（FT-DETAIL-001）
  noUsageRow: 0, // ⚠️ 待回填：无消耗记录合同（FT-DETAIL-002）
  multiPageHistoryRow: 0, // ⚠️ 待回填：≥2页历史合同（FT-DETAIL-003）
} as const;

/** API URL 模式（用于 waitForApi / mock） */
export const API_PATTERNS = {
  contractPage: '**/base/quota/contract/page',
  contractDetail: '**/base/quota/contract/', // GET /{contractId}
  contractAdd: '**/base/quota/contract/add',
  contractEdit: '**/base/quota/contract/edit',
  contractToggle: '**/base/quota/contract/toggle/',
  usageDetail: '**/base/quota/usage/detail',
  usageHistory: '**/base/quota/usage/history',
  orgOptions: '**/base/authInstitution/pageInstitutions',
  projectOptions: '**/base/projects/page',
  productOptions: '**/base/products/page',
} as const;
