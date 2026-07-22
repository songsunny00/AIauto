import { test, expect } from "@playwright/test";

/**
 * 示例：接口测试复用 UI 导出的同一份登录态。
 *
 * 运行（需先确保 Tests/shared/.auth 登录态就位）：
 *   cd Tests/api-automation
 *   $env:TEST_DOMAIN_PATH = 'CONFIG-配置中心'
 *   npm run api
 *
 * 说明：playwright.api.config.ts 的 use.storageState 已指向
 * Tests/shared/.auth/<一级模块>/domain-state.json，因此内置的 request fixture
 * 会自动带上登录 cookie，等价于已登录，无需在用例里再处理登录或验证码。
 *
 * 若后端用 localStorage 里的 token 鉴权（非 cookie），改用 Tests/shared/auth/api-auth.ts 的
 * createAuthedApiContext({ extraHTTPHeaders: { Authorization: `Bearer ${token}` } })。
 */
test.describe("BILLCFG 接口复用登录态（示例）", () => {
  test("IT-CONFIG-BILLCFG-LIST-001: 已登录态可访问业务接口", async ({
    request,
  }) => {
    // TODO: 替换为真实接口路径，例如 /api/billingConfig/list
    const res = await request.get("/api/billingConfig/list");
    expect(res.status()).toBe(200);
  });
});
