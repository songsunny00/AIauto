import { test as base, Page, expect } from "@playwright/test";
import * as path from "path";

export const TEST_USER = {
  username: process.env.TEST_USERNAME || "",
  password: process.env.TEST_PASSWORD || "",
};

export const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:30080";
export const BILLING_CONFIG_URL = `${BASE_URL}/config/billingConfig`;

function readRequiredSegment(name: string) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} is required and must be a single directory segment`);
  }
  if (value.includes("/") || value.includes("\\") || value.includes("..")) {
    throw new Error(`${name} must be a single directory segment`);
  }
  return value;
}

// 消费一级模块共享登录态：Tests/shared/.auth/<一级模块>/domain-state.json
// 与 Tests/api-automation 接口用例、capture-auth.ts 共用同一份
const TEST_DOMAIN_PATH = readRequiredSegment("TEST_DOMAIN_PATH");
const AUTH_STATE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "shared",
  ".auth",
  TEST_DOMAIN_PATH,
  "domain-state.json",
);

type AuthFixtures = {
  authedPage: Page;
};

/**
 * authedPage fixture: creates a new browser context with the saved storage state
 * (cookies + localStorage from global-setup.ts). Tests that need authentication
 * use this fixture; tests that need unauthenticated access use the default { page }.
 *
 * BILLCFG 专属预热（projectCodeList）放在本模块 fixture，而不是共享 global-setup.ts。
 */
export const test = base.extend<AuthFixtures>({
  authedPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: AUTH_STATE_PATH });

    // 模块特化预热：若 global-setup 已写入 User1，则派生 projectCodeList 到 localStorage
    await context.addInitScript(() => {
      if (localStorage.getItem("projectCodeList")) return;
      const rawUserStore = localStorage.getItem("User1");
      if (!rawUserStore) return;
      try {
        const parsed = JSON.parse(rawUserStore);
        const userInfo = parsed?.userInfo || {};
        const projectCodes: string[] = userInfo.projectCodes || [];
        const projectNames: string[] = userInfo.projectNames || [];
        if (!projectCodes.length) return;
        const projectCodeList = projectCodes.map((code: string, index: number) => ({
          label: projectNames[index] || code,
          value: code,
          status: 1,
        }));
        localStorage.setItem("projectCodeList", JSON.stringify(projectCodeList));
      } catch {
        // ignore
      }
    });

    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
