---
name: ui-automation-bootstrap
description: 基于测试用例与页面信息生成 UI 自动化目录结构、README 要点和脚本骨架建议。
allowed-tools: Read Glob Grep Edit Write
---

# ui-automation-bootstrap

## 1. 目标

在项目**决定采用 Playwright 做 UI 自动化测试**时触发，围绕目标模块输出一套可直接起步的 **UI 自动化骨架方案**（目录结构 + 文件清单 + 含 `data-testid` 定位占位的 page/spec 骨架），服务 `Tests/ui-automation/...` 目录建设和后续脚本实现；骨架确认后，由 `playwright-test-implementation` 接手完成具体脚本编写。

## 2. 适用输入

- `02-详细设计文档.md`（含 §7 `data-testid` 清单，是 UI 自动化稳定定位字典的直接输入）
- 模块 `data-testid.snapshot.json`（data-testid 知识库快照：§7 intent + 脚本引用证据 `evidence` + 缺口清单 `gaps`；bootstrap 时读取，定位 page 对象未覆盖项）
- `03-测试用例文档.md`
- `01-需求文档.md`
- 页面路径 / 路由信息
- 相关前端代码（如可读）

## 3. 期望输出

至少输出：

1. 目标 UI 自动化目录结构
2. 建议创建的 `specs/pages/fixtures/data` 文件清单
3. `README.md` 需要说明的要点（**必须**含首次运行前置三步：`npm install` → `npx playwright install` 安装浏览器二进制 → `npm run auth:capture` 捕获登录态；漏装浏览器二进制会导致 `auth:capture` / 测试执行报错）
4. 每个 `FT-*` 与**嵌入 FT/IT 表格的 `ET-*` 异常用例**对应的初始脚本命名建议（`ET-*` 写入同源功能 spec，不另立文件）
5. 定位方式与等待策略建议
6. 哪些场景先做、哪些场景后做

## 4. 使用步骤

1. 从 `03` 中找出适合 UI 自动化的 `FT-*` 与**嵌入 FT/IT 表格中的 `ET-*` 异常用例**（`ET-*` 编号带功能域粒度 `ET-{MODULE}-{FEATURE}-{NNN}`，与所在 FT 表格域前缀一致；跨域异常 `ET-{MODULE}-X-{NNN}`）。
2. 结合页面结构与原型说明，建议脚本拆分方式。
3. 输出 `ATS-*.spec.ts` 命名约束（**硬规则，非建议**）：spec 文件必须命名为 `ATS-{一级模块}-{二级模块}-{功能域}-{起始用例号}.spec.ts`（如 `ATS-CONFIG-BILLCFG-DETAIL-001.spec.ts`），禁止自由命名（如 `detail.spec.ts`）。同一功能域内用例较多时可按子域拆多个文件，每个文件用其首条用例编号命名（如 `ATS-CONFIG-BILLCFG-LIST-001.spec.ts`、`ATS-CONFIG-BILLCFG-LIST-008.spec.ts`）。
4. 输出页面对象、夹具、数据文件的最小清单。
5. 根据 `02-详细设计文档.md` §7 的 `data-testid` 清单与模块 `data-testid.snapshot.json`，**顺带把已定义的 `data-testid` 直接写进 page 对象 / spec 骨架的定位占位**（用 `getByTestId(...)`），让骨架一开始就基于稳定定位；仅当 §7 也未定义某交互所需定位时，才标记该处需前端补充 `data-testid`。
6. **生成测试数据前，先访问测试页面查看系统已有数据**（机构名、项目名、状态值等），基于实际数据编写，不要凭空编造。

## 5. 目录结构建议

默认采用“**测试资产共享层（Tests/）+ UI 套件 + 接口套件 + 一级模块 + 二级模块**”结构。

- **共享层**：放在 `Tests/`（含 `Tests/package.json` 依赖单一来源）与 `Tests/shared/`（登录态、鉴权 helper、手动导出脚本），供 `Tests/ui-automation` 与 `Tests/api-automation` 共用。
- **UI 套件**：`Tests/ui-automation/`，只放 UI 自己的用例与配置（`playwright.config.ts`、`global-setup.ts`、`.env`、公共脚本、报告）。
- **接口套件**：`Tests/api-automation/`，与 `Tests/ui-automation` 同级，复用同一份登录态。
- **一级模块**：如 `CONFIG-配置中心/`。
- **二级模块**：如 `BILLCFG-商业化计费配置/`，只放本模块自己的 `specs/pages/fixtures/data/README`。

```text
Tests/
├── package.json                # 依赖单一来源：@playwright/test + tsx + @types/node
├── node_modules/               # 统一安装目录（ui/api 向上解析复用）
├── .gitignore                  # 忽略 node_modules / 运行产物
├── shared/                     # 共享层（ui-automation 与 api-automation 共用，不在 ui-automation 内）
│   ├── .auth/                  # 共享认证态（gitignore），按一级模块隔离
│   │   └── <一级模块>/domain-state.json
│   ├── auth/
│   │   ├── auth-state.ts       # 登录态路径解析
│   │   └── api-auth.ts         # 接口请求上下文 helper（带登录 cookie / token）
│   └── capture-auth.ts         # 手动导出登录态（connectOverCDP，人工过验证码）
├── ui-automation/              # UI 套件：只放 UI 用例与配置
│   ├── package.json            # 仅 scripts（依赖走 Tests/ 级，不放 devDependencies）
│   ├── run.mjs                 # 跨平台执行入口：解析 --domain/--module，注入 TEST_DOMAIN_PATH/TEST_MODULE_PATH
│   ├── run-report.mjs          # 一键收尾入口：跑 run.mjs + gen-report.mjs（技能默认调用）
│   ├── gen-report.mjs          # junit.xml -> TEST-REPORT.md（机械版）+ execution-digest.json
│   ├── report-template-regression.md # AI 回归报告模板（失败归因 ENV/DATA/SCRIPT/DEFECT/CHANGE）
│   ├── playwright.config.ts    # 运行时作用域版：读 TEST_DOMAIN_PATH/TEST_MODULE_PATH 动态定 testDir/testMatch/报告目录
│   ├── global-setup.ts         # 校验登录态，失效唤起人工过码，写入 Tests/shared/.auth/<一级模块>/domain-state.json
│   ├── .env / .env.example     # 环境与账号（.env 不入库）
│   ├── test-reports/<一级模块>/<二级模块|all-modules>/{html,junit.xml,artifacts,execution-digest.json,TEST-REPORT.md}
│   ├── CONFIG-配置中心/        # 一级模块
│   │   ├── BILLCFG-商业化计费配置/ # 二级模块
│   │   │   ├── specs/
│   │   │   │   ├── ATS-CONFIG-BILLCFG-LIST-001.spec.ts
│   │   │   │   ├── ATS-CONFIG-BILLCFG-DETAIL-001.spec.ts
│   │   │   │   └── ATS-CONFIG-BILLCFG-FORM-001.spec.ts
│   │   │   │   # ET-* 异常用例（如 ET-BILLCFG-LIST-001）写入同域功能 spec 内，不另立 -ERR- 文件
│   │   │   ├── pages/billing.page.ts
│   │   │   ├── fixtures/billing.fixture.ts   # 消费 Tests/shared/.auth 登录态
│   │   │   ├── data/billing.data.ts
│   │   │   ├── snapshots/
│   │   │   ├── data-testid.snapshot.json   # data-testid 知识库快照（设计意图+脚本覆盖+缺口）
│   │   │   └── README.md
│   │   └── <其他二级模块>/
│   └── <其他一级模块>/
└── api-automation/             # 接口套件（与 ui-automation 同级，复用同一份登录态）
    ├── package.json            # scripts: api / capture:auth（依赖走 Tests/ 级）
    ├── playwright.api.config.ts # use.storageState 指向 Tests/shared/.auth
    └── <一级模块>/<二级模块>/api-specs/*.api.spec.ts
```

说明：

- **依赖只在 `Tests/` 级安装一份**（`Tests/package.json`），`ui-automation` 与 `api-automation` 通过 npm 向父目录解析复用，不要在二级套件下再 `npm install`。
- **登录态统一在 `Tests/shared/.auth/<一级模块>/domain-state.json`**，UI 与接口共用同一份，验证码只需过一次。
- 验证码处理已内联进 `global-setup.ts`（滑块破解不再单独成脚本）；默认不要把 `.env`、`playwright.config.ts`、`global-setup.ts` 散落到二级模块目录。
- **运行时作用域（单 config 跑任意模块）**：`playwright.config.ts` 只有一份，放 UI 套件根；由 `run.mjs --domain <一级模块> [--module <二级模块>]` 注入 `TEST_DOMAIN_PATH`（必填）/`TEST_MODULE_PATH`（可选）两个环境变量驱动，config 内据此动态决定 `testDir` / `testMatch` / 报告输出目录 / storageState 路径。**禁止为每个二级模块复制一份 config**，也**禁止直接 `npx playwright test` 裸跑**（不会注入作用域变量，config 直接报错）。
- **执行/报告链路三件套**（`run.mjs` + `run-report.mjs` + `gen-report.mjs`，辅以 `report-template-regression.md` 模板）固定放 UI 套件根，供所有一级/二级模块共用；**禁止把任一文件下沉到二级模块**。`run-report.mjs` 是技能默认收尾入口（跑测试 + 产出 digest + 机械报告）。

## 6. 文件建议

### 6.1 测试资产共享层文件（`Tests/` 与 `Tests/shared/`）

| 文件 / 目录                                       | 说明                                                       | 必需 |
| ------------------------------------------------- | ---------------------------------------------------------- | ---- |
| `Tests/package.json`                              | 依赖单一来源（`@playwright/test` + `tsx` + `@types/node`） | ✅   |
| `Tests/.gitignore`                                | 忽略 `node_modules/` 与运行产物                            | ✅   |
| `Tests/shared/.auth/<一级模块>/domain-state.json` | 共享认证态（gitignore），UI 与接口共用                     | ✅   |
| `Tests/shared/auth/auth-state.ts`                 | 登录态路径解析                                             | ✅   |
| `Tests/shared/auth/api-auth.ts`                   | 接口请求上下文 helper（带登录 cookie / token）             | 按需 |
| `Tests/shared/capture-auth.ts`                    | 手动导出登录态（connectOverCDP，人工过验证码）             | 按需 |

### 6.2 UI 套件文件（`Tests/ui-automation/`）

| 文件 / 目录                     | 说明                                                                                         | 必需 |
| ------------------------------- | -------------------------------------------------------------------------------------------- | ---- |
| `package.json`                  | 仅 npm scripts（依赖走 `Tests/` 级，不放 devDependencies）                                   | ✅   |
| `.gitignore`                    | UI 层忽略规则（`.env` / 报告等）                                                             | ✅   |
| `run.mjs`                       | 跨平台执行入口：解析 `--domain`/`--module`，注入 `TEST_DOMAIN_PATH`/`TEST_MODULE_PATH`       | ✅   |
| `run-report.mjs`                | 一键收尾入口：依次调 `run.mjs` + `gen-report.mjs`（技能默认调用）                            | ✅   |
| `gen-report.mjs`                | `junit.xml` → `TEST-REPORT.md`（机械版）+ `execution-digest.json`                            | ✅   |
| `report-template-regression.md` | AI 回归报告模板（失败归因 `ENV/DATA/SCRIPT/DEFECT/CHANGE`）                                  | ✅   |
| `playwright.config.ts`          | 运行时作用域版配置（读 `TEST_DOMAIN_PATH`/`TEST_MODULE_PATH` 动态定 testDir/testMatch/报告） | ✅   |
| `global-setup.ts`               | 登录态校验 + 失效唤起人工过码 + 写入 `Tests/shared/.auth`                                    | ✅   |
| `.env` / `.env.example`         | `TEST_BASE_URL`、`TEST_USERNAME`、`TEST_PASSWORD`、`PW_BROWSER_CHANNEL`                      | ✅   |
| `test-reports/`                 | 报告输出目录（随运行粒度落盘：`<一级模块>/<二级模块\|all-modules>/`）                        | ✅   |

### 6.3 二级模块文件（`Tests/ui-automation/<一级模块>/<二级模块>/`）

| 文件                        | 说明                                                                                         | 必需 |
| --------------------------- | -------------------------------------------------------------------------------------------- | ---- |
| `specs/ATS-*.spec.ts`       | 每个功能点编号对应一个 spec 文件；嵌入 FT 表格的 `ET-*` 异常用例写入同域 spec 内，不另立文件 | ✅   |
| `pages/*.page.ts`           | 页面对象，封装选择器与操作                                                                   | ✅   |
| `fixtures/*.fixture.ts`     | 模块夹具，封装模块级上下文与扩展能力                                                         | ✅   |
| `data/*.data.ts`            | 测试数据集中管理（基于系统已有数据）                                                         | ✅   |
| `snapshots/`                | 模块级快照或对比工件                                                                         | 按需 |
| `data-testid.snapshot.json` | data-testid 知识库快照：§7 intent + 脚本覆盖证据 + 缺口清单                                  | 按需 |
| `README.md`                 | 模块说明、运行方式、前置条件                                                                 | ✅   |

## 7. 输出格式建议

```markdown
## 场景优先级

- 先做：列表加载、查询筛选、详情查看（数据驱动、交互简单）
- 后做：新增/编辑表单（依赖级联选择、表单校验）、状态启停（依赖确认弹窗）

## 定位与等待建议

- 选择器优先级：data-testid > aria-label > CSS class > 文本
- 等待策略：用 expect(element).toBeVisible()，不用 networkidle
```

## 8. 边界与移交

### 8.1 本 skill 负责

- 输出 UI 自动化目录结构、文件清单、README 要点
- 给出 `ATS-*.spec.ts` / `pages` / `fixtures` / `data` 的骨架建议
- 给出场景优先级、定位方式、等待策略、可测性要求
- 帮 tester 判断哪些 `FT-*` / `ET-*` 适合先做、哪些场景应后做（含嵌入 FT 表格的 `ET-*` 异常用例）

### 8.2 本 skill 不负责

- 不直接承担完整可执行的 `spec/page/fixture/data` 脚本实现
- 不负责基于 trace / error-context / junit 的失败脚本修复
- 不负责版本迭代中的既有脚本改造、维护与回归修订
- 不负责把骨架建议扩展成完整 Playwright 业务实现

### 8.3 何时移交给下一个 skill

本 skill 只产出**骨架**（目录 + 文件清单 + 含 `data-testid` 定位占位的 page/spec 骨架）。**用户确认骨架（尤其定位点是否正确）后**，再切换到 `playwright-test-implementation` 填充真实交互、断言、测试数据与失败修复：

- 需要生成真实可执行的 Playwright 脚本代码
- 需要补齐页面对象、夹具、测试数据与断言逻辑
- 需要针对版本增量修改既有脚本
- 需要结合 trace / error-context / junit 修失败用例

## 9. 约束

- 不把 Browser Use 这类探索式能力当作正式回归脚本主引擎。
- 脚本命名必须保留功能点编号主线（`FT-*` / `ET-*` 均须保留）；`ET-*` 编号带功能域粒度 `ET-{MODULE}-{FEATURE}-{NNN}`，与同源 `FT-*` 落在同一 spec。
- **spec 文件必须使用 `ATS-{一级模块}-{二级模块}-{功能域}-{起始用例号}.spec.ts` 命名**（如 `ATS-CONFIG-BILLCFG-FORM-001.spec.ts`），保留功能用例编号主线，禁止自由命名（如 `detail.spec.ts`、`form-add.spec.ts`）；`playwright-test-implementation` 接手时必须沿用骨架命名，不得重命名。
- **README 必须包含首次运行前置三步**：`npm install`（装依赖）→ `npx playwright install`（装浏览器二进制）→ `npm run auth:capture`（捕获登录态）。漏 `playwright install` 会导致浏览器启动报错。
- 优先用稳定定位点，再考虑脆弱选择器。
- UI 自动化骨架可前置，但完整主场景脚本应在页面结构和定位点基本稳定后补齐。
- **禁止在测试脚本中硬编码测试环境地址与账号**，必须通过 `Tests/ui-automation/.env` 这类环境配置注入。
- **禁止每个测试用例单独登录**，必须复用 `Tests/shared/.auth/<一级模块>/domain-state.json` 认证态（UI 由 `globalSetup` 生成、接口由 `storageState` 消费）。
- **禁止用 `networkidle` 作为主要等待手段**，改用 DOM 元素可见性断言。
- **选择器必须优先使用 `data-testid`**（实际取值以 `02-详细设计文档.md` §7 清单为准），缺失时要求前端补充，而非直接用脆弱的 CSS class 或文本定位。
- **data-testid 定位占位在骨架阶段就落位**：bootstrap 生成骨架时，直接把 `02-详细设计文档.md` §7 / `data-testid.snapshot.json` 中**已定义**的 `data-testid` 作为稳定定位写进 page 对象与 spec 骨架（用 `getByTestId(...)`），不凭空猜、不空壳留待后面；只有 §7 确实缺失的定位才标记推前端补充。骨架本身不实现真实交互/断言/数据，那属于 `playwright-test-implementation` 职责。
- **测试数据必须基于系统已有数据编写**，先访问页面查看实际值（机构名、项目名、产品名、状态值等），不要凭空编造。
- **依赖统一安装在 `Tests/` 级**（`Tests/package.json` 单一来源），不要在 `Tests/ui-automation`、`Tests/api-automation` 下重复 `npm install`。
- **登录态与鉴权 helper 统一放 `Tests/shared/`**，供 UI 与接口共用；**UI 自己的 `playwright.config.ts`、`global-setup.ts`、`.env`、公共脚本放 `Tests/ui-automation/`**，不要为每个二级模块重复放置一套。
- **`playwright.config.ts` 必须是运行时作用域版（单份，放 UI 套件根）**：读 `TEST_DOMAIN_PATH`（必填，单个目录段，禁止含 `/` `\` `..`）与 `TEST_MODULE_PATH`（可选）动态决定 `testDir` / `testMatch` / 报告目录 / `storageState` 路径。**禁止为每个一级/二级模块复制一份 config**，也**禁止在 config 里硬编码任何模块目录名**。新增模块零改 config。
- **`testMatch` 必须按运行粒度切换**：单二级模块作用域用 `**/*.spec.ts`（testDir 已指向该模块 `specs/`）；一级模块全量作用域用 `**/specs/**/*.spec.ts`（强制只扫各模块 `specs/`，避免误扫模块根或 pages/fixtures 下的 `.spec.ts`）。
- **执行/报告链路三件套（`run.mjs` + `run-report.mjs` + `gen-report.mjs`，辅以 `report-template-regression.md`）固定放 UI 套件根**，所有一级/二级模块共用；**禁止把任一文件下沉或复制到二级模块**。新增模块零改链路。
- **`Tests/ui-automation/package.json` scripts 必须含**：`test`（→ `run.mjs`）、`test:list`（→ `run.mjs --list`）、`test:install`（→ `npx playwright install chromium`）、`test:report`（→ `run-report.mjs`）、`report:gen`（→ `gen-report.mjs`）、`report`（→ `playwright show-report`）、`auth:capture`（→ `tsx shared/auth/capture-auth.ts`）。脚本命名跨模块统一，便于技能与 CI 直接调用。
- **auth 链路（`global-setup.ts` / `capture-auth.ts` / `base.fixture.ts`）必须读 `TEST_DOMAIN_PATH` 确定一级模块**（独立运行如 `npm run auth:capture` 时回退到默认模块），`storageState` 路径随作用域走 `Tests/shared/.auth/<一级模块>/domain-state.json`。**禁止在任何 auth 文件里硬编码模块名**。
- **报告输出路径随运行粒度落盘**：单二级模块 → `test-reports/<一级模块>/<二级模块>/`；一级模块全量 → `test-reports/<一级模块>/all-modules/`。`junit.xml` / `html/` / `artifacts/` / `execution-digest.json` / `TEST-REPORT.md` 均落在此目录。
- **禁止绕过 `run.mjs` / `run-report.mjs` 直接 `npx playwright test` 裸跑**：裸跑不注入 `TEST_DOMAIN_PATH`，运行时作用域版 config 会直接报错（`TEST_DOMAIN_PATH 必填`）。所有执行必须经 `node run.mjs --domain <一级模块> [--module <二级模块>]` 或对应 npm script。
