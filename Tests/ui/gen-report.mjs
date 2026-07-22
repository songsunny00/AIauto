#!/usr/bin/env node
/**
 * UI 测试报告生成器
 *
 * 读取 Playwright 生成的 junit.xml，整理输出一份 Markdown 测试报告。
 * 需配合 run.mjs 使用：先 `npm test -- --domain <一级模块> [--module <二级模块>]`，
 * 再 `node gen-report.mjs --domain <一级模块> [--module <二级模块>]`。
 *
 * 用法：
 *   node gen-report.mjs --domain CONFIG-配置中心
 *   node gen-report.mjs --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置
 *
 * 输出：test-reports/<一级模块>/<二级模块|all-modules>/TEST-REPORT.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = { domain: "", module: "" };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--domain" || x === "-d") a.domain = argv[++i] ?? "";
    else if (x === "--module" || x === "-m") a.module = argv[++i] ?? "";
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
if (!args.domain) {
  console.error("[gen-report] 需要 --domain <一级模块>，例如 --domain CONFIG-配置中心");
  process.exit(2);
}

const base = args.module
  ? path.join(__dirname, "test-reports", args.domain, args.module)
  : path.join(__dirname, "test-reports", args.domain, "all-modules");
const junitPath = path.join(base, "junit.xml");

if (!fs.existsSync(junitPath)) {
  console.error(
    `[gen-report] 未找到 ${path.relative(__dirname, junitPath)}\n` +
      `请先运行: npm test -- --domain ${args.domain}${args.module ? " --module " + args.module : ""}`,
  );
  process.exit(1);
}

const xml = fs.readFileSync(junitPath, "utf8");

function attrs(str) {
  const o = {};
  let m;
  const re = /(\w+)="([^"]*)"/g;
  while ((m = re.exec(str))) o[m[1]] = m[2];
  return o;
}

// 顶层 testsuites 汇总
const suitesTag = xml.match(/<testsuites\b([^>]*)>/);
const totals = suitesTag ? attrs(suitesTag[1]) : {};

// 每个 testsuite（对应一个 spec 文件）
const suites = [];
const suiteRe = /<testsuite\b([^>]*)>([\s\S]*?)<\/testsuite>/g;
let sm;
while ((sm = suiteRe.exec(xml))) {
  const sattr = attrs(sm[1]);
  const body = sm[2];
  const cases = [];
  const caseRe = /<testcase\b([^>]*)>([\s\S]*?)<\/testcase>/g;
  let cm;
  while ((cm = caseRe.exec(body))) {
    const cattr = attrs(cm[1]);
    const cbody = cm[2];
    let status = "passed";
    let message = "";
    const failM = cbody.match(/<failure\b[^>]*message="([^"]*)"/);
    if (/<failure\b/.test(cbody)) {
      status = "failed";
      message = failM ? failM[1] : "";
    } else if (/<skipped\b/.test(cbody)) {
      status = "skipped";
      const skipM = cbody.match(/<property name="skip" value="([^"]*)"/);
      message = skipM ? skipM[1] : "";
    }
    const fullName = cattr.name || "";
    const sep = fullName.indexOf(" › ");
    const group = sep >= 0 ? fullName.slice(0, sep) : "(未分组)";
    const title = sep >= 0 ? fullName.slice(sep + 3) : fullName;
    cases.push({
      group,
      title,
      time: parseFloat(cattr.time || "0"),
      status,
      message,
    });
  }
  suites.push({
    file: path.basename(sattr.name || "unknown.spec.ts"),
    tests: +sattr.tests || 0,
    failures: +sattr.failures || 0,
    skipped: +sattr.skipped || 0,
    errors: +sattr.errors || 0,
    time: parseFloat(sattr.time || "0"),
    cases,
  });
}

// 环境信息（来自 .env / package.json）
function readEnv(key) {
  const p = path.join(__dirname, ".env");
  if (!fs.existsSync(p)) return "";
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    if (t.slice(0, i).trim() === key) {
      return t.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return "";
}
const envBase = readEnv("TEST_BASE_URL");
const channel = readEnv("PW_BROWSER_CHANNEL") || "chromium(自带)";
let pwVer = "";
try {
  const pj = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
  pwVer = pj.devDependencies?.["@playwright/test"] || "";
} catch {
  // ignore
}

const totalTests = +totals.tests || 0;
const totalFail = +totals.failures || 0;
const totalSkip = +totals.skipped || 0;
const totalErr = +totals.errors || 0;
const totalPass = totalTests - totalFail - totalSkip - totalErr;
const totalTime = +totals.time || 0;

const now = new Date().toLocaleString("zh-CN");
const reportName = args.module ? `${args.domain} / ${args.module}` : `${args.domain} (全量)`;

let md = `# UI 自动化测试报告\n\n`;
md += `| 项 | 内容 |\n|---|---|\n`;
md += `| 模块范围 | ${reportName} |\n`;
md += `| 生成时间 | ${now} |\n`;
md += `| 测试环境 | ${envBase || "(未配置)"} |\n`;
md += `| 浏览器 | ${channel} |\n`;
md += `| Playwright | ${pwVer} |\n`;
md += `| 用例文件数 | ${suites.length} |\n\n`;

md += `## 一、执行概览\n\n`;
md += `| 指标 | 数量 |\n|---|---|\n`;
md += `| 总用例 | ${totalTests} |\n`;
md += `| ✅ 通过 | ${totalPass} |\n`;
md += `| ❌ 失败 | ${totalFail} |\n`;
md += `| ⏭️ 跳过 | ${totalSkip} |\n`;
md += `| ⚠️ 错误 | ${totalErr} |\n`;
md += `| 总耗时 | ${totalTime.toFixed(2)}s |\n\n`;

md += `## 二、各 Spec 文件明细\n\n`;
md += `| Spec 文件 | 用例 | 通过 | 失败 | 跳过 | 耗时(s) |\n|---|---|---|---|---|---|\n`;
for (const s of suites) {
  const pass = s.tests - s.failures - s.skipped - s.errors;
  md += `| ${s.file} | ${s.tests} | ${pass} | ${s.failures} | ${s.skipped} | ${s.time.toFixed(2)} |\n`;
}
md += `\n`;

const failedCases = suites
  .flatMap((s) => s.cases.filter((c) => c.status === "failed").map((c) => ({ file: s.file, ...c })));
md += `## 三、失败用例清单\n\n`;
if (failedCases.length) {
  for (const c of failedCases) {
    md += `### ❌ ${c.file} — ${c.title}\n`;
    if (c.message) md += `- 错误信息：${c.message}\n`;
    md += `- 分组：${c.group}\n\n`;
  }
} else {
  md += `无失败用例 ✅\n\n`;
}

const skippedCases = suites
  .flatMap((s) => s.cases.filter((c) => c.status === "skipped").map((c) => ({ file: s.file, ...c })));
if (skippedCases.length) {
  md += `## 四、跳过用例清单\n\n`;
  md += `| Spec 文件 | 用例 | 跳过原因 |\n|---|---|---|\n`;
  for (const c of skippedCases) {
    md += `| ${c.file} | ${c.title} | ${c.message || "-"} |\n`;
  }
  md += `\n`;
}

md += `## 五、产物位置\n\n`;
md += `- JUnit 原始结果：\`${path.relative(__dirname, junitPath)}\`\n`;
md += `- HTML 报告：\`test-reports/${args.domain}/${args.module || "all-modules"}/html/index.html\`\n`;
md += `- 失败截图/视频/trace：\`test-reports/${args.domain}/${args.module || "all-modules"}/artifacts/\`\n`;

const outPath = path.join(base, "TEST-REPORT.md");
fs.writeFileSync(outPath, md, "utf8");

console.log(`[gen-report] 已生成报告: ${path.relative(__dirname, outPath)}`);
console.log(
  `[gen-report] 总用例 ${totalTests} | 通过 ${totalPass} | 失败 ${totalFail} | 跳过 ${totalSkip} | 错误 ${totalErr} | 耗时 ${totalTime.toFixed(2)}s`,
);
