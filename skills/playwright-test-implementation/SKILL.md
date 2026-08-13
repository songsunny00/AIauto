---
name: playwright-test-implementation
description: 以需求、测试用例与详细设计文档为主，必要时结合前端代码和失败工件核对实现，生成或维护真实可执行的 Playwright 脚本；脚本就绪后自动执行测试并生成 AI 总结的模板风格测试报告。适用于新模块首轮脚本建设、版本迭代下脚本修改、基于失败工件的失败修复。
allowed-tools: Read Glob Grep Edit Write Bash
---

# playwright-test-implementation

## 1. 目标

在 `ui-automation-bootstrap` 已产出的骨架（目录 + 含 `data-testid` 定位占位的 page/spec 骨架）基础上，填充真实交互、断言、测试数据与失败修复，输出或维护一套**真实可执行、可回归、可维护**的 Playwright 脚本，覆盖 `Tests/ui-automation/...` 下的 `specs/pages/fixtures/data` 实现，并支持：

- 新模块首轮脚本建设
- 后续版本迭代下的脚本修改
- 基于 `junit.xml` / `error-context.md` / `trace.zip` 的失败修复

脚本就绪后**必须自动完成「执行测试 → 产出 digest → 生成 AI 模板报告」三步收尾**（§13），缺一不可。

## 2. 适用输入

- `03-测试用例文档.md`、`01-需求文档.md`、`02-详细设计文档.md`（建议提供，补充字段/交互/接口/校验口径）
- 模块 `data-testid.snapshot.json`（data-testid 知识库快照：§7 intent + 脚本引用证据 `evidence` + 缺口 `gaps`）
- 相关前端页面代码 / 路由信息（必要时核对真实实现与定位点）
- 目标模块现有 `Tests/ui-automation/...` 自动化目录（如已存在）
- 失败工件：`junit.xml` / screenshot / `error-context.md` / `trace.zip`（修失败场景时）

## 3. 前置检查

开始写或改脚本前先确认：

1. 当前任务属于哪一类：**新模块起步 / 版本迭代 / 失败修复**。
2. 是否已有可复用目录，以及共享层 `playwright.config.ts`、`global-setup.ts`、`Tests/shared/.auth/` 与模块级 `fixtures`。
3. 是否已查看测试页面与系统实际数据；**不要凭空编造机构名、项目名、产品名、状态值、合同编号**。
4. 需求/详设/后端文案若已明确，文案断言是否应按**完整文案精确匹配**，而非关键词包含。
5. 前置数据或权限是否真的不存在；`test.skip(reason)` 应基于**实际页面数据检查**，不要凭静态假设直接跳过。
6. 写操作场景是否已考虑**数据隔离、回收或清理**，避免污染后续用例。
7. 当前改动是否只影响目标 `FT-*`，避免顺手重构无关脚本。
8. 是否已 `npx playwright install` 装浏览器二进制；漏装会导致 `auth:capture` / 测试报 `Executable doesn't exist`。

## 4. 工作模式

| 场景       | 重点动作                                     | 期望输出                     |
| ---------- | -------------------------------------------- | ---------------------------- |
| 新模块起步 | 从 `03` 拆 spec、补 page/fixture/data/config | 首轮可执行脚本 + 目录内说明  |
| 版本迭代   | 对照需求增量修改既有 spec/page/data          | 最小改动的脚本增量           |
| 失败修复   | 先读失败工件，再定位脚本/数据/后端问题       | 可复现、可解释、可回归的修复 |

## 5. 实现步骤

1. 从 `03` 中找出适合自动化的 `FT-*` 与**嵌入 FT/IT 表格中的 `ET-*` 异常用例**，按功能域拆到对应 `ATS-*.spec.ts`：
   - `FT-*` 与同功能域 `ET-*`（如 `FT-BILLCFG-LIST-001` 与 `ET-BILLCFG-LIST-001`）写入**同一个** spec，`ET-*` 不另立 `-ERR-` 文件。
   - `ET-*` 编号保留功能域粒度（`ET-{MODULE}-{FEATURE}-{NNN}`）用于追溯；跨域异常用 `ET-{MODULE}-X-{NNN}`，归入其主场景所在 spec。
   - 每个用例标题/标签保留原始 `FT-*` / `ET-*` 编号，确保 `03` ↔ 脚本追溯链不断。
   - **spec 命名必须沿用 bootstrap 产出的 `ATS-{一级模块}-{二级模块}-{功能域}-{起始用例号}.spec.ts`**，禁止自由命名；骨架未产出命名则按此格式补齐。
2. 先补页面对象，再写测试步骤；选择器和交互细节收敛到 `pages/*.page.ts`。
3. 测试数据统一收敛到 `data/*.data.ts`，避免在 spec 内散落字面量。
4. 使用 `global-setup.ts` + `storageState` 复用登录态，避免每条用例重复登录。
5. 断言优先验证**真实业务结果**，不要只验证 toast 是否出现。
6. 改动后先回归最小受影响 spec，再决定是否扩大回归范围。

## 6. 页面对象与夹具约定

### 6.1 选择器优先级

`data-testid` > `getByRole/name` > 稳定属性 > CSS/text 兜底。

实现 `getByTestId` 时优先从模块 `data-testid.snapshot.json` 的 `elements` 取 `testId` 并核对 `evidence`（`page-object` / `cli-script` / `intent-only` / `page-verified`）；新增或页面新发现的 `data-testid` 应回写快照 `elements` 并升级 `evidence`、刷新 `gaps`。快照以 `02-详细设计文档.md` §7 为设计意图主源，页面实际存在性以浏览器探索验证为准。

### 6.2 页面对象职责

- page object 负责：选择器、页面操作、通用等待、通用断言辅助。
- spec 负责：业务场景编排、测试数据选择、结果断言。
- 不要把大段业务判断塞进 page object。

### 6.3 夹具约定

- 默认使用已登录 `authedPage`（继承 `Tests/ui-automation/fixtures/base.fixture.ts`，详见 `reference/helpers-api.md` §5）。
- 认证态统一由 `global-setup.ts` 生成，通过 `storageState` 复用到 `Tests/shared/.auth/`。
- 非鉴权本身的用例，不要在 `beforeEach` 重新走登录流程。

## 7. 数据与环境约定

- 环境地址、账号、密码统一走 `Tests/.env` / `Tests/.env.example`（**单一来源在 `Tests/` 级，不在 `ui-automation/` 下**；含 `TEST_BASE_URL` / `TEST_USERNAME` / `TEST_PASSWORD` / `DEFAULT_DOMAIN` / `DEFAULT_AUTH_PATH`）。
- **禁止**在脚本中硬编码 `baseURL`、用户名、密码、验证码处理参数。
- 测试数据要基于系统已有数据编写；需要真实新增数据时，要明确其对后续回归的影响。
- 修改型场景必须确保形成**真实变更**，避免「写回原值」导致伪失败。
- `test.skip(reason)` 的触发应基于**实际数据检查结果**，而非静态假设某类数据不存在。
- 写操作用例默认要考虑**数据清理、专用测试数据或唯一标识隔离**；不要让新增/编辑结果污染后续用例。

动态 skip 与修改型示例：

```ts
// 动态 skip：基于实际数据检查
if (!(await billingPage.hasConsumedContract())) {
  test.skip(true, "缺少 hasConsumed=true 合同数据");
}
// 修改型：确保形成真实变更
const current = await billingPage.storageDaysInput.inputValue();
const next = current === "90" ? "120" : "90";
await billingPage.storageDaysInput.fill(next);
await billingPage.storageDaysInput.press("Tab");
```

## 8. 断言与等待规范

- 不把 `networkidle` 当主要等待手段；优先用：元素可见/可编辑/可点击、loading mask 消失、`waitForResponse(...)`、`expect.poll(...)`。

### 8.1 文案断言

- 需求/详设/后端文案已明确时，优先**完整文案精确匹配**；不要只断言「字母」「数字」「成功」这类关键词。
- 只有文案含动态值、前后缀或时间戳时，才用 `toContainText` 或正则。

```ts
await expect(errorMessage).toHaveText("请输入字母、数字、-或_"); // 推荐
await expect(errorMessage).toContainText("字母"); // 谨慎
```

### 8.2 行为断言

- 不要把「组件存在」当成「行为正确」。
- 分页验证**实际翻页行为**；缓存复用验证**请求次数或无重复请求**；汇总统计验证**数值口径**；写操作验证**提交结果 + 页面反馈 + 数据变化**，不只看 toast。

### 8.3 写操作成功验证（4 维度并行捕获）

写操作（新增/编辑/启停）成功判定必须覆盖 **4 个维度**，捕捉"接口成功但前端展示错误"的场景：

1. **接口 `retCode == 0`**（宽松比较 `==`，兼容 number `0` / string `"0"`）
2. **toast 文案精确匹配**（从 `data/*-texts.ts` 常量取，不硬编码）
3. **弹窗/抽屉关闭**
4. **列表/字段实际变化**（新增→查询能查到；编辑→回显值=修改值且≠原始值；启停→状态列文案变化）

#### 核心模式：先监听后触发（parallel capture）

toast 和接口监听必须在**点击前注册**，点击后 `Promise.all` 并行等待。这是 Playwright 官方推荐模式，无论 ElMessage duration 多短都不会漏。

```ts
// ❌ 错误：点击后再查 toast，ElMessage 可能已消失
await confirmButton.click();
await expect(page.locator(".el-message__content")).toHaveText("保存成功");

// ✅ 正确：点击前注册 toast + api 两个并行监听
const toastLocator = page
  .locator(".el-message--success .el-message__content")
  .first();
const toastPromise = toastLocator
  .waitFor({ state: "visible", timeout: 5000 })
  .then(() => toastLocator.textContent())
  .catch(() => null);
const apiPromise = waitForApi(page, { url: apiPattern, method: "POST" })
  .then(async (resp) => ({ body: await resp.json().catch(() => null) }))
  .catch(() => null);

await confirmButton.click(); // 触发提交
const [toastText, apiResult] = await Promise.all([toastPromise, apiPromise]);
```

#### ElMessage 类型区分

Element Plus 的 ElMessage 无论 success/error/warning 类型，文案都在 `.el-message__content`，区别只是父级修饰类。成功 toast 监听**必须用 `.el-message--success .el-message__content`** 限定类型，否则会把错误提示误当成功。

#### 断言分写 + 结构化消息

每条 `expect` 独立断言一个维度，消息模板统一格式 `期望="..." 实际="..."`，失败时一眼定位哪个维度挂了：

```ts
expect(result.apiOk, `新增接口失败：retCode 非 0`).toBe(true);
expect(
  result.toastMatched,
  `toast 文案不匹配，期望="${TOAST_TEXTS.addSuccess}" 实际="${result.toastText}"`,
).toBe(true);
expect(result.dialogClosed, `弹窗未关闭`).toBe(true);
// 第 4 维度在 spec 层独立断言（查询列表 / 回显验证 / 状态变化）
```

#### 编辑场景补充：自适应目标值 + 回显断言

修改型场景必须确保形成**真实变更**。记录编辑前值，自适应选择不同目标值（避免写回原值），保存后重开弹窗验证回显：

```ts
const before = await page.inputValue(storageInput);
const target = before === "120" ? "180" : "120"; // 自适应避免写回原值
await storageInput.fill(target);
// ... submitAndVerify ...
// 保存后重开编辑弹窗，回显值 = 修改值且 ≠ 原始值
expect(await page.inputValue(storageInput)).toBe(target);
expect(await page.inputValue(storageInput)).not.toBe(before);
```

> 网络等待 / mock / 调用计数优先用 `helpers/network.ts`（`waitForApi` / `createCallCounter`），详见 `reference/helpers-api.md` §3。

### 8.4 表单稳定性

- 日期、级联、下拉等复杂控件填写后，补**回显值校验**或后续可提交态校验，避免前置字段未真正写入。
- 对依赖基础信息的校验用例，先确认基础字段已成功填写，再触发目标校验分支。
- 按钮应置灰时优先断言 disabled，不要 `force: true` 掩盖问题。

## 9. 版本迭代维护规则

- 增量需求优先修改现有 `spec/page/data`，不要为同一页面平行再造一套脚本。
- `FT-*` / `ET-*` / `ATS-*` 编号主线必须保留，新增用例按同模块、同功能域编号延展；`ET-*` 实现在同源 spec 内。
- 前端 DOM 变化导致大量选择器失效时，先统一修 page object，再回归 spec。
- 需求文档口径变更时，先同步测试数据与断言，再决定是否调整页面对象方法。
- 只改与本次需求直接相关的脚本，不顺带整理无关文件。

## 10. 失败修复与回归策略

排查按固定顺序读工件（junit → screenshot/error-context → trace），再判定根因只归为 `ENV / DATA / SCRIPT / DEFECT / CHANGE` 五类之一。详细判定与「请求发没发出」四态区分见 `reference/failure-attribution.md`。

> **核心纪律**：工件已表明后端返回业务错误码（如 `retCode != 0`）时，**禁止**继续把问题默认归因为「定位器没找到」或「按钮没点击」。先看 `retCode` 与响应体，再决定归因类别。

## 11. 禁止事项 / 约束

- 禁止每条用例单独登录；禁止硬编码环境地址、账号、密码。
- 禁止优先用脆弱 CSS class / 纯文本定位，明明有 `data-testid` 还不用。
- 禁止把 `networkidle` 当主要等待手段；禁止把 toast 作为唯一成功依据。
- **禁止点击后再查 toast**（ElMessage 默认 duration 3000ms，点击后注册监听可能已消失）；toast 监听必须在**点击前注册**（"先监听后触发"模式，详见 §8.3）。
- **禁止用 `.el-message__content` 不限定类型监听成功 toast**：ElMessage 的 success/error/warning 共用此 class，必须用 `.el-message--success .el-message__content` 限定，否则会把错误提示误当成功。
- 禁止在需求文案已明确时，仅用关键词包含断言替代完整文案断言。
- 禁止用「组件存在」「字段存在」冒充「行为已验证」。
- 禁止在未确认数据条件时强行让用例失败，应显式 `test.skip(reason)`；禁止通过静态假设直接 skip。
- 禁止通过 `force: true` 掩盖本应 disabled / hidden / 不可提交的问题。
- 禁止脱离页面实际数据凭空编写机构、项目、状态和合同数据；禁止让写操作残留数据无控制地污染后续用例。
- 禁止为了修一个用例顺手重构整个自动化目录。
- **禁止绕过 `run.mjs` / `run-report.mjs` 直接 `npx playwright test` 裸跑**：运行时作用域版 config 依赖 `TEST_DOMAIN_PATH`（必填），裸跑不注入该变量会直接报错。执行必须经 `node run.mjs --domain <一级模块> [--module <二级模块>]`、`node run-report.mjs ...` 或 `npm test` / `npm run test:report`。
- **禁止为新增模块复制 `playwright.config.ts`**：config 只有一份（运行时作用域版，放 UI 套件根），新增模块零改 config；需要新模块时只新增 `<一级模块>/<二级模块>/specs/*.spec.ts`。
- **禁止把执行/报告链路三件套**（`run.mjs` / `run-report.mjs` / `gen-report.mjs` / `report-template.md`）**下沉或复制到二级模块**：固定放 UI 套件根，所有模块共用。

## 12. 完成前自检

提交前按 `reference/self-check.md` 逐项核对（目录命名 / 鉴权数据 / 定位等待 / 断言 / data-testid 知识库 / 执行报告 / 影响范围 7 大类）。核心硬规则速查：

- 执行经 `run.mjs` / `run-report.mjs`（非裸跑）；新增模块零改 config；报告落到 `test-reports/<一级模块>/<二级模块|all-modules>/`。
- 失败用例归因只取五类之一，未把 `retCode != 0` 误归「定位器没找到」。
- 脚本就绪后完成「执行 → digest → AI 报告」三步收尾，`TEST-REPORT.md` 已由 Agent 覆盖机械版。
- 新增/变更 `data-testid` 已回写模块 `data-testid.snapshot.json`。

## 13. 执行与 AI 报告生成（技能默认必做收尾）

脚本就绪后必须自动完成「执行测试 → 产出 digest → 生成 AI 模板报告」三步。默认走**方式 B（AI Agent 生成）**——无需外部密钥，由当前会话 AI 直接产出 `report-template.md` 风格报告。

### 13.1 一键执行 + 产出 digest

```powershell
# 技能默认调用：跑测试 + 产出机械报告 + execution-digest.json
node run-report.mjs --domain <一级模块> [--module <二级模块>]
# 等价 npm scripts：
npm run test:report -- --domain <一级模块> [--module <二级模块>]
```

- `run-report.mjs` 内部依次执行 `run.mjs`（产出 `junit.xml` + 截图/trace 工件）与 `gen-report.mjs`（产出 `TEST-REPORT.md` 机械版 + `execution-digest.json`）。
- 测试执行失败（退出码非 0）时不生成报告，需先按 §10 修复。
- **`--domain` 必填、禁止裸跑**：`--domain` / `--module` 通过 `run.mjs` 注入 `TEST_DOMAIN_PATH`（必填）/ `TEST_MODULE_PATH`（可选），只接受单个目录段，禁止含 `/` `\` `..`。裸跑 `npx playwright test` 读不到 `TEST_DOMAIN_PATH` 会直接报错。
- **报告随运行粒度落盘**：指定 `--module` → `test-reports/<一级模块>/<二级模块>/`；未指定（一级模块全量）→ `test-reports/<一级模块>/all-modules/`。`junit.xml` / `html/` / `artifacts/` / `execution-digest.json` / `TEST-REPORT.md` 均在此目录。
- **脚本标准实现来源**：`run.mjs` / `run-report.mjs` / `gen-report.mjs` / `global-setup.ts` / `playwright.config.ts` 固化在 `ui-automation-bootstrap` skill 的 `scripts/` 与 `templates/`。若 `Tests/ui-automation/` 缺这些文件（新项目），先从该 skill 复制，不要凭记忆复刻；`gen-report.mjs` skill 版已修复 junit `<error>` 标签识别 bug。

### 13.2 结构化 digest（AI 报告主数据源）

`execution-digest.json` 含每用例状态 / 耗时 / 失败信息 / 关联截图与 `trace.zip` 相对路径。**AI 生成报告时直接读它，不解析 XML、不臆造数据。**

### 13.3 生成 AI 总结报告（默认方式 B：Agent 直接生成）

执行完 §13.1 后，**AI Agent（即当前会话中的你）必须立即**按 `Tests/ui-automation/report-template.md` 模板填充最终 `TEST-REPORT.md`（**覆盖** `gen-report.mjs` 产出的机械版）。报告骨架与字段占位已在模板内，无需另造结构。

输入按顺序读取：①`execution-digest.json`（主数据源，直接据此填指标与明细，不解析 XML、不臆造）②`report-template.md`（报告骨架）③失败工件（仅对失败用例：截图 / `trace.zip` / `error-context.md`）。

填充要点：

- 概述 / 指标 / 明细表数值与 digest 完全一致，不四舍五入或手动修正；通过用例备注留空，不编造风险。
- 每个失败用例按模板 §四备注表填写（预期 / 实际 / DOM 状态 / 归因 / 修复建议 / 证据），**归因只取 `ENV/DATA/SCRIPT/DEFECT/CHANGE` 五类之一**（详见 `reference/failure-attribution.md`）。
- **核心纪律**：工件已表明后端 `retCode != 0` 时，禁止继续归为「定位器没找到」或「按钮没点击」。
- 汇总模板 §五的 `BUG-*`（DEFECT）/ `ISSUE-*`（待确认）/ `OPT-*`（SCRIPT 待优化）编号，编号唯一可追溯；§六 / §七写执行总结与结论（可发布 / 需修复后回归 / 阻塞 三选一）。
- 不写出账号、密码、token；截图 / trace 用相对路径。输出路径同 §13.1 报告目录。

报告自检见 `reference/self-check.md` §6。

### 13.4 可选方式 A · 脚本内调 LLM（CI 用）

若需在流水线里全自动、不走 Agent，可配置 `AI_REPORT_BASE_URL` + `AI_REPORT_API_KEY`（可选 `AI_REPORT_MODEL`）后：

```powershell
node gen-report.mjs --domain <一级模块> [--module <二级模块>] --ai
```

脚本直接调 LLM 按模板生成报告；未配密钥或调用失败时自动回退机械报告。**日常使用本技能默认走 §13.3，不依赖此方式。**

## 14. Helpers / Fixture 复用指引

通用 helpers 与 `base.fixture.ts` 的**标准实现固化在 `ui-automation-bootstrap` skill 的 `templates/helpers/` 与 `templates/fixtures/`**（详见该 skill §5.1 复制清单），项目副本在 `Tests/ui-automation/helpers/` 与 `Tests/ui-automation/fixtures/`。本技能负责**消费**这些基础设施，不重复实现。

### 14.1 何时复用（优先查现成函数，避免重写）

- **表单交互**：el-select（placeholder 拦截）/ el-cascader（残留菜单 + FORM-004 浮层关闭）/ el-date-range-picker / MessageBox（LIST-009/010 时序）→ `helpers/element-plus.ts`。
- **列表 / 可见性**：固定列偏移修正 / 残留遮罩清理 / 安全跳转 → `helpers/visibility.ts`。
- **网络断言**：成功类组合断言 `waitForApi` / ET 用例 mock / 断言「未调用接口」`createCallCounter` → `helpers/network.ts`。
- **错误收集**：toast + 行内双查 `collectErrors` / 完整文案匹配 `expectErrorExact` → `helpers/errors.ts`。
- **登录态夹具**：`authedPage` → `fixtures/base.fixture.ts`。

完整 API 速查见 `reference/helpers-api.md`。

### 14.2 复用纪律

- **不修改 helpers 源码**：如需增强，先在模块 page object 包一层；确属通用增强，回流到 bootstrap `templates/helpers/` 并同步本项目副本（记录在 bootstrap §5.2 版本对齐）。
- **不重复实现**：表单 / 弹窗 / 列表 / 网络 / 错误场景，先查 `reference/helpers-api.md` 有无现成函数。
- **新增 `data-testid` 必须回写**模块 `data-testid.snapshot.json`，不要只在 page object 硬编码。

## 15. 参考文件索引

| 文件                                     | 用途                                  | 加载时机                         |
| ---------------------------------------- | ------------------------------------- | -------------------------------- |
| `reference/helpers-api.md`               | helpers / fixture 用法速查            | 写表单/弹窗/列表/网络/错误断言时 |
| `reference/failure-attribution.md`       | 五类失败归因详解 + 请求四态           | 失败修复 / AI 报告归因时         |
| `reference/self-check.md`                | 完成前自检清单（7 大类）              | 提交 / 回归前                    |
| `Tests/ui-automation/report-template.md` | AI 回归报告骨架模板（bootstrap 复制） | 执行完测试生成报告时             |
| `ui-automation-bootstrap` skill          | 目录骨架 / 标准脚本 / helpers 源      | 新项目缺脚本或 helpers 时        |
