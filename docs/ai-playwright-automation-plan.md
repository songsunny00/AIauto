# AI + Playwright UI 自动化测试落地方案

## 1. 文档定位

本文档用于把 UI 自动化从“工具想法”落到“可执行规则”。

它重点回答 6 个问题：

1. 需求编号如何映射到 UI 自动化资产
2. `Tests/` 下 UI 自动化目录怎么落
3. 首批试点场景怎么选
4. 脚本失败后如何归因与回填
5. skill / agent / AI 在流程里怎么配合
6. 哪些场景适合做 UI 自动化，哪些不适合

---

## 2. 核心策略：确定性优先，AI 辅助

| 层级 | 主要职责 | 是否依赖 AI | 定位 |
|---|---|---|---|
| 回归执行层 | Playwright 确定性脚本执行 | 否 | 主执行层 |
| 生成辅助层 | 需求解析、脚本骨架生成、定位建议 | 是 | 提效层 |
| 失败分析层 | 失败聚类、原因分类、修复建议 | 是 | 辅助分析层 |
| 人工评审层 | 场景确认、脚本审核、结果确认 | 是 | 最终决策层 |

原则：

- **脚本执行必须确定性**，不能把回归执行交给 AI 自主点击。
- **AI 负责加速，不负责兜底正确性**。
- **先有稳定定位规范，再谈 AI 提效**。
- **先跑通主链路，再扩展边界场景**。

---

## 3. UI 自动化资产映射规则

### 3.1 主映射关系

以需求编号为主键建立 UI 自动化资产链路：

`REQ -> FT -> ATS`

| 资产类型 | 编号规则 | 说明 |
|---|---|---|
| 需求功能点 | `REQ-{L1}-{L2}-{L3}-{NNN}` | `L1/L2` 对应模块目录，`L3` 为功能点 |
| 功能测试点 | `FT-{L1}-{L2}-{L3}-{NNN}` | 来源于 `03-测试用例文档.md` |
| UI 自动化脚本 | `ATS-{L1}-{L2}-{L3}-{NNN}.spec.ts` | 与功能点稳定绑定 |

示例（以 V1.6.1 试点「商业化计费配置」为准）：

- 需求：`REQ-CONFIG-BILLCFG-LIST-001`
- 测试点：`FT-CONFIG-BILLCFG-LIST-001`
- 脚本：`ATS-CONFIG-BILLCFG-LIST-001.spec.ts`

> 编号层级 `REQ-{L1模块}-{L2子模块}-{L3功能点}-{NNN}` 中，`L1/L2` 对应目录 `CONFIG-配置中心/BILLCFG-商业化计费配置`，`L3` 为功能点（列表 LIST / 表单 FORM / 详情 DETAIL），不单独建目录，统一落在对应模块的 `specs/` 下。

### 3.2 映射约束

1. 一个 `REQ` 可以拆成多个 `FT`。
2. 一个 `FT` 原则上对应一个主要 UI 自动化脚本场景。
3. 若一个需求点需要拆多个自动化场景，脚本名追加语义后缀：
   - `ATS-CONFIG-REPORTCFG-TYPECFG-001-list.spec.ts`
   - `ATS-CONFIG-REPORTCFG-TYPECFG-001-save.spec.ts`
4. 自动化脚本文件名必须保留原始需求编号，不允许另起本地编号。
5. 脚本标题、报告标题、失败记录都必须带 `REQ` 或 `FT` 编号。

---

## 4. `Tests/` 下 UI 自动化推荐目录结构

建议按"模块 / 子模块"主线对齐（与 `REQ` 编号的 `L1/L2` 一致），脚本按功能点命名落在对应模块的 `specs/` 下。以 V1.6.1 试点「商业化计费配置」真实结构为准：

```text
Tests/                                         ← 测试资产根（含共享依赖）
├─ node_modules/                               ★ 共享依赖根（Tests/package.json 声明，npm install 生成，应忽略）
├─ package.json / package-lock.json            ★ 共享依赖与脚本来源（ui-automation / api-automation / shared 上溯共用）
├─ ui-automation/                             ← UI 自动化根目录
│  ├─ .env                                     ★ 执行必需：测试地址 / 账号 / 浏览器 channel
│  ├─ run.mjs                                  ★ 执行入口：node run.mjs --domain <一级> --module <二级>
│  ├─ playwright.config.ts                     ★ 主配置：加载 .env、调用 global-setup、定位 specs
│  ├─ global-setup.ts                          ★ 全局登录态：读 .env 账号 → 写 shared/.auth/domain-state.json
│  ├─ package.json                             ○ 仅含 scripts，依赖上溯到 Tests/node_modules
│  ├─ gen-report.mjs                           ○ 辅助：读 junit.xml 生成 Markdown 报告
│  ├─ playwright.config.noglobal.ts            ○ 辅助：无 global-setup 的备选配置
│  ├─ CONFIG-配置中心/
│  │  └─ BILLCFG-商业化计费配置/               ← 与 REQ 的 CONFIG / BILLCFG 对齐
│  │     ├─ specs/        ATS-CONFIG-BILLCFG-*.spec.ts   ★ 用例脚本（run.mjs 实际执行目标）
│  │     ├─ fixtures/     *.fixture.ts         登录态、数据装配、前后置
│  │     ├─ data/         *.data.ts            稳定输入 / 断言数据
│  │     ├─ pages/        *.page.ts            页面对象封装
│  │     ├─ snapshots/    页面结构快照 / 调试参考
│  │     └─ README.md     本目录覆盖范围、账号、数据说明
│  └─ test-reports/                            ○ 执行产物（html / junit.xml / artifacts / zip）
├─ api-automation/                             ← 接口自动化根（共用 Tests/node_modules）
│  └─ CONFIG-配置中心/BILLCFG-商业化计费配置/api-specs/  *.spec.ts
└─ shared/                                     ← 公共能力（非模块目录）
   ├─ .auth/<一级模块>/domain-state.json        ★ 登录态（global-setup 运行时生成）
   └─ capture-auth.ts                          登录态抓取脚本
```

> 图例：★ = 执行 `node run.mjs ...` 必需；○ = 辅助 / 可选，删掉不影响该命令执行。
> 依赖共用：`Tests/package.json` 声明 `@playwright/test` / `tsx`，统一装在 `Tests/node_modules`；`ui-automation` 自身零依赖，运行时由 Node 向上解析到共享根。
> 执行链路：`run.mjs` → `playwright.config.ts`（读 `.env`）→ `global-setup.ts`（写登录态）→ 跑 `CONFIG-配置中心/BILLCFG-商业化计费配置/specs/*.spec.ts`。

### 4.1 测试环境与账号（`.env`，执行必需）

`run.mjs` 实际执行时由 `playwright.config.ts` 自动加载根目录 `.env`，`global-setup.ts` 读取其中的账号完成登录态。缺少 `.env` 会直接报错 `TEST_USERNAME / TEST_PASSWORD missing`。当前 `.env` 内容：

```text
# 测试环境地址（本地服务）
TEST_BASE_URL=http://localhost:7001

# 测试账号（admin 角色，菜单权限需含 menuId=11013）
TEST_USERNAME=admin_shl
TEST_PASSWORD=admin_shl@123

# 浏览器 channel：留空使用 Playwright 自带 chromium；本机使用系统 Edge，设为 msedge
PW_BROWSER_CHANNEL=msedge
```

> ⚠️ 安全提示：`.env` 含真实密码，**必须加入 `.gitignore` 禁止提交**，仓库只保留 `.env.example` 占位模板。`ui-automation/.gitignore`（忽略 `.env` / `shared/.auth/` / `test-reports/`）与 `Tests/.gitignore`（忽略共享 `node_modules/`）已就位。

### 4.2 各目录职责

| 目录 | 职责 | 是否必须 |
|---|---|---|
| `specs/` | 场景脚本 | 是 |
| `fixtures/` | 登录态、测试数据装配、前后置动作 | 是 |
| `data/` | 稳定输入数据、断言数据 | 是 |
| `pages/` | 页面对象或页面片段封装 | 否 |
| `snapshots/` | 页面结构快照、调试参考 | 否 |
| `README.md` | 本目录覆盖范围、账号、数据说明 | 否 |

### 4.3 命名要求

- 脚本：`ATS-*.spec.ts`
- 页面对象：`*.page.ts`
- 夹具：`*.fixture.ts`
- 测试数据：`*.data.ts`
- 公共能力统一沉淀在 `Tests/shared/`（登录态、通用工具），模块内不重复造轮子

不建议：

- 所有页面共用一个超大 `common.spec.ts`
- 把多个需求点混写在一个无法追溯的脚本里
- 为了复用过度抽象，导致脚本阅读成本过高

---

## 5. 首批 UI 自动化场景选择规则

首批试点不要追求覆盖面最大，而要优先选“最能跑通闭环”的场景。

### 5.1 适合首批纳入的场景

优先级从高到低：

1. **P0 / P1 主业务路径**
2. **页面结构稳定、定位稳定**的场景
3. **断言口径清晰**的场景
4. **跨系统依赖少**的场景
5. **可重复执行、数据可回收**的场景

建议首批覆盖以下类型：

- 列表查询
- 新增保存
- 编辑保存
- 详情查看
- 权限显隐
- 空状态 / 无结果 / 保存成功提示

### 5.2 首批不建议纳入的场景

- 强依赖第三方系统返回的跨系统长链路
- 频繁改版页面
- 拖拽、复杂画布、富文本编辑器
- 验证码 / 强人机校验场景
- 强依赖短信、邮件、外部回调的末端链路
- 结果判定高度依赖人工视觉感知的场景

---

## 6. 标准编写与执行流程

### 6.1 标准流程

1. 读取 `01-需求文档.md`、`03-测试用例文档.md`
2. 确定目标 `REQ` / `FT` 编号
3. 先看页面，再写脚本
4. 生成 Playwright 脚本骨架
5. 人工补齐断言与稳定等待
6. 本地执行并修正
7. 输出报告与失败归因
8. 回填测试记录与追踪状态

### 6.2 先看再写

写脚本前必须先完成页面观察：

- 页面入口路径
- 稳定定位点（优先 `data-testid`）
- 主按钮、表单、表格、弹窗、抽屉
- 成功提示、错误提示、空状态 DOM 标识
- 权限显隐方式

定位优先级建议：

1. `getByTestId`
2. `getByRole + name`
3. `locator` + 稳定属性
4. 最后才考虑脆弱 CSS 路径

---

## 7. skill / agent / AI 协同方式

### 7.1 推荐分工

| 角色 | 主要职责 |
|---|---|
| skill | 触发固定流程、生成骨架、规范校验 |
| agent | 读取需求/原型/测试用例并整理测试点 |
| AI | 生成初稿、分析失败、给出修复建议 |
| 人 | 确认场景、审核脚本、确认结果 |

### 7.2 推荐链路

```text
需求文档 / 测试用例
    ↓
skill：提取目标需求编号与测试点
    ↓
agent：整理页面结构、操作路径、断言点
    ↓
AI：生成 Playwright 脚本骨架
    ↓
人工补齐与评审
    ↓
Playwright 执行
    ↓
AI 辅助失败分析
    ↓
回填测试记录 / 追踪状态
```

### 7.3 AI 允许做与不允许做的事

AI 可以做：

- 根据需求与用例生成脚本骨架
- 根据页面结构建议定位方式
- 根据 Trace / 截图 / 报错做失败分类
- 根据已知模式给出修复建议

AI 不应直接做：

- 未经审核直接修改主干脚本
- 自主决定放弃失败用例
- 在没有需求依据时发明断言
- 绕过定位规范乱写选择器

### 7.4 已落地的三个 skill（项目级执法规范）

本方案在 V1.6.1 试点中已沉淀三个 skill，可组合为「两种协同方案」，二者互补、共用同一套编号与目录，并以 `data-testid` 知识库快照（详见 §14.3）为共享定位资产：

#### 方案 A：骨架先行 → 实现填充（确定性回归路线）

| 阶段 | skill | 谁做判断 | 核心产出 |
| --- | --- | --- | --- |
| 1. 定骨架 | `ui-automation-bootstrap` | 触发于"项目决定采用 Playwright 做 UI 自动化" | 目录结构 + 含 `data-testid` 定位占位的 page/spec 骨架 |
| 2. 填脚本 | `playwright-test-implementation` | 预写 `expect` 断言、机器执行 | 可执行 `ATS-*.spec.ts` + `junit.xml` / trace |

> 顺序：bootstrap 先出骨架（`02-详细设计文档.md` §7 的 `data-testid` 直接落位成 `getByTestId` 占位）→ **用户确认骨架** → implementation 在骨架基础上填充真实交互 / 断言 / 数据。

#### 方案 B：探索驱动（playwright-cli-testing）

| skill | 路线定位 | 谁做判断 | 适用阶段 | 核心产出 |
| --- | --- | --- | --- | --- |
| `playwright-cli-testing` | 探索式功能验证（AI 当驾驶员，official playwright-cli skill 的**项目增强层**） | AI Agent 实时驱动（~920K Token） | 首轮摸底、需求/用例可行性验证、缺陷探查、独立自测用例 | 功能测试报告（含截图留证）；探索阶段维护 `data-testid` 快照 |

> 方案 A 与 B 的关系即 §2「确定性优先、AI 辅助」的具体落地：B 先探索验证可行性并沉淀稳定定位，A 再把验证过的定位固化成确定性回归。三 skill 的执法细则见 §12，两方案的协作时序、使用场景与端到端过程见 §14。

---

## 8. 失败归因与结果回填

### 8.1 失败归因分类

UI 自动化失败建议统一分 5 类：

| 分类 | 说明 | 典型现象 |
|---|---|---|
| `ENV` | 环境问题 | 页面打不开、服务不可用、超时 |
| `DATA` | 测试数据问题 | 数据不存在、数据状态不符合前置条件 |
| `SCRIPT` | 脚本问题 | 定位失效、等待不足、断言错误 |
| `DEFECT` | 产品缺陷 | 页面行为与需求不符 |
| `CHANGE` | 合理变更未同步 | 页面改版、文案调整、交互变化 |

### 8.2 回填动作

每次执行完成后，至少回填以下位置：

1. `Prds/<版本>/04-测试执行记录.md`（如 `Prds/V1.6.1/04-测试执行记录.md`）
   - 执行版本
   - 执行时间
   - 脚本编号
   - 通过/失败
   - 失败分类
   - 报告链接（指向 `Tests/ui-automation/test-reports/`）
2. `Prds/<版本>/05-变更记录.md`（如 `Prds/V1.6.1/05-变更记录.md`）
   - 若因需求变更、页面变更导致脚本调整，记录变更原因
3. `Prds/<版本>/03-测试用例文档.md`
   - 若测试点发生增删改，需要同步维护
4. `Prds/<版本>/TRACE.yaml` 或映射文件
   - 更新 `REQ -> FT -> ATS -> 执行结果` 的链路状态

### 8.3 报告字段建议

| 字段 | 示例 |
|---|---|
| 需求编号 | `REQ-CONFIG-REPORTCFG-TYPECFG-001` |
| 脚本编号 | `ATS-CONFIG-REPORTCFG-TYPECFG-001.spec.ts` |
| 执行结果 | PASS / FAIL |
| 失败分类 | `SCRIPT` |
| 失败摘要 | 保存按钮定位失效 |
| 报告地址 | `playwright-report/index.html` |
| 责任归属 | 产品 / 前端 / 后端 / 测试 / 环境 |

---

## 9. UI 自动化适用边界

### 9.1 适用

- 核心页面回归
- 稳定表单、列表、详情、审批流
- 关键权限显隐验证
- 需求点级别的主路径验收
- 发布前 smoke / 回归场景

### 9.2 不适用

- 视觉像素级对比作为主验收手段
- 高频变化原型期页面
- 强依赖人工判断的体验类问题
- 大量一次性临时页面
- 复杂跨系统末端结果确认

结论：

> UI 自动化要优先承担“稳定回归验证”，而不是承担全部测试职责。

---

## 10. 一期最小落地清单

一期建议至少落地以下内容：

1. `Tests/ui-automation/` 与 `Tests/api-automation/` 目录骨架（V1.6.1 试点已落地）
2. `data-testid` 与稳定定位规范（详设 §7 清单前置）
3. 登录态复用机制（`storageState`，见 §12.2）
4. 首批 5-10 个 P0/P1 脚本
5. 脚本命名与目录规范
6. 执行报告输出规范（双路线：cli 截图 + test `junit.xml`/trace）
7. 失败分类与回填规则
8. 与需求编号的映射关系
9. 三 skill / 两方案执法规范（`ui-automation-bootstrap` / `playwright-cli-testing` / `playwright-test-implementation`）

---

## 11. 结论

UI 自动化一期推荐路线不变：

> **Playwright + skill + AI 辅助**

原因不是它“功能最多”，而是它最适合当前阶段目标：

- 能快速与前端场景闭环
- 能复用同一套 TypeScript / Playwright 能力栈
- 便于后续与接口自动化统一治理
- 便于把需求编号、测试点、脚本、报告串成一条链路
- **已实现双路线闭环**：`playwright-cli-testing` 探索验证 + `playwright-test-implementation` 回归固化（V1.6.1 试点实证见 §13）

---

## 12. 两个 skill 的执法细则（从实践提炼）

> 以下约束来自 V1.6.1 试点实际使用的两个 skill 规范，是 §7.4 的落地细则。凡建脚本/跑用例，必须遵循。

### 12.1 定位优先级（三 skill 统一）

1. `getByTestId`（第一优先，依赖详设 §7 的 `data-testid` 清单）
2. `getByRole + name`
3. `locator` + 稳定属性（含 `text` 精确比对）
4. 最后才考虑脆弱 CSS 路径

### 12.2 登录态复用

- 统一用 `storageState` 复用登录态，避免每个用例重复登录。
- `Tests/shared/auth/capture-auth.ts` 负责抓取并落盘 `state.json`，各用例 `setup` import 复用。
- 登录态失效时重跑 `capture-auth.ts` 即可，不污染业务脚本。

### 12.3 `playwright-cli-testing` 探索式验证约束

- **判定基于 DOM，不靠视觉**：校验类用例强制在 JS 内对 DOM 文案做 `===` 精确比对（`run-code` 取实际文案 → 比对 → 返回 JSON），截图仅留证、不喂模型当判定输入。
- **每个用例必截全屏图**，命名含 `REQ/FT` 编号，作为报告证据。
- **数据生命周期**：用完即清理（删除/恢复），保证可重复执行；截图也需定期归档或清理。
- 用途：首轮可行性验证、缺陷探查、需求/用例是否可自动化评估。

### 12.4 `playwright-test-implementation` 回归脚本约束

- 产出标准 Playwright Test 脚本 `ATS-{L1}-{L2}-{L3}-{NNN}.spec.ts`，断言写死 `expect`。
- **文案断言必须精确**：用 `toContain` / 正则提取后精确比对，禁止模糊包含以免假绿。
- 必须接入登录态 `storageState`、稳定等待、失败 `trace` 与 `junit.xml` 输出。
- 用途：正式回归、版本迭代门禁、失败修复验证。

### 12.5 失败归因与回填（与 §8 一致）

- 失败统一分 `ENV / DATA / SCRIPT / DEFECT / CHANGE` 五类。
- 报告/执行记录回填到 `Prds/<版本>/04-测试执行记录.md`、`05-变更记录.md`、`TRACE.yaml`。

### 12.6 `ui-automation-bootstrap` 骨架约束

- 仅产出骨架（目录结构 + 含 `data-testid` 定位占位的 page/spec 骨架），**不实现**真实交互 / 断言 / 数据（那属于 `playwright-test-implementation` 职责）。
- 骨架生成时**顺带**把 `02-详细设计文档.md` §7 / `data-testid.snapshot.json` 中已定义的 `data-testid` 写成 `getByTestId(...)` 占位，不凭空猜、不空壳留待后面；仅 §7 确实缺失的定位才标记推前端补。
- **用户确认骨架（尤其定位点是否正确）后**，再移交 `playwright-test-implementation` 填充真实脚本。

---

## 13. V1.6.1 试点实证（商业化计费配置）

> 两份过程报告：`测试报告-V1.6.1-商业化计费配置-playWright-cli功能测试0714.md`（探索式）与 `测试报告-V1.6.1-商业化计费配置-Playwright回归测试0714.md`（回归式）。结论与 `对比报告-playwright-cli-vs-playwright-test.md` 相互印证。

### 13.1 双路线结果对照

| 维度 | playwright-cli 功能测试（探索） | Playwright 回归测试（test） |
| --- | --- | --- |
| 模式 | AI 当驾驶员，实时驱动 | 预写脚本，机器确定性执行 |
| 断言方式 | AI 对 DOM 文案 `===` 精确比对 | `expect` 断言 |
| 用例总数 | 39 | 42 |
| 通过 / 不通过 / 条件不满足·skip | 23 通过 / 4 不通过 / 8 条件不满足·部分通过 | 29 通过 / 5 不通过 / 8 skipped（多为前置数据/权限不足） |
| 执行通过率（已执行口径） | 65.7%（23/35） | 85.3%（29/34） |
| 准确度（系统实现与用例预期一致比例） | 89.7% | — |
| 覆盖范围 | 列表/表单/详情/权限显隐/空状态 | 同左（同一批 REQ，另含少量 PT 权限用例） |
| 典型失败点 | 4 项"提示文案与用例预期不符"（功能生效但文案偏差） | 5 项集中在新增/编辑表单链路（toast 未捕获、20s 超时、校验顺序） |
| 产物 | 全屏截图留证 + 功能测试报告 | `junit.xml` + trace + 回归报告（约 4 分 42 秒 / 42 例） |
| 成本特征 | 高 Token（~920K / 60+ 模型调用） | 脚本一次性投入，回归零 Token（8.3s/条） |
| 定位方式 | 主要 `data-testid` + `getByRole` + `storageState` 复用登录态 | 同左 |

### 13.2 关键结论

- **两路线发现的问题互补而非重合**：cli 暴露的是"前端提示文案与测试用例定义不一致"（4 项，功能本身生效，属用例/实现口径偏差）；test 暴露的是"表单链路脚本稳定性问题"（toast 等待、超时、校验触发顺序）。说明 **cli 擅长发现需求/实现口径问题，test 擅长暴露脚本脆弱点**，二者组合覆盖更全。
- **登录态 `storageState` 两路线均已复用**：cli 通过 `globalSetup` 保存 `.auth/billing-state.json` 免验证码；test 同机制，验证 §12.2 有效。
- **成本取舍印证策略**：cli 首轮探索消耗 ~920K Token，但快速定位口径问题；test 回归零 Token、可重复，印证 §2「确定性优先、AI 辅助」。
- **判定本质**：cli 由 AI 驱动但判定基于 DOM 结构化数据（非视觉），与 §1.4 辨析一致。
- **数据/用例可补强点**：cli 的"条件不满足"（如分页因数据量仅 1 页无法触发）、test 的 skip（前置数据不足）提示需要补造测试数据以覆盖边界。

### 13.3 后续优化点（来自试点）

1. 登录态 `storageState` 已复用，但需加入失效自动重抓钩子。
2. cli 报告截图需规范归档路径，避免堆积。
3. test 脚本应强化表单链路的 toast 等待与校验顺序断言，对齐 cli 已验证范围。
4. 补造测试数据（分页、CONFIRMED 消耗记录等），消除 skip / 条件不满足用例。
5. 两路线共用同一 `data-testid` 字典，需与详设 §7 保持同步更新机制。

---

## 14. 两种协同方案、使用场景与落地流程

§7.4 已明确三个 skill 可组合为「两种协同方案」。本节给出两种方案的完整定义、使用场景对照，以及一条端到端使用过程示例（以 V1.6.1「商业化计费配置」BILLCFG 为例串起来）。两方案以 `data-testid` 知识库快照为共享定位资产，闭环复用。

### 14.1 方案 A：骨架先行 → 实现填充（确定性回归路线）

**适用前提**：项目已决定采用 Playwright 做 UI 自动化，目标是可回归、可维护的确定性脚本。

| 阶段 | skill | 谁做判断 | 输入 | 核心产出 |
| --- | --- | --- | --- | --- |
| 1. 定骨架 | `ui-automation-bootstrap` | 触发于"项目决定采用 Playwright 做 UI 自动化" | `01-需求文档.md` / `03-测试用例文档.md`、`02-详细设计文档.md`（含 §7 `data-testid` 清单）、模块 `data-testid.snapshot.json` | 目录结构（含 `specs/fixtures/data/pages/snapshots/README.md`）+ page/spec **骨架** |
| 2. 填脚本 | `playwright-test-implementation` | 预写 `expect` 断言、机器执行 | 上一步骨架 + 探索回填的快照 | 可执行 `ATS-*.spec.ts` + `junit.xml` / trace |

**关键约定**：
- bootstrap 在骨架里**顺带把 §7 / 快照已定义的 `data-testid` 写成 `getByTestId(...)` 占位**，不必凭空猜；仅当 §7 确实缺失某定位时，才标记推前端补 `data-testid`。骨架本身不实现真实交互 / 断言 / 数据。
- **用户先确认骨架**（尤其定位点是否准确、目录是否符合预期），再移交 implementation。
- implementation 在骨架基础上填充真实交互、`expect` 断言、测试数据与夹具；新增 / 发现的 `data-testid` 回写 `data-testid.snapshot.json`。

### 14.2 方案 B：探索驱动（playwright-cli-testing）

**定位**：official playwright-cli skill 的**项目增强层**，聚焦快速功能验证 / 首次功能验证 / 探索摸底。支持两种核心场景：

- **场景 1 · 独立运行自测用例**：直接以 AI 为驾驶员，对照需求 / 用例跑通功能、产出含截图留证的功能测试报告（如 V1.6.1 的 cli 探索式报告）。
- **场景 2 · 探索与验证支撑**：配合 bootstrap + implementation，只探页面、确认 `data-testid` 真实存在、维护 `data-testid.snapshot.json`（`page-verified` / `missingInPage` / `extraInPage` 闭环），不产正式脚本。

**其他约束**：判定基于 DOM（截图仅留证、不喂模型当判定）；每个用例必截全屏图；数据用完即清理。详见 §12.3。

### 14.3 共享资产：data-testid 知识库快照

- **落点**：`Tests/ui-automation/<一级模块>/<二级模块>/data-testid.snapshot.json`（如 `CONFIG-配置中心/BILLCFG-商业化计费配置/data-testid.snapshot.json`）。
- **角色分工**：bootstrap **消费** intent 生成骨架；implementation / cli **生产 / 回写** actual。是三 skill 共享的复用闭环资产——下一模块直接复用、定位漂移自动进 `gaps`、回推前端或回填 §7。
- **Schema（关键字段，支持无 `data-testid` 探索）**：
  - `elements[]`: `{ testId, req, component, usage, kind, hasDataTestId?: boolean, evidence, actual?: { exists, selector } }`
    - `selector` 可为 `getByTestId(...)` 或兜底定位（无 testid 时记稳定下位器）；
    - `evidence` ∈ `page-object` / `cli-script` / `intent-only` / `page-verified`；
    - `hasDataTestId` 显式标记该元素页面是否挂了 `data-testid`。
  - `gaps.missingInPage`: §7 设计有、页面无（或未挂 testid）→ 推前端补，条目可带 `{ testId, suggestedSelector, reason }`。
  - `gaps.extraInPage`: 页面有、§7/快照无 → 回填 §7 与快照，建议带 `selector`。
  - `gaps.notCoveredByPageObject`: 设计有但 page 对象未封装 / 未验证项。
- 完整示例见 `BILLCFG-商业化计费配置/data-testid.snapshot.json`；无 testid 时的兜底与输出细则见 §14.7。

### 14.4 使用场景对照

| 使用场景 | 推荐方案 | 说明 |
| --- | --- | --- |
| 新模块首次接入 Playwright，需要可回归脚本 | A（bootstrap → implementation） | 骨架先把稳定定位落位，避免从零猜 |
| 需求 / 用例可行性先摸底、缺陷探查 | B（cli 独立自测） | 快速出结论，不纠结脚本工程化 |
| 页面改版 / 新功能，需探清真实 `data-testid` | B（cli 探索支撑）+ A | cli 探清后回填快照，bootstrap / implementation 复用 |
| 版本迭代回归门禁 | A 的 implementation 阶段 | 跑确定性 `ATS-*.spec.ts` |
| 失败修复验证 | A 的 implementation 阶段 | 结合 trace / junit 修 |
| 一次性临时验证、不想写正式脚本 | B（cli 独立自测） | 截图留证即可 |

### 14.5 端到端使用过程示例（以 BILLCFG 商业化计费配置为例）

```text
① 决定用 Playwright 测 BILLCFG（项目采用 UI 自动化）
      ↓
② 触发 ui-automation-bootstrap（方案 A 阶段 1）
   - 读 02-详细设计文档.md §7（25 个 data-testid 清单）
   - 读 data-testid.snapshot.json（首份 KB：13 page-object / 4 cli-script / 8 intent-only）
   - 产出：CONFIG-配置中心/BILLCFG-商业化计费配置/ 目录 + *.page.ts / *.spec.ts 骨架
          骨架内把已定义 data-testid 写成 getByTestId('billing-page-title') 等占位
   - 仅 8 个 intent-only 且无代码引用的 data-testid 标记"待页面确认 / 推前端补"
      ↓
③ 用户确认骨架（定位点是否准确、目录是否要调整）
      ↓
④ 触发 playwright-test-implementation（方案 A 阶段 2）
   - 在骨架基础上填真实交互 + expect 断言 + 测试数据
   - 探索中新发现的 data-testid 回写 data-testid.snapshot.json（evidence → page-verified）
   - 跑 node run.mjs --domain CONFIG --module BILLCFG → junit.xml + trace
      ↓
⑤ （并行 / 前期）playwright-cli-testing 探索支撑（方案 B 场景 2）
   - 用 snapshot 打开页面，把真实 data-testid 与 §7 / 快照比对
   - page-verified 升级；missingInPage 回推前端；extraInPage 回填 §7 与快照
      ↓
⑥ 失败归因（ENV / DATA / SCRIPT / DEFECT / CHANGE）
   → 回填 04-测试执行记录.md / 05-变更记录.md / TRACE.yaml
      ↓
⑦ 下一模块复用 KB：bootstrap 直接读快照拿稳定定位，只补差异
```

> 该过程已在 V1.6.1「商业化计费配置」试点闭环（见 §13）：cli 探索暴露口径问题、test 回归固化脚本、快照作为共享定位资产沉淀。方案 B 也可独立成「cli 直接出功能测试报告」闭环（对应 §13.1 的 cli 探索式 39 用例）。

### 14.6 三个 skill 的触发场景

| skill | 什么情况下触发 | 不触发 / 移交给谁 |
| --- | --- | --- |
| `ui-automation-bootstrap` | 项目**决定采用 Playwright 做 UI 自动化**、且目标模块尚无目录/骨架时触发。典型：新模块首次接入、版本迭代要扩建新子模块 | 已有现成骨架则直接进 implementation；纯探索验证不走 bootstrap |
| `playwright-cli-testing` | 任一成立即触发：①需快速/首次功能验证、缺陷探查（独立自测，场景一）；②bootstrap/implementation 前需探清页面结构与真实 `data-testid`（探索支撑，场景二）；③不想写正式脚本的一次性临时验证 | 要产出可回归确定性脚本时移交 implementation；已沉淀的定位交给 bootstrap/implementation 复用 |
| `playwright-test-implementation` | 骨架已确认（bootstrap 产出并经用户确认）后触发；或既有脚本的版本增量修改、失败修复 | 尚无骨架时先触发 bootstrap；只验证可行性不写脚本时走 cli 场景一 |

**触发链总览**：

```text
新模块接入  → bootstrap（定骨架，data-testid 落位）→ 用户确认骨架 → implementation（填真实脚本）
                                                          ↑ 并行：cli 场景二探索支撑补 data-testid 快照
纯可行性/缺陷探查 → cli 场景一（独立自测报告，不写正式脚本）
改版/新功能探清定位 → cli 场景二（探清 + 回填快照）→ bootstrap / implementation 复用快照
版本回归门禁 / 失败修复 → implementation（跑确定性 ATS-*.spec.ts）
```

### 14.7 回归报告：让 AI 总结并输出模板风格报告

`playwright-test` 跑完后，除机械统计版 `TEST-REPORT.md` 外，还可让 AI 基于结构化 `execution-digest.json`（由 `gen-report.mjs` 从 `junit.xml` + 失败工件路径解析产出）与 `report-template-regression.md` 模板，生成 `report-template.md` 风格的可读回归报告：含概述/指标/用例明细/非通过备注（根因归入 `ENV/DATA/SCRIPT/DEFECT/CHANGE`）/缺陷汇总/AI 执行总结/结论。**两种触发**：① 配置 `AI_REPORT_BASE_URL/API_KEY` 后 `node gen-report.mjs --ai`（脚本内调 LLM）；② 在 CodeBuddy 会话中由 AI Agent 直接读取 digest 与模板产出（无需密钥，推荐）。详见 `playwright-test-implementation` SKILL §13 与 `Tests/ui-automation/README.md` 场景 J。

### 14.8 无 data-testid 时的探索结果输出

cli 探索支撑时，页面**不一定**带 `data-testid`（老页面、未接 §7 规范的模块很常见）。此时不能卡在"等 data-testid"，而应**用稳定兜底下位器完成探索，并把结果结构化输出**，供后续推前端补或作为临时定位字典。

**兜底定位优先级**（与 §12.1 一致，顺序后移）：

1. `getByRole(role, { name })` —— 语义最稳，优先
2. `locator` + 稳定属性（`aria-label` / `name` / 含业务语义的 class 如 `.el-dialog__title`）
3. 文本精确：`getByText` / `hasText`
4. 最后才用脆弱 CSS 路径（仅当无其他选择）

**探索结果输出（两种产物，可并存）**：

1. **回写 `data-testid.snapshot.json`（主体产物）**——按 §14.3 扩展 schema：
   - §7 设计有、页面无 `data-testid` → 保留该 `testId`，`hasDataTestId:false`，`actual.selector` 记兜底定位，`evidence:page-verified`，并加入 `gaps.missingInPage`（带 `suggestedSelector`）；
   - 页面有、§7/快照无 → 加入 `elements`（或 `gaps.extraInPage` 增强为对象）并记 `actual.selector`，建议回填 §7。
2. **产出 `探索结果清单.md`（探索支撑专用报告）**——当模块 testid 普遍缺失或尚无快照时，输出一张表存 `snapshots/`：

| 元素语义/用途 | 是否含 data-testid | 页面实际稳定定位（兜底） | 建议 |
| --- | --- | --- | --- |
| 新增计费方案按钮 | 否 | `getByRole('button', { name: '新增计费方案' })` | 推前端补 `data-testid=billing-add-tenant-btn` |
| 保存按钮 | 否 | `locator('.el-dialog__footer button.is-primary')` | 临时可用；建议补 testid |
| 合同编号输入框 | 是 | `getByTestId('billing-contract-no-input')` | 已稳定，直接复用 |

**输出原则**：

- 判定仍基于 DOM（截图仅留证）；文案 / 状态在 JS 内精确比对。
- 无 testid 的兜底定位**标注脆弱度**（role/aria 稳定 > 业务 class 稳定 > 纯结构 CSS 脆弱），便于 implementation 决定临时用还是推前端补。
- 探索结果清单与快照统一进模块 `snapshots/`，作为 bootstrap/implementation 的临时定位字典；一旦前端补上 `data-testid`，cli 再次探索即把 `hasDataTestId` 翻 true、`actual.selector` 切回 `getByTestId`。
