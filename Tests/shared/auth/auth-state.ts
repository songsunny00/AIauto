/**
 * auth-state.ts — 登录态路径解析与有效性检测
 *
 * storageState 按「一级模块」分组存放，每个模块一个 domain-state.json。
 * globalSetup 用此模块判断登录态是否有效，失效时调 capture-auth 重新生成。
 */
import * as path from "path";
import * as fs from "fs";

/** 测试根目录（Tests/） */
const TESTS_ROOT = path.resolve(__dirname, "..", "..");

/** storageState 存放根目录 */
const AUTH_ROOT = path.join(TESTS_ROOT, "shared", ".auth");

/** 一级模块 → storageState 文件路径 */
export function authStatePath(domain: string): string {
  return path.join(AUTH_ROOT, domain, "domain-state.json");
}

/** storageState 文件是否存在 */
export function authStateExists(domain: string): boolean {
  return fs.existsSync(authStatePath(domain));
}

/**
 * 检测 storageState 是否仍然有效（未过期/未跳登录页）。
 *
 * 策略：用 storageState 创建无头上下文，打开目标页面（会自动触发列表查询），
 * 依次检查：
 *   1. URL 未被重定向到 /login
 *   2. 未弹出「登录失效」MessageBox（前端 axios 拦截 401 后弹出）
 *   3. 关键元素 billing-add-tenant-btn 可见
 *
 * 关键避坑（2026-08-10 ET-019/020 调试发现）：前端为「软失效」模式——token 过期后
 * 页面按钮仍可见、列表仍渲染「暂无数据」，只有用户点击发起请求、后端返回 401 后
 * 前端才弹「登录失效」对话框。仅检查按钮可见性会误判为有效，导致所有用例点击时
 * 被对话框拦截而超时失败。必须额外检查「登录失效」对话框。
 *
 * @param browser Playwright Browser 实例
 * @param domain 一级模块名（如 'CONFIG-配置中心'）
 * @param targetUrl 目标页面完整 URL
 * @returns true=有效，false=需重新登录
 */
export async function isAuthStateValid(
  browser: import("@playwright/test").Browser,
  domain: string,
  targetUrl: string,
): Promise<boolean> {
  if (!authStateExists(domain)) return false;

  const ctx = await browser.newContext({
    storageState: authStatePath(domain),
  });
  const page = await ctx.newPage();
  try {
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });

    // 「登录失效」MessageBox：前端 axios 拦截 401 后弹出。
    // 注意 aria-label 在外层 el-overlay-message-box（role="dialog"）上，不在内层 .el-messagebox，
    // 故用 [role="dialog"][aria-label="登录失效"] 定位，避免依赖易变的 class 名。
    const authFailedDialog = page.locator(
      '[role="dialog"][aria-label="登录失效"]',
    );
    // 目标页关键元素
    const addBtn = page.locator("[data-testid=billing-add-tenant-btn]");

    // 竞速等待：按钮可见（页面加载完成）或登录失效对话框可见（token 失效），先到为准
    await Promise.race([
      addBtn.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {}),
      authFailedDialog
        .waitFor({ state: "visible", timeout: 10_000 })
        .catch(() => {}),
    ]);

    // 缓冲：token 失效时按钮可能先可见，列表查询 401 后对话框稍后弹出，留足渲染时间
    await page.waitForTimeout(2000);

    // 判定优先级：跳登录页 > 登录失效对话框 > 关键元素可见
    if (page.url().includes("/login")) return false;

    const hasAuthDialog = await authFailedDialog.isVisible().catch(() => false);
    if (hasAuthDialog) return false;

    const visible = await addBtn
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    return visible;
  } catch {
    return false;
  } finally {
    await ctx.close();
  }
}

/** 读取 Tests/.env 中的测试环境变量（capture-auth.ts 单独运行时用） */
export function loadEnv(): {
  baseUrl: string;
  username: string;
  password: string;
} {
  const envPath = path.join(TESTS_ROOT, ".env");
  const fallback = {
    baseUrl: "http://localhost:7001",
    username: "",
    password: "",
  };
  if (!fs.existsSync(envPath)) return fallback;

  const content = fs.readFileSync(envPath, "utf-8");
  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    vars[key] = val;
  }
  return {
    baseUrl: vars["TEST_BASE_URL"] || fallback.baseUrl,
    username: vars["TEST_USERNAME"] || fallback.username,
    password: vars["TEST_PASSWORD"] || fallback.password,
  };
}

/** 确保 storageState 文件的父目录存在 */
export function ensureAuthDir(domain: string): void {
  const dir = path.dirname(authStatePath(domain));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
