import { defineConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

function resolveAuthStatePath(): string | undefined {
  const domain = (process.env.TEST_DOMAIN_PATH || "").trim();
  if (!domain) return undefined;
  // 本文件位于 Tests/api-automation，向上一级到 Tests，再进 shared/.auth
  const p = path.join(__dirname, "..", "shared", ".auth", domain, "domain-state.json");
  return fs.existsSync(p) ? p : undefined;
}

const storageState = resolveAuthStatePath();
if (!storageState) {
  console.warn(
    "[playwright.api.config] 未找到登录态，接口将以未登录态运行。" +
      "请先执行 npm run capture:auth（手动登录导出），或确保 Tests/ui/global-setup.ts 已生成 Tests/shared/.auth/<模块>/domain-state.json。",
  );
}

/**
 * 接口自动化配置（一期：Playwright API）。
 * 复用 UI 同一份登录态 Tests/shared/.auth/<一级模块>/domain-state.json；
 * storageState 会让每个接口请求自动带上登录 cookie，无需再登录、也无需过验证码。
 *
 * 运行：
 *   cd Tests/api-automation
 *   $env:TEST_DOMAIN_PATH = 'CONFIG-配置中心'
 *   npm run api
 */
export default defineConfig({
  // 扫描 api-automation 下所有 *.api.spec.ts
  testDir: ".",
  testMatch: "**/*.api.spec.ts",
  timeout: 20_000,
  reporter: [
    ["list"],
    ["junit", { outputFile: "./test-reports/api/junit.xml" }],
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:30080",
    storageState,
  },
});
