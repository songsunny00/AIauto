import { defineConfig, devices } from "@playwright/test";

declare const __dirname: string;
declare const process: { env: Record<string, string | undefined> };
declare function require(name: string): any;

const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(__dirname, ".env"));

function readTestScopeSegment(
  envName: "TEST_DOMAIN_PATH" | "TEST_MODULE_PATH",
  required: boolean,
) {
  const rawValue = process.env[envName];

  if (rawValue == null) {
    if (required) {
      throw new Error(
        `[playwright.config] ${envName} is required and must be a single directory segment (must not be empty or contain '/', '\\', or '..').`,
      );
    }

    return undefined;
  }

  const value = rawValue.trim();
  if (!value || value.includes("/") || value.includes("\\") || value.includes("..")) {
    throw new Error(
      `[playwright.config] ${envName} must be a single directory segment and must not be empty or contain '/', '\\', or '..'. Received: ${JSON.stringify(rawValue)}.`,
    );
  }

  return value;
}

function directoryTreeHasSpecFiles(rootDir: string) {
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".spec.ts")) {
      return true;
    }

    if (entry.isDirectory() && directoryTreeHasSpecFiles(path.join(rootDir, entry.name))) {
      return true;
    }
  }

  return false;
}

function domainContainsSpecFiles(domainDir: string) {
  return fs.readdirSync(domainDir, { withFileTypes: true }).some((entry: any) => {
    if (!entry.isDirectory()) {
      return false;
    }

    const specsDir = path.join(domainDir, entry.name, "specs");
    return (
      fs.existsSync(specsDir) &&
      fs.statSync(specsDir).isDirectory() &&
      directoryTreeHasSpecFiles(specsDir)
    );
  });
}

function resolveRuntimeScope() {
  const testDomainPath = readTestScopeSegment("TEST_DOMAIN_PATH", true);
  const testModulePath = readTestScopeSegment("TEST_MODULE_PATH", false);
  const testDir = testModulePath
    ? `./${testDomainPath}/${testModulePath}/specs`
    : `./${testDomainPath}`;
  const testMatch = testModulePath ? "**/*.spec.ts" : "**/specs/**/*.spec.ts";
  const resolvedTestDir = testModulePath
    ? path.join(__dirname, testDomainPath, testModulePath, "specs")
    : path.join(__dirname, testDomainPath);

  if (!fs.existsSync(resolvedTestDir) || !fs.statSync(resolvedTestDir).isDirectory()) {
    throw new Error(
      `[playwright.config] Resolved testDir does not exist: ${resolvedTestDir}. Check TEST_DOMAIN_PATH=${JSON.stringify(testDomainPath)}${testModulePath ? ` and TEST_MODULE_PATH=${JSON.stringify(testModulePath)}` : ""}.`,
    );
  }

  if (testModulePath) {
    if (!directoryTreeHasSpecFiles(resolvedTestDir)) {
      throw new Error(
        `[playwright.config] No '*.spec.ts' files were found in module specs directory: ${resolvedTestDir}. Check TEST_DOMAIN_PATH=${JSON.stringify(testDomainPath)} and TEST_MODULE_PATH=${JSON.stringify(testModulePath)}.`,
      );
    }
  } else if (!domainContainsSpecFiles(resolvedTestDir)) {
    throw new Error(
      `[playwright.config] No descendant '<module>/specs/*.spec.ts' files were found in domain directory: ${resolvedTestDir}. Check TEST_DOMAIN_PATH=${JSON.stringify(testDomainPath)}.`,
    );
  }

  return { testDir, testMatch, testDomainPath, testModulePath };
}

const runtimeScope = resolveRuntimeScope();
const { testDir, testMatch, testDomainPath, testModulePath } = runtimeScope;

const reportBaseDir = testModulePath
  ? `./test-reports/${testDomainPath}/${testModulePath}`
  : `./test-reports/${testDomainPath}/all-modules`;

const browserChannel = process.env.PW_BROWSER_CHANNEL || "";

/**
 * 临时配置：去掉 globalSetup（登录态已由 CDP 实时浏览器会话导出复用），
 * 直接用 Tests/shared/.auth/CONFIG-配置中心/domain-state.json 的 storageState 运行功能用例。
 */
export default defineConfig({
  testDir: runtimeScope.testDir,
  testMatch: runtimeScope.testMatch,
  timeout: 20_000,
  retries: 0,
  workers: 1,

  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:30080",
    headless: true,
    viewport: { width: 1980, height: 1080 },
    locale: "zh-CN",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: `${reportBaseDir}/html`,
        open: "never",
      },
    ],
    [
      "junit",
      {
        outputFile: `${reportBaseDir}/junit.xml`,
      },
    ],
  ],

  projects: [
    {
      name: "chromium",
      use: browserChannel
        ? { ...devices["Desktop Chrome"], channel: browserChannel }
        : { ...devices["Desktop Chrome"] },
    },
  ],

  outputDir: `${reportBaseDir}/artifacts`,
});
