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
      console.error(
        `[run] ${name} 是必填项（一级模块目录名），例如 --domain CONFIG-配置中心`,
      );
      process.exit(2);
    }
    return;
  }
  if (value.includes("/") || value.includes("\\") || value.includes("..")) {
    console.error(
      `[run] ${name} 只能是单个目录段，不能包含 '/'、'\\' 或 '..'。收到：${value}`,
    );
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

// 提取 --grep 到环境变量 TEST_GREP，由 playwright.config.ts 的 grep 选项注入。
// 必要性：Windows cmd.exe 会把 --grep 正则里的 `|` 当管道符（FORM-012 被当作独立
// 命令执行报错），且 Node spawnSync shell:true 无法可靠转义该元字符。改走 env 通道
// 彻底绕开命令行解析，同时保持 `--grep` 标准用法不变。
function extractGrep(passthrough) {
  const out = [...passthrough];
  const idx = out.findIndex((a) => a.startsWith("--grep"));
  if (idx < 0) return { passthrough: out, grep: "" };
  const tok = out[idx];
  let grep = "";
  if (tok.includes("=")) {
    grep = tok.slice(tok.indexOf("=") + 1);
    out.splice(idx, 1);
  } else {
    grep = out[idx + 1] ?? "";
    out.splice(idx, 2);
  }
  return { passthrough: out, grep };
}

const { passthrough: grepFiltered, grep: grepPattern } = extractGrep(
  args.passthrough,
);
if (grepPattern) env.TEST_GREP = grepPattern;

const playwrightArgs = [
  "playwright",
  "test",
  "--config=playwright.config.ts",
  ...(args.list ? ["--list"] : []),
  ...grepFiltered,
];

console.log(
  `[run] TEST_DOMAIN_PATH=${args.domain}` +
    (args.module ? ` TEST_MODULE_PATH=${args.module}` : "") +
    (grepPattern ? ` TEST_GREP=${grepPattern}` : "") +
    ` -> npx ${playwrightArgs.join(" ")}`,
);

const result = spawnSync("npx", playwrightArgs, {
  cwd: __dirname,
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
