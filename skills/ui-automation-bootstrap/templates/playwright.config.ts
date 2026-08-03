/**
 * playwright.config.ts — UI 自动化测试配置入口（运行时作用域版）
 *
 * 架构要点：
 * - 运行时作用域：--domain（必填）/--module（可选）经 run.mjs 注入 TEST_DOMAIN_PATH/TEST_MODULE_PATH，
 *   一个 config 跑任意一级/二级模块，无需为本模块改代码。
 * - workers=1 串行执行（避免登录态竞争 + 写操作数据污染）。
 * - globalSetup 校验 storageState 有效性，失效时唤起有头浏览器人工过码。
 * - storageState 经 use 注入（authStatePath 安全网），fixture 层亦显式注入。
 * - 报告输出随运行粒度落盘：一级模块全量 -> all-modules；单二级模块 -> <module>。
 * - 浏览器 channel 由 PW_BROWSER_CHANNEL 决定（msedge/chrome/留空=自带 chromium）。
 *
 * 环境与账号：通过 Tests/.env 配置（依赖与 .env 均上提到 Tests/ 级，单一来源）。
 */
import { defineConfig, devices } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { authStatePath } from "../shared/auth/auth-state";

// ---- 加载 Tests/.env 到 process.env（config/global-setup/fixture 统一读取）----
const ENV_FILE = path.join(__dirname, "..", ".env");
if (fs.existsSync(ENV_FILE)) {
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

// ---- 运行时作用域解析（TEST_DOMAIN_PATH 必填，TEST_MODULE_PATH 可选）----
function readScopeSegment(
  envName: "TEST_DOMAIN_PATH" | "TEST_MODULE_PATH",
  required: boolean,
): string | undefined {
  const raw = process.env[envName];
  if (raw == null) {
    if (required) {
      throw new Error(
        `[playwright.config] ${envName} 必填（单个目录段，不能含 '/'、'\\'、'..'）。请通过 run.mjs --domain <一级模块> 传入。`,
      );
    }
    return undefined;
  }
  const value = raw.trim();
  if (
    !value ||
    value.includes("/") ||
    value.includes("\\") ||
    value.includes("..")
  ) {
    throw new Error(
      `[playwright.config] ${envName} 必须是单个目录段，不能为空或含 '/'、'\\'、'..'。收到：${JSON.stringify(raw)}`,
    );
  }
  return value;
}

function treeHasSpecFiles(rootDir: string): boolean {
  for (const ent of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (ent.isFile() && ent.name.endsWith(".spec.ts")) return true;
    if (ent.isDirectory() && treeHasSpecFiles(path.join(rootDir, ent.name)))
      return true;
  }
  return false;
}

function domainHasSpecFiles(domainDir: string): boolean {
  return fs.readdirSync(domainDir, { withFileTypes: true }).some((ent) => {
    if (!ent.isDirectory()) return false;
    const specsDir = path.join(domainDir, ent.name, "specs");
    return (
      fs.existsSync(specsDir) &&
      fs.statSync(specsDir).isDirectory() &&
      treeHasSpecFiles(specsDir)
    );
  });
}

const testDomainPath = readScopeSegment("TEST_DOMAIN_PATH", true)!;
const testModulePath = readScopeSegment("TEST_MODULE_PATH", false);

// testDir / testMatch 随粒度变化：单二级模块 -> 只扫该模块 specs；一级模块全量 -> 扫所有 <module>/specs
const testDir = testModulePath
  ? path.join(__dirname, testDomainPath, testModulePath, "specs")
  : path.join(__dirname, testDomainPath);
// 模块粒度已在 specs/ 内，用 **/*.spec.ts；一级模块粒度需强制 specs/ 约定，避免误扫模块根
const testMatch = testModulePath ? "**/*.spec.ts" : "**/specs/**/*.spec.ts";

if (!fs.existsSync(testDir) || !fs.statSync(testDir).isDirectory()) {
  throw new Error(
    `[playwright.config] 解析到的 testDir 不存在：${testDir}。检查 TEST_DOMAIN_PATH=${JSON.stringify(testDomainPath)}${testModulePath ? ` 与 TEST_MODULE_PATH=${JSON.stringify(testModulePath)}` : ""}。`,
  );
}
if (testModulePath) {
  if (!treeHasSpecFiles(testDir)) {
    throw new Error(
      `[playwright.config] 模块 specs 目录内无 '*.spec.ts'：${testDir}。`,
    );
  }
} else if (!domainHasSpecFiles(testDir)) {
  throw new Error(
    `[playwright.config] 一级模块目录内无 '<module>/specs/*.spec.ts'：${testDir}。`,
  );
}

// 报告目录随运行粒度变化
const reportBaseDir = testModulePath
  ? `./test-reports/${testDomainPath}/${testModulePath}`
  : `./test-reports/${testDomainPath}/all-modules`;

// 浏览器 channel：留空=自带 chromium；msedge/chrome=系统浏览器
const browserChannel = process.env.PW_BROWSER_CHANNEL || "";

// grep 过滤：由 run.mjs 把 --grep 值提取到 TEST_GREP（绕开 Windows cmd 对 | 的管道解析）。
// 无 TEST_GREP 时为 undefined，不影响全量执行。
function buildGrep(): RegExp | undefined {
  const raw = process.env.TEST_GREP;
  if (!raw) return undefined;
  try {
    return new RegExp(raw);
  } catch (e) {
    throw new Error(
      `[playwright.config] TEST_GREP 不是合法正则：${JSON.stringify(raw)}（${(e as Error).message}）`,
    );
  }
}

export default defineConfig({
  testDir,
  testMatch,
  grep: buildGrep(),
  globalSetup: require.resolve("./global-setup.ts"),

  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0, // 首轮建设期不重试，便于暴露真实问题
  workers: 1, // 串行：避免登录态竞争与写操作数据污染
  fullyParallel: false,

  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:7001",
    storageState: authStatePath(testDomainPath), // 安全网：所有上下文默认带登录态
    viewport: { width: 1440, height: 900 },
    locale: "zh-CN",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },

  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: path.join(__dirname, reportBaseDir, "html"),
        open: "never",
      },
    ],
    ["junit", { outputFile: path.join(__dirname, reportBaseDir, "junit.xml") }],
  ],

  projects: [
    {
      name: "chromium",
      use: browserChannel
        ? { ...devices["Desktop Chrome"], channel: browserChannel }
        : { ...devices["Desktop Chrome"] },
    },
  ],

  outputDir: path.join(__dirname, reportBaseDir, "artifacts"),
});
