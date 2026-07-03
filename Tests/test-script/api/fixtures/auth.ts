import { authedClient, TEST_USER, API_BASE_URL } from '../helpers/api-client'

/**
 * 复用 Playwright 测试中的常量，保持一致
 */
export { TEST_USER, API_BASE_URL }

/**
 * Vitest 全局 setup：在所有测试开始前登录一次
 * 返回带登录态的 API 客户端
 */
export { authedClient }

/**
 * 测试环境项目编码
 */
export const PROJECT_CODE_XOME = 'XOME'

/**
 * 测试用产品编号（用于报告类别配置查询）
 */
export const TEST_PRODUCT_NO = 'DX2489'
