# Tests/ui-automation — 多模块 UI 自动化测试框架（Playwright）

基于 [Playwright Test](https://playwright.dev/) 的 UI 端到端测试框架，按「一级模块 → 二级模块 → specs」三级目录组织用例，支持一次运行锁定一个一级模块、按需跑其下全部二级模块或单个二级模块，并内置「执行 → 结构化 digest → AI 模板报告」一键链路。

## 1. 技术栈

| 类别 | 说明 |
| --- | --- |
| 测试框架 | `@playwright/test` `1.62.0` |
| 运行环境 | Node.js 18+（需支持 ESM `import.meta`） |
| 语言 | TypeScript（`.spec.ts` / `.config.ts` 由 Playwright 即时编译，`tsc --noEmit` 做类型检查） |
| 浏览器内核 | Playwright 自带 Chromium，或系统 Edge/Chrome（通过 `PW_BROWSER_CHANNEL` 切换） |
| 报告 | List + HTML + JUnit 三汇报器并行；`gen-report.mjs` 额外产出 `execution-digest.json` 供 AI 生成模板报告 |
| 执行封装 | `run.mjs`（跨平台执行入口）/ `run-report.mjs`（一键执行+digest）/ `gen-report.mjs`（junit→md+digest） |

## 2. 目录结构

```
Tests/                                      # 测试资产根（依赖与 .env 单一来源，均在此级）
├─ package.json                            # 依赖 + npm scripts（test/test:ui/test:list/test:install/
│                                          #   test:report/report:gen/report/typecheck/auth:capture）
├─ tsconfig.json                           # 类型检查配置
├─ .env                                    # 环境与账号（不入库；仓库留 .env.example 思路时参考下文）
├─ shared/                                 # 共享层（UI 与接口套件共用，不在 ui-automation 内）
│  ├─ .auth/<一级模块>/domain-state.json   # 共享登录态（global-setup / capture-auth 生成）
│  └─ auth/{auth-state.ts, capture-auth.ts}# 登录态路径解析 + 人工过码捕获
└─ ui-automation/                          # UI 套件：只放 UI 用例与配置
   ├─ run.mjs                              # 跨平台执行脚本（--domain 必填 / --module 可选）
   ├─ run-report.mjs                       # 一键：执行测试 + 产出 digest
   ├─ gen-report.mjs                       # junit.xml -> Markdown 报告 + execution-digest.json
   ├─ report-template.md        # AI 回归报告模板（失败归因 ENV/DATA/SCRIPT/DEFECT/CHANGE）
   ├─ playwright.config.ts                 # 运行时作用域配置（动态 testDir/报告目录/浏览器 channel）
   ├─ global-setup.ts                      # 登录态有效性校验 + 失效时唤起人工过码
   ├─ fixtures/base.fixture.ts             # 共享 authedPage fixture（消费 storageState）
   ├─ helpers/                             # 复用层（element-plus/errors/network/visibility）
   ├─ test-reports/<一级模块>/<二级模块|all-modules>/{html, junit.xml, artifacts}
   └─ <一级模块>/                           # 运行边界（如 CONFIG-配置中心）
      └─ <二级模块>/                        # 筛选项（如 BILLCFG-商业化计费配置）
         ├─ specs/ATS-*.spec.ts            # 用例（命名 ATS-{一级}-{二级}-{功能域}-{起始用例号}.spec.ts）
         ├─ pages/*.page.ts                # Page Object（按功能域拆分）
         ├─ fixtures/*.fixture.ts          # 模块专属 fixture（组合 page object + 写操作清理上下文）
         ├─ data/*.data.ts                 # 测试数据 / 文案常量 / mock 响应体
         ├─ snapshots/data-testid.snapshot.json  # data-testid 知识库快照
         └─ README.md                      # 二级模块说明
```

> 依赖与 `.env` **统一上提到 `Tests/` 级**（单一来源），不要在 `Tests/ui-automation` 下再 `npm install`。

## 3. 安装与初始化（首次运行前置三步）

```powershell
# 1) 装依赖（Tests/ 级，装过则跳过）
cd d:\AIauto\Tests
npm install

# 2) 装 Playwright 浏览器二进制（首次或换机必做；漏装会报 Executable doesn't exist）
npx playwright install
#   或仅装 chromium：npm run test:install
#   或用系统 Edge：跳过此步，改在 .env 设 PW_BROWSER_CHANNEL=msedge

# 3) 捕获登录态（首次或 token 过期；会打开可见浏览器，人工过滑块验证码）
npm run auth:capture
```

配置环境变量（`Tests/.env`，已忽略入库）：

```env
TEST_BASE_URL=http://localhost:7001
TEST_USERNAME=admin_shl
TEST_PASSWORD=admin_shl@123
# 浏览器 channel：留空=自带 chromium；msedge=系统 Edge；chrome=系统 Chrome
PW_BROWSER_CHANNEL=msedge
```

> 登录态保存到 `Tests/shared/.auth/CONFIG-配置中心/domain-state.json`，UI 与接口套件共用同一份。失效后重新 `npm run auth:capture`。

## 4. 使用场景

> 以下命令均在 `Tests/` 目录执行。`--domain` 必填，`--module` 可选；`--` 之后的参数原样透传给 Playwright。

### 场景 A：一次运行一个一级模块下的全部二级模块

```powershell
npm test -- --domain CONFIG-配置中心
# 等价：npm run test:ui -- --domain CONFIG-配置中心
```

### 场景 B：只运行某个二级模块（推荐单模块回归）

```powershell
npm run test:ui -- --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置
```

### 场景 C：只运行某个 spec 文件 / 某行

```powershell
npm run test:ui -- --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置 -- specs/ATS-CONFIG-BILLCFG-LIST-001.spec.ts
# 跑指定行：
npm run test:ui -- --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置 -- specs/ATS-CONFIG-BILLCFG-LIST-001.spec.ts:42
```

### 场景 D：只列出用例（不执行，dry-run）

```powershell
npm run test:list -- --domain CONFIG-配置中心
npm run test:list -- --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置
```

### 场景 E：可视化调试（UI 模式）

```powershell
npm run test:ui -- --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置 -- --ui
```

### 场景 F：按标签 / 用例名筛选

```powershell
npm run test:ui -- --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置 -- --grep "P0|冒烟"
```

### 场景 G：指定浏览器内核

编辑 `Tests/.env` 的 `PW_BROWSER_CHANNEL`：留空 → 自带 Chromium；`msedge` → 系统 Edge；`chrome` → 系统 Chrome。`playwright.config.ts` 与 `global-setup.ts` 同步读取，确保登录态生成与用例执行使用同一内核。

### 场景 H：不使用 run.mjs，直接用原生 Playwright 命令

```powershell
$env:TEST_DOMAIN_PATH = 'CONFIG-配置中心'
$env:TEST_MODULE_PATH = 'BILLCFG-商业化计费配置'
npx playwright test --config=ui-automation/playwright.config.ts
```

### 场景 I：一键执行 + 产出 digest（AI 报告主数据源）

```powershell
# 跑测试 + 产出机械版 TEST-REPORT.md + execution-digest.json
npm run test:report -- --domain CONFIG-配置中心 [--module BILLCFG-商业化计费配置]

# 仅生成报告（已跑过测试，junit.xml 已存在时）
npm run report:gen -- --domain CONFIG-配置中心 [--module BILLCFG-商业化计费配置]
```

- 不传 `--module` → 读写 `test-reports/<一级模块>/all-modules/`；传 `--module` → 读写 `test-reports/<一级模块>/<二级模块>/`。
- 产物：`junit.xml` + `TEST-REPORT.md`（机械版）+ `execution-digest.json`（结构化结果，含每用例关联截图/trace 路径）。

## 5. AI 总结报告（默认方式 B，无需密钥）

`playwright-test-implementation` 技能在脚本就绪后会自动执行 `run-report.mjs`，再由 **AI Agent 读取 `execution-digest.json` + `report-template.md` + 失败工件**，生成模板风格的可读回归报告（失败根因归为 `ENV/DATA/SCRIPT/DEFECT/CHANGE` 五类之一），覆盖机械版 `TEST-REPORT.md`。即「使用该技能 = 自动执行测试 + 自动产出 AI 报告」。

- **方式 A（脚本调 LLM，CI 用）**：配置 `AI_REPORT_BASE_URL` + `AI_REPORT_API_KEY` 后 `npm run report:gen -- --domain ... --ai`，脚本直接调用 LLM；失败回退机械报告。

## 6. 报告与登录态

- **HTML 报告**：`test-reports/<一级模块>/<二级模块|all-modules>/html`；`npx playwright show-report <路径>` 或 `npm run report -- <路径>` 打开。
- **JUnit**：同目录 `junit.xml`，便于 CI 接入。
- **失败工件**：截图 / 视频 / `trace.zip` 保留在 `artifacts/`（`retain-on-failure`）。
- **登录态**：`global-setup.ts` 校验 `Tests/shared/.auth/<一级模块>/domain-state.json` 有效性，失效时唤起 `capture-auth.ts` 人工过码重新生成；各 fixture 复用同一份，免重复登录。

## 7. 执行边界与约定

- 一次执行**只面向一个一级模块**（`--domain` / `TEST_DOMAIN_PATH` 必传），否则报错退出（退出码 2）。
- `--domain` / `--module` 必须是单个目录段，不能含 `/`、`\`、`..`（防路径穿越）。
- 二级模块目录约定包含 `specs/` 子目录存放 `.spec.ts`。
- spec 命名硬规则：`ATS-{一级模块}-{二级模块}-{功能域}-{起始用例号}.spec.ts`（如 `ATS-CONFIG-BILLCFG-LIST-001.spec.ts`），保留功能用例编号主线，禁止自由命名。

## 8. 已知限制

1. **登录态校验目标页 BILLCFG 专属**：`global-setup.ts` / `capture-auth.ts` 默认用 `/config/billingConfig` + `billing-add-tenant-btn` 校验登录态。新增其他一级模块时，需通过 `TEST_AUTH_TARGET_PATH` 环境变量覆盖目标页（校验 testid 仍为 BILLCFG 的，后续按模块泛化）。
2. **写操作数据清理**：当前无删除合同接口，新增合同仅记录到 `billingContext`，建议测试后用「禁用」软清理（见各模块 README）。

## 9. 相关文档

- 技能：`skills/ui-automation-bootstrap/SKILL.md`（骨架）、`skills/playwright-test-implementation/SKILL.md`（实现 + 执行 + AI 报告）
- 二级模块说明：`<一级模块>/<二级模块>/README.md`
