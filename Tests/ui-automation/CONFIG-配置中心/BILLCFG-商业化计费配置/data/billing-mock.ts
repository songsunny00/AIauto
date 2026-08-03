/**
 * billing-mock.ts — ET 用例的 mock 响应体
 *
 * 用于 ET（异常测试）用例，通过 page.route() 拦截 API 返回异常响应。
 * mock 配置与 billing.data.ts 的 API_PATTERNS 对应。
 */
import { API_PATTERNS } from './billing.data';

/** Mock 失败响应（5xx） */
export const MOCK_FAILURES = {
  orgApi: {
    url: API_PATTERNS.orgOptions,
    status: 500,
    body: { retCode: 1, retInfo: 'mock: 机构接口 5xx' },
  },
  projectApi: {
    url: API_PATTERNS.projectOptions,
    status: 500,
    body: { retCode: 1, retInfo: 'mock: 项目接口 5xx' },
  },
  productApi: {
    url: API_PATTERNS.productOptions,
    status: 500,
    body: { retCode: 1, retInfo: 'mock: 产品接口 5xx' },
  },
  addApi: {
    url: API_PATTERNS.contractAdd,
    status: 500,
    body: { retCode: 1, retInfo: 'mock: 新增接口 5xx' },
  },
  editApi: {
    url: API_PATTERNS.contractEdit,
    status: 500,
    body: { retCode: 1, retInfo: 'mock: 编辑接口 5xx' },
  },
  usageDetailApi: {
    url: API_PATTERNS.usageDetail,
    status: 500,
    body: { retCode: 1, retInfo: 'mock: 用量明细接口 5xx' },
  },
  historyApi: {
    url: API_PATTERNS.usageHistory,
    status: 500,
    body: { retCode: 1, retInfo: 'mock: 历史变更接口 5xx' },
  },
} as const;

/** Mock 超时配置（ET-X-010） */
export const MOCK_TIMEOUTS = {
  contractPage: { url: API_PATTERNS.contractPage, delayMs: 30_000 },
  contractAdd: { url: API_PATTERNS.contractAdd, delayMs: 30_000 },
  usageDetail: { url: API_PATTERNS.usageDetail, delayMs: 30_000 },
} as const;

/** Mock 非法 JSON（ET-DETAIL-009：snapshotBefore/After 非法） */
export const MOCK_MALFORMED = {
  historyMalformed: {
    url: API_PATTERNS.usageHistory,
    // 故意构造非法 JSON：snapshotBefore 值不是合法 JSON 类型
    rawBody: '{"retCode":0,"data":{"records":[{"snapshotBefore":<非法>,"snapshotAfter":"ok"}]}}',
  },
} as const;

/** Mock 空数据（用于测试空状态） */
export const MOCK_EMPTY = {
  contractPageEmpty: {
    url: API_PATTERNS.contractPage,
    body: { retCode: 0, data: { records: [], total: 0, current: 1, size: 10 } },
  },
} as const;
