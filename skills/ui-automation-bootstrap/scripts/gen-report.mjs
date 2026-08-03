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
 *   node gen-report.mjs --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置 --ai
 *
 * 输出：
 *   test-reports/<一级模块>/<二级模块|all-modules>/TEST-REPORT.md        （Markdown 报告）
 *   test-reports/<一级模块>/<二级模块|all-modules>/execution-digest.json （结构化执行结果，供 AI 生成报告）
 *
 * `--ai`：若配置了 `AI_REPORT_BASE_URL` + `AI_REPORT_API_KEY`，则调用 LLM 基于
 *         `report-template.md` 模板生成报告；否则回退机械报告，并提示
 *         在 CodeBuddy 中由 AI Agent 基于 digest 与模板生成（无需额外密钥）。
 *
 * 注意：本工程的 .env 与 package.json 统一上提到 Tests/ 级（依赖单一来源），
 *       故环境信息读取路径为 ../.env 与 ../package.json（而非本目录）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = { domain: "", module: "", ai: false };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--domain" || x === "-d") a.domain = argv[++i] ?? "";
    else if (x === "--module" || x === "-m") a.module = argv[++i] ?? "";
    else if (x === "--ai") a.ai = true;
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
if (!args.domain) {
  console.error(
    "[gen-report] 需要 --domain <一级模块>，例如 --domain CONFIG-配置中心",
  );
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

// 递归收集 artifacts 目录下的截图 / trace / 视频，并记录其直接父目录名
// （Playwright 把每个用例的工件放在“以用例命名的子目录”内，需用父目录名关联用例）
function scanArtifacts(dir) {
  const items = [];
  if (!fs.existsSync(dir)) return items;
  const walk = (p) => {
    for (const ent of fs.readdirSync(p, { withFileTypes: true })) {
      const fp = path.join(p, ent.name);
      if (ent.isDirectory()) {
        walk(fp);
        continue;
      }
      const lower = ent.name.toLowerCase();
      const isShot = /\.(png|jpe?g|gif|webp)$/.test(lower);
      const isTrace = /\.(zip|trace)$/.test(lower);
      const isVideo = /\.(webm|mp4|ogv)$/.test(lower);
      if (isShot || isTrace || isVideo) {
        items.push({
          file: fp,
          parent: path.basename(p),
          kind: isShot ? "screenshots" : isTrace ? "traces" : "videos",
        });
      }
    }
  };
  walk(dir);
  return items;
}

// 调用 OpenAI 兼容的 Chat Completions 端点生成模板报告；无密钥/失败时返回 null
async function callAI(digestText, templateText) {
  const base = process.env.AI_REPORT_BASE_URL;
  const key = process.env.AI_REPORT_API_KEY;
  const model = process.env.AI_REPORT_MODEL || "gpt-4o-mini";
  if (!base || !key) return null;
  const url = base.replace(/\/$/, "") + "/chat/completions";
  const sys =
    "你是资深测试报告分析师。基于给定的结构化执行结果(digest)与回归测试报告模板，输出最终 Markdown 测试报告。" +
    "规则：1) 不要编造用例或数据，所有数字来自 digest；2) 失败用例根因只归为 ENV/DATA/SCRIPT/DEFECT/CHANGE 之一；" +
    "3) 对失败用例给出预期vs实际、DOM状态、修复建议，并附 digest 中的截图/trace 相对路径；" +
    "4) 严格使用模板的章节结构，填满 {{占位}}，保留中文表头。";
  const user = `【报告模板】\n${templateText}\n\n【执行结果 digest】\n${digestText}\n\n请输出最终报告 Markdown（不要包裹代码块标记）。`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    }),
  });
  if (!resp.ok) throw new Error(`LLM HTTP ${resp.status}`);
  const j = await resp.json();
  return j?.choices?.[0]?.message?.content || null;
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
    const errM = cbody.match(/<error\b[^>]*message="([^"]*)"/);
    if (/<failure\b/.test(cbody)) {
      status = "failed";
      message = failM ? failM[1] : "";
    } else if (/<error\b/.test(cbody)) {
      // 修复：识别 junit <error> 标签（用例因异常错误退出，非断言失败）。
      // 原版漏识别导致 error 用例被误标为 passed（skill 固化版本修复此 bug）。
      status = "error";
      message = errM ? errM[1] : "";
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

// 环境信息（来自 Tests/.env / Tests/package.json —— 均上提到 Tests/ 级）
function readEnv(key) {
  const p = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(p)) return "";
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    if (t.slice(0, i).trim() === key) {
      return t
        .slice(i + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");
    }
  }
  return "";
}
const envBase = readEnv("TEST_BASE_URL");
const channel = readEnv("PW_BROWSER_CHANNEL") || "chromium(自带)";
let pwVer = "";
try {
  const pj = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
  );
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
const reportName = args.module
  ? `${args.domain} / ${args.module}`
  : `${args.domain} (全量)`;

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

const failedCases = suites.flatMap((s) =>
  s.cases
    .filter((c) => c.status === "failed" || c.status === "error")
    .map((c) => ({ file: s.file, ...c })),
);
md += `## 三、失败用例清单\n\n`;
if (failedCases.length) {
  for (const c of failedCases) {
    md += `### ${c.status === "error" ? "⚠️" : "❌"} ${c.file} — ${c.title}\n`;
    if (c.message) md += `- 错误信息：${c.message}\n`;
    md += `- 分组：${c.group}\n\n`;
  }
} else {
  md += `无失败用例 ✅\n\n`;
}

const skippedCases = suites.flatMap((s) =>
  s.cases
    .filter((c) => c.status === "skipped")
    .map((c) => ({ file: s.file, ...c })),
);
if (skippedCases.length) {
  md += `## 四、跳过用例清单\n\n`;
  md += `| Spec 文件 | 用例 | 跳过原因 |\n|---|---|---|\n`;
  for (const c of skippedCases) {
    md += `| ${c.file} | ${c.title} | ${c.message || "-"} |\n`;
  }
  md += `\n`;
}

// ---- 结构化 digest（供 AI 生成报告 / Agent 读取） ----
const artifactsDir = path.join(base, "artifacts");
const artifactsAll = scanArtifacts(artifactsDir);
const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[\s_/\\:.-]/g, "");
function matchArtifacts(fileBase, title) {
  // Playwright 工件目录名形如 “…-<用例核心描述>-chromium”，而 digest 的 title 带
  // “PT-BILLCFG-001: ” 这类编号前缀。取冒号后的核心描述做关联，归一化时一并去掉 : . -
  const core = norm(title.split(":").slice(1).join(":"));
  const fN = norm(fileBase);
  const pick = (kind) =>
    artifactsAll
      .filter(
        (it) =>
          it.kind === kind &&
          ((core && norm(it.parent).includes(core)) ||
            norm(it.parent).includes(fN)),
      )
      .map((it) => path.relative(__dirname, it.file).split(path.sep).join("/"));
  return {
    screenshots: pick("screenshots"),
    traces: pick("traces"),
    videos: pick("videos"),
  };
}
const digest = {
  meta: {
    reportName,
    generatedAt: now,
    domain: args.domain,
    module: args.module || null,
    baseUrl: envBase || "(未配置)",
    browser: channel,
    playwright: pwVer,
    totals: {
      tests: totalTests,
      pass: totalPass,
      fail: totalFail,
      skip: totalSkip,
      error: totalErr,
      time: totalTime,
    },
  },
  suites: suites.map((s) => ({
    file: s.file,
    tests: s.tests,
    pass: s.tests - s.failures - s.skipped - s.errors,
    fail: s.failures,
    skip: s.skipped,
    error: s.errors,
    time: s.time,
    cases: s.cases.map((c) => ({
      ...c,
      artifacts: matchArtifacts(s.file, c.title),
    })),
  })),
};
const digestPath = path.join(base, "execution-digest.json");
fs.writeFileSync(digestPath, JSON.stringify(digest, null, 2), "utf8");
console.log(
  `[gen-report] 已生成结构化 digest: ${path.relative(__dirname, digestPath)}`,
);

// ---- --ai：调用 LLM 生成模板风格报告（无密钥时回退机械报告） ----
if (args.ai) {
  const tplPath = path.join(__dirname, "report-template.md");
  const tpl = fs.existsSync(tplPath) ? fs.readFileSync(tplPath, "utf8") : "";
  try {
    const aiMd = await callAI(JSON.stringify(digest, null, 2), tpl);
    if (aiMd) {
      fs.writeFileSync(path.join(base, "TEST-REPORT.md"), aiMd, "utf8");
      console.log(
        `[gen-report] AI 报告已生成: test-reports/${args.domain}/${args.module || "all-modules"}/TEST-REPORT.md`,
      );
      console.log(
        `[gen-report] 总用例 ${totalTests} | 通过 ${totalPass} | 失败 ${totalFail} | 跳过 ${totalSkip} | 错误 ${totalErr} | 耗时 ${totalTime.toFixed(2)}s`,
      );
      process.exit(0);
    }
  } catch (e) {
    console.warn(`[gen-report] AI 调用失败（${e.message}），回退机械报告`);
  }
}

md += `## 五、产物位置\n\n`;
md += `- JUnit 原始结果：\`${path.relative(__dirname, junitPath)}\`\n`;
md += `- HTML 报告：\`test-reports/${args.domain}/${args.module || "all-modules"}/html/index.html\`\n`;
md += `- 失败截图/视频/trace：\`test-reports/${args.domain}/${args.module || "all-modules"}/artifacts/\`\n`;

if (args.ai) {
  md += `\n> 注：已传入 \`--ai\` 但未检测到 \`AI_REPORT_BASE_URL\` / \`AI_REPORT_API_KEY\`，未调用 LLM。\n`;
  md += `> 可在 CodeBuddy 会话中由 AI Agent 读取 \`execution-digest.json\` + \`report-template.md\` 生成 AI 总结版报告。\n`;
}

const outPath = path.join(base, "TEST-REPORT.md");
fs.writeFileSync(outPath, md, "utf8");

console.log(`[gen-report] 已生成报告: ${path.relative(__dirname, outPath)}`);
console.log(
  `[gen-report] 总用例 ${totalTests} | 通过 ${totalPass} | 失败 ${totalFail} | 跳过 ${totalSkip} | 错误 ${totalErr} | 耗时 ${totalTime.toFixed(2)}s`,
);
