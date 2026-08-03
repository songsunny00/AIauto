/**
 * base.fixture.ts — 基础 fixture：authedPage（消费 storageState 创建已登录上下文）
 *
 * 使用方式（在模块 fixture 中继承）：
 *   import { test } from '../../fixtures/base.fixture';
 *   export const test = base.extend<{ myPage: MyPage }>({ ... });
 */
import { test as base, expect } from "@playwright/test";
import { authStatePath } from "../../shared/auth/auth-state";

// 一级模块由 run.mjs --domain 注入 TEST_DOMAIN_PATH；与 playwright.config.ts / global-setup.ts 同源。
// 独立运行回退 .env 的 DEFAULT_DOMAIN；两者都缺则抛错，避免硬编码模块名。
const DOMAIN = process.env.TEST_DOMAIN_PATH || process.env.DEFAULT_DOMAIN || "";
if (!DOMAIN) {
  throw new Error(
    "[base.fixture] 未指定一级模块：请通过 run.mjs --domain <一级模块> 传入，或在 Tests/.env 设置 DEFAULT_DOMAIN。",
  );
}

export const test = base.extend<{
  authedPage: import("@playwright/test").Page;
}>({
  authedPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: authStatePath(DOMAIN),
      viewport: { width: 1440, height: 900 },
      locale: "zh-CN",
    });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

export { expect };
