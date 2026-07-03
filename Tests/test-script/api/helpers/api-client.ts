import supertest from 'supertest'
import { expect } from 'vitest'
import crypto from 'crypto'

/**
 * API 基础配置
 * 对应 Playwright 测试中的 BASE_URL
 */
export const API_BASE_URL = 'http://10.17.227.10:30080/api'

/**
 * 测试账号（报告配置维护人员）
 */
export const TEST_USER = {
  username: 'shl',
  password: '@admin123',
}

/**
 * RSA 公钥（与前端 src/utils/jsencrypt.ts 保持一致）
 */
const PUBLIC_KEY =
  'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAMVlSrnimCsDHMNIcAtDEJMJBKSgsyitizolJIV1rzInvAwDNhaX5TBohzVY/hqkKgbAwMiysfoJ5TaD14slzIsCAwEAAQ=='

/**
 * RSA 加密工具（Node.js 原生实现，替代浏览器的 jsencrypt）
 * 与前端 src/utils/jsencrypt.ts 使用相同的公钥和 PKCS#1 v1.5 padding
 */
function rsaEncrypt(plainText: string): string {
  const derBuffer = Buffer.from(PUBLIC_KEY, 'base64')
  const publicKey = crypto.createPublicKey({
    key: derBuffer,
    format: 'der',
    type: 'spki',
  })
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(plainText, 'utf8')
  )
  return encrypted.toString('base64')
}

/**
 * 创建一个 supertest 实例（无登录态）
 */
export function apiClient() {
  return supertest(API_BASE_URL)
}

/**
 * 创建一个带登录态的 API 客户端
 * 自动携带 omics-vtk token 和 lang 请求头
 *
 * 登录流程：
 * 1. 使用 RSA 公钥加密 userName 和 passWord
 * 2. POST /base/system/login 发送加密后的凭证
 * 3. 从响应 result.token 获取 token
 * 4. 后续请求自动携带 omics-vtk 请求头
 */
export async function authedClient() {
  const client = supertest.agent(API_BASE_URL)

  // 加密用户名和密码（与前端 src/store/user.ts 逻辑一致）
  const encryptedUserName = rsaEncrypt(TEST_USER.username)
  const encryptedPassWord = rsaEncrypt(TEST_USER.password)

  // 调用登录接口
  const res = await client
    .post('/base/system/login')
    .type('json')
    .send({ userName: encryptedUserName, passWord: encryptedPassWord })
    .set('lang', 'zh_CN')

  // 从响应中提取 token（返回数据在 result 字段中）
  const token = res.body?.result?.token
  if (!token) {
    throw new Error(
      `登录失败，未获取到 token。响应: ${JSON.stringify(res.body)}`
    )
  }

  // 后续请求自动携带 token
  client.use((req: any) => {
    req.set('omics-vtk', token)
    req.set('lang', 'zh_CN')
    return req
  })

  return client
}

/**
 * 通用响应断言工具
 */
export const apiMatchers = {
  /** 断言接口成功：retCode === 0 */
  toBeSuccess(res: supertest.Response) {
    expect(res.status).toBe(200)
    expect(res.body.retCode).toBe(0)
  },

  /** 断言接口失败：retCode !== 0 */
  toBeFailed(res: supertest.Response, expectedCode?: number) {
    if (expectedCode) {
      expect(res.body.retCode).toBe(expectedCode)
    } else {
      expect(res.body.retCode).not.toBe(0)
    }
  },
}

// 导出加密工具供测试用例使用
export { rsaEncrypt }
