#!/usr/bin/env node
/**
 * 一键执行 UI 测试并产出结构化 digest（供 AI Agent 生成模板风格报告）。
 *
 * 这是 `playwright-test-implementation` 技能的默认收尾入口：
 *   1) 跑 run.mjs（驱动共享 playwright.config.ts 执行测试，产出 junit.xml + 截图/trace 工件）
 *   2) 跑 gen-report.mjs（产出机械版 TEST-REPORT.md + execution-digest.json）
 *   3) 由当前会话的 AI Agent 读取 digest + report-template-regression.md + 失败工件，
 *      生成最终 TEST-REPORT.md（方式 B：无需外部密钥）。
 *
 * 用法：
 *   node run-report.mjs --domain <一级模块> [--module <二级模块>]
 *   npm run test:report -- --domain CONFIG-配置中心 [--module BILLCFG-商业化计费配置]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 仅透传 --domain / --module 给子脚本
const passthrough = [];
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === "--domain" || a === "-d" || a === "--module" || a === "-m") {
    passthrough.push(a, process.argv[++i] ?? "");
  }
}

function run(cmd, args, label) {
  console.log(`\n=== [run-report] ${label} ===`);
  const r = spawnSync(cmd, args, {
    cwd: __dirname,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return r.status ?? 1;
}

// 1) 执行测试（run.mjs 内部再调用 npx playwright test）
const testStatus = run("node", ["run.mjs", ...passthrough], "执行 Playwright 测试");
if (testStatus !== 0) {
  // 有失败/错误也继续生成报告，便于 AI 分析失败原因
  console.warn(`\n[run-report] 测试执行存在失败/错误（退出码 ${testStatus}）。仍继续生成报告以便分析。`);
}

// 2) 生成机械报告 + execution-digest.json（方式 B 的主数据源）
const reportStatus = run("node", ["gen-report.mjs", ...passthrough], "生成机械报告 + digest");
if (reportStatus !== 0) {
  console.error(`[run-report] 报告生成失败，请查看上方 gen-report.mjs 的输出。`);
  process.exit(reportStatus);
}

console.log(`\n[run-report] 已产出 execution-digest.json 与 TEST-REPORT.md（机械版）。`);
console.log(`[run-report] 下一步：AI Agent 读取 digest + report-template-regression.md 生成最终模板风格报告。`);
