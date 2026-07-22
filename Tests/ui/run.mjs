#!/usr/bin/env node
/**
 * UI 测试跨平台执行脚本
 *
 * 用途：屏蔽 Windows (cmd/PowerShell) 与 Bash 之间设置中文环境变量的差异，
 * 统一以“一级模块必传、二级模块可选”的方式驱动共享 playwright.config.ts。
 *
 * 用法：
 *   node run.mjs --domain <一级模块> [--module <二级模块>] [--list] [-- <额外 playwright 参数...>]
 *
 * 示例：
 *   # 跑一级模块下全部二级模块
 *   node run.mjs --domain CONFIG-配置中心
 *
 *   # 只跑某个二级模块
 *   node run.mjs --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置
 *
 *   # 只跑单个 spec 文件
 *   node run.mjs --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置 -- specs/ATS-CONFIG-BILLCFG-LIST-001.spec.ts
 *
 *   # 仅列出用例（discovery）
 *   node run.mjs --domain CONFIG-配置中心 --list
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const parsed = { domain: "", module: "", list: false, passthrough: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") {
      parsed.passthrough.push(...argv.slice(i + 1));
      break;
    } else if (arg === "--domain" || arg === "-d") {
      parsed.domain = argv[++i] ?? "";
    } else if (arg === "--module" || arg === "-m") {
      parsed.module = argv[++i] ?? "";
    } else if (arg === "--list") {
      parsed.list = true;
    } else {
      parsed.passthrough.push(arg);
    }
  }
  return parsed;
}

function assertSegment(name, value, required) {
  if (!value) {
    if (required) {
      console.error(`[run] ${name} 是必填项（一级模块目录名），例如 --domain CONFIG-配置中心`);
      process.exit(2);
    }
    return;
  }
  if (value.includes("/") || value.includes("\\") || value.includes("..")) {
    console.error(`[run] ${name} 只能是单个目录段，不能包含 '/'、'\\' 或 '..'。收到：${value}`);
    process.exit(2);
  }
}

const args = parseArgs(process.argv.slice(2));
assertSegment("--domain", args.domain, true);
assertSegment("--module", args.module, false);

const env = { ...process.env, TEST_DOMAIN_PATH: args.domain };
if (args.module) {
  env.TEST_MODULE_PATH = args.module;
} else {
  delete env.TEST_MODULE_PATH;
}

const playwrightArgs = [
  "playwright",
  "test",
  "--config=playwright.config.ts",
  ...(args.list ? ["--list"] : []),
  ...args.passthrough,
];

console.log(
  `[run] TEST_DOMAIN_PATH=${args.domain}` +
    (args.module ? ` TEST_MODULE_PATH=${args.module}` : "") +
    ` -> npx ${playwrightArgs.join(" ")}`,
);

const result = spawnSync("npx", playwrightArgs, {
  cwd: __dirname,
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
