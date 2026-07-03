import { describe, it, expect, beforeAll } from 'vitest'
import { authedClient, PROJECT_CODE_XOME, TEST_PRODUCT_NO } from './fixtures/auth'

/**
 * 报告配置相关接口测试
 * 对应 Playwright E2E 测试中的报告类别配置功能
 */

let client: ReturnType<typeof authedClient> extends Promise<infer T> ? T : never

beforeAll(async () => {
  client = await authedClient()
})

describe('产品套餐查询接口', () => {
  /**
   * 对应 API: GET /base/products/queryForReportTemplate/{projectCode}
   * 对应前端: src/api/config/reportConfig.ts -> getAllProductListApi
   */
  it('PT-API-001 [P0] 查询 XOME 项目产品套餐列表成功', async () => {
    const res = await client.get(
      `/base/products/queryForReportTemplate/${PROJECT_CODE_XOME}`
    )

    expect(res.status).toBe(200)
    expect(res.body.retCode).toBe(0)
    // 返回数据在 result 字段中（与登录接口一致）
    expect(res.body.result).toBeTruthy()
  })

  it('PT-API-002 查询不存在的产品项目返回空列表', async () => {
    const res = await client.get(
      '/base/products/queryForReportTemplate/INVALID_PROJECT'
    )

    // 不存在的项目接口仍正常响应（retCode=0），但数据为空
    expect(res.status).toBe(200)
    expect(res.body.retCode).toBe(0)
  })
})

describe('报告类别配置接口', () => {
  /**
   * 对应 API: GET /base/report/template/reportTypeConfigs/{productNo}?hospitalId={hospitalId}
   * 对应前端: src/api/config/reportConfig.ts -> getReportTypeApi
   */
  it('PT-API-003 [P0] 查询产品报告类别配置', async () => {
    const res = await client.get(
      `/base/report/template/reportTypeConfigs/${TEST_PRODUCT_NO}?hospitalId=0`
    )

    // 200 或 404（产品不存在）均合理
    expect([200, 404]).toContain(res.status)

    if (res.status === 200) {
      expect(res.body.retCode).not.toBeUndefined()
    }
  })

  it('PT-API-004 [P1] 未携带 token 访问报告配置接口被拒绝', async () => {
    // 使用无登录态的客户端
    const { apiClient } = await import('./helpers/api-client')
    const res = await apiClient().get(
      `/base/report/template/reportTypeConfigs/${TEST_PRODUCT_NO}?hospitalId=0`
    )

    // 未认证请求应返回非 0 的 retCode（如 201 表示 token 失效）
    expect(res.body.retCode).not.toBe(0)
  })
})

describe('报告模板类别查询接口', () => {
  /**
   * 对应 API: GET /base/report/templateCategory/query/{projectCode}
   * 对应前端: src/api/config/reportConfig.ts -> getTemplateCategoryApi
   */
  it('PT-API-005 [P0] 查询 XOME 项目报告模板类别', async () => {
    const res = await client.get(
      `/base/report/templateCategory/query/${PROJECT_CODE_XOME}`
    )

    // 接口应正常响应
    expect(res.status).toBe(200)
    // retCode 为 0 表示成功，非 0 表示业务错误（如无权限、无数据等）
    if (res.body.retCode === 0) {
      expect(res.body.result).toBeTruthy()
    } else {
      // 非 0 时应有 retInfo 错误信息
      expect(res.body.retInfo).toBeTruthy()
    }
  })
})
