/**
 * capture-auth.ts — 有头浏览器人工过滑块验证码 → 导出 storageState
 *
 * 滑块验证码无法全自动，此脚本：
 * 1. 启动有头 Chromium
 * 2. 预填用户名/密码（不点登录，留给用户 + 验证码）
 * 3. 等待用户完成登录（最长 5 分钟）
 * 4. 保存 storageState 到 domain-state.json
 *
 * 使用方式：
 *   npx tsx shared/auth/capture-auth.ts
 *   或 npm run auth:capture
 */
import { chromium } from "@playwright/test";
import { authStatePath, ensureAuthDir, loadEnv } from "./auth-state";

// 一级模块由 run.mjs --domain 注入 TEST_DOMAIN_PATH；独立运行（npm run auth:capture）时回退到 CONFIG-配置中心
const DOMAIN = process.env.TEST_DOMAIN_PATH || "CONFIG-配置中心";
const LOGIN_PATH = "/login";
// 登录后停留的目标页：默认计费配置页，多模块时可通过 TEST_AUTH_TARGET_PATH 覆盖
const TARGET_PATH =
  process.env.TEST_AUTH_TARGET_PATH || "/config/billingConfig";

/** 捕获登录态（有头浏览器人工过码）。可被 global-setup 调用，也可独立运行。 */
export async function captureAuthManual(): Promise<void> {
  const { baseUrl, username, password } = loadEnv();
  if (!username || !password) {
    console.error(
      "❌ Tests/.env 中未找到 TEST_USERNAME / TEST_PASSWORD，请先配置。",
    );
    process.exit(1);
  }

  const targetUrl = baseUrl + TARGET_PATH;
  const loginUrl = baseUrl + LOGIN_PATH;
  const outputPath = authStatePath(DOMAIN);
  ensureAuthDir(DOMAIN);

  console.log("========================================");
  console.log("  登录态捕获工具");
  console.log("========================================");
  console.log(`目标地址：${targetUrl}`);
  console.log(`账号：${username}`);
  console.log(`输出：${outputPath}`);
  console.log("");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "zh-CN",
  });
  const page = await context.newPage();

  try {
    // 1. 打开登录页
    await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // 2. 预填用户名/密码（不点登录，留给用户 + 验证码）
    await page.evaluate(
      ({ u, p }) => {
        const inputs = document.querySelectorAll("input");
        if (inputs.length >= 2) {
          (inputs[0] as HTMLInputElement).value = u;
          (inputs[0] as HTMLInputElement).dispatchEvent(
            new Event("input", { bubbles: true }),
          );
          (inputs[1] as HTMLInputElement).value = p;
          (inputs[1] as HTMLInputElement).dispatchEvent(
            new Event("input", { bubbles: true }),
          );
        }
      },
      { u: username, p: password },
    );

    console.log("⚠️  请在打开的浏览器窗口中：");
    console.log("   1. 确认用户名/密码已预填（如未填请手动输入）");
    console.log("   2. 点击登录");
    console.log("   3. 完成滑块验证码");
    console.log("   4. 等待页面跳转到计费配置页面");
    console.log("");
    console.log("⏳ 等待登录完成（最长 5 分钟）...");

    // 3. 等待用户完成登录（URL 不再含 /login）
    await page.waitForURL(
      (url) => !url.pathname.includes("/login"),
      { timeout: 300_000 }, // 5 分钟
    );

    await page.waitForTimeout(2000);

    // 4. 验证目标页面加载成功
    const addBtnVisible = await page
      .locator("[data-testid=billing-add-tenant-btn]")
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (!addBtnVisible) {
      console.warn("⚠️  登录成功但目标页面未加载到预期元素，仍将保存登录态。");
    }

    // 5. 保存 storageState
    await context.storageState({ path: outputPath });
    console.log("");
    console.log("✅ 登录态已保存到：" + outputPath);
    console.log("   后续测试将自动复用此登录态，失效时会再次唤起本工具。");
  } catch (err) {
    console.error("");
    console.error(
      "❌ 登录态捕获失败：",
      err instanceof Error ? err.message : err,
    );
    console.error("   请重试：npm run auth:capture");
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// 独立运行时自动执行（npm run auth:capture）；被 import 时不自动执行
if (require.main === module) {
  captureAuthManual();
}
