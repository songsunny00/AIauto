import { describe, it, expect } from 'vitest'
import { apiClient, TEST_USER, authedClient, rsaEncrypt } from './helpers/api-client'

/**
 * 登录接口测试
 * 接口：POST /base/system/login
 *
 * 登录流程（与前端 src/store/user.ts 一致）：
 * 1. 使用 RSA 公钥加密 userName 和 passWord
 * 2. 发送 { userName: encrypted, passWord: encrypted }
 * 3. 响应体结构：{ retCode, retInfo, result: { token, ... } }
 */
describe('POST /base/system/login 登录接口', () => {
  it('LOGIN-001 正确账号密码登录成功', async () => {
    const res = await apiClient()
      .post('/base/system/login')
      .type('json')
      .send({
        userName: rsaEncrypt(TEST_USER.username),
        passWord: rsaEncrypt(TEST_USER.password),
      })
      .set('lang', 'zh_CN')

    expect(res.status).toBe(200)
    expect(res.body.retCode).toBe(0)

    // 验证返回数据包含 token
    expect(res.body.result?.token).toBeTruthy()
  })

  it('LOGIN-002 错误密码登录失败', async () => {
    const res = await apiClient()
      .post('/base/system/login')
      .type('json')
      .send({
        userName: rsaEncrypt(TEST_USER.username),
        passWord: rsaEncrypt('wrong_password_123'),
      })
      .set('lang', 'zh_CN')

    // 登录失败：retCode 不为 0
    expect(res.body.retCode).not.toBe(0)
  })

  it('LOGIN-003 空用户名登录失败', async () => {
    const res = await apiClient()
      .post('/base/system/login')
      .type('json')
      .send({
        userName: rsaEncrypt(''),
        passWord: rsaEncrypt(TEST_USER.password),
      })
      .set('lang', 'zh_CN')

    expect(res.body.retCode).not.toBe(0)
  })

  it('LOGIN-004 登录后可获取用户菜单', async () => {
    const client = await authedClient()

    const res = await client.post('/base/user/getUserMenus')

    expect(res.status).toBe(200)
    expect(res.body.retCode).toBe(0)
    // 菜单应该在 result.menu 中
    expect(res.body.result).toBeTruthy()
  })
})
