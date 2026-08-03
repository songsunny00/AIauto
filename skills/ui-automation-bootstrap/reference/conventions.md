# 命名规则与硬约束

> 本文档从 SKILL.md §4.3 + §9 拆分，供 agent 按需加载。列出不遵守会导致返工或运行失败的硬规则。

## spec 命名（硬规则，非建议）

spec 文件必须命名为 `ATS-{一级模块}-{二级模块}-{功能域}-{起始用例号}.spec.ts`（如 `ATS-CONFIG-BILLCFG-DETAIL-001.spec.ts`），**禁止自由命名**（如 `detail.spec.ts`、`form-add.spec.ts`）。

- 同一功能域内用例较多时可按子域拆多个文件，每个文件用其**首条用例编号**命名（如 `ATS-CONFIG-BILLCFG-LIST-001.spec.ts`、`ATS-CONFIG-BILLCFG-LIST-008.spec.ts`）。
- `ET-*` 异常用例编号带功能域粒度 `ET-{MODULE}-{FEATURE}-{NNN}`，与所在 FT 表格域前缀一致；跨域异常 `ET-{MODULE}-X-{NNN}`。`ET-*` 写入同源功能 spec，**不另立 `-ERR-` 文件**。
- `playwright-test-implementation` 接手时必须沿用骨架命名，**不得重命名**。

## 硬约束清单

1. 不把 Browser Use 这类探索式能力当作正式回归脚本主引擎。
2. 脚本命名必须保留功能点编号主线（`FT-*` / `ET-*` 均须保留）；`ET-*` 与同源 `FT-*` 落在同一 spec。
3. **spec 文件必须使用 `ATS-{一级模块}-{二级模块}-{功能域}-{起始用例号}.spec.ts` 命名**，保留功能用例编号主线，禁止自由命名。
4. **README 必须包含首次运行前置三步**：`npm install`（装依赖）→ `npx playwright install`（装浏览器二进制）→ `npm run auth:capture`（捕获登录态）。漏 `playwright install` 会导致浏览器启动报错。
5. 优先用稳定定位点，再考虑脆弱选择器。
6. UI 自动化骨架可前置，但完整主场景脚本应在页面结构和定位点基本稳定后补齐。
7. **禁止在测试脚本中硬编码测试环境地址与账号**，必须通过 `Tests/.env` 这类环境配置注入。
8. **禁止每个测试用例单独登录**，必须复用 `Tests/shared/.auth/<一级模块>/domain-state.json` 认证态（UI 由 `globalSetup` 生成、接口由 `storageState` 消费）。
9. **禁止用 `networkidle` 作为主要等待手段**，改用 DOM 元素可见性断言。
10. **选择器必须优先使用 `data-testid`**（实际取值以 `02-详细设计文档.md` §7 清单为准），缺失时要求前端补充，而非直接用脆弱的 CSS class 或文本定位。
11. **data-testid 定位占位在骨架阶段就落位**：bootstrap 生成骨架时，直接把 `02-详细设计文档.md` §7 / `data-testid.snapshot.json` 中**已定义**的 `data-testid` 作为稳定定位写进 page 对象与 spec 骨架（用 `getByTestId(...)`），不凭空猜、不空壳留待后面；只有 §7 确实缺失的定位才标记推前端补充。骨架本身不实现真实交互/断言/数据，那属于 `playwright-test-implementation` 职责。
12. **测试数据必须基于系统已有数据编写**，先访问页面查看实际值（机构名、项目名、产品名、状态值等），不要凭空编造。
13. **依赖统一安装在 `Tests/` 级**（`Tests/package.json` 单一来源），不要在 `Tests/ui-automation`、`Tests/api-automation` 下重复 `npm install`。
14. **登录态与鉴权 helper 统一放 `Tests/shared/`**，供 UI 与接口共用；**UI 自己的 `playwright.config.ts`、`global-setup.ts`、公共脚本放 `Tests/ui-automation/`**，不要为每个二级模块重复放置一套。
15. **`.env` 与 `.env.example` 放 `Tests/` 级**（单一来源），不在 `ui-automation/` 下；含 `DEFAULT_DOMAIN`/`DEFAULT_AUTH_PATH`（global-setup 独立运行回退值）。
16. **`playwright.config.ts` 必须是运行时作用域版（单份，放 UI 套件根）**：读 `TEST_DOMAIN_PATH`（必填，单个目录段，禁止含 `/` `\` `..`）与 `TEST_MODULE_PATH`（可选）动态决定 `testDir` / `testMatch` / 报告目录 / `storageState` 路径。**禁止为每个一级/二级模块复制一份 config**，也**禁止在 config 里硬编码任何模块目录名**。新增模块零改 config。
17. **`testMatch` 必须按运行粒度切换**：单二级模块作用域用 `**/*.spec.ts`（testDir 已指向该模块 `specs/`）；一级模块全量作用域用 `**/specs/**/*.spec.ts`（强制只扫各模块 `specs/`，避免误扫模块根或 pages/fixtures 下的 `.spec.ts`）。
18. **执行/报告链路三件套（`run.mjs` + `run-report.mjs` + `gen-report.mjs`，辅以 `report-template.md`）固定放 UI 套件根**，所有一级/二级模块共用；**禁止把任一文件下沉或复制到二级模块**。新增模块零改链路。
19. **`Tests/package.json` scripts 必须含**：`test`/`test:ui`（→ `ui-automation/run.mjs`）、`test:list`（→ `run.mjs --list`）、`test:install`（→ `npx playwright install chromium`）、`test:report`（→ `run-report.mjs`）、`report:gen`（→ `gen-report.mjs`）、`report`（→ `playwright show-report`）、`typecheck`（→ `tsc --noEmit`）、`auth:capture`（→ `tsx shared/auth/capture-auth.ts`）。**依赖与 scripts 单一来源在 `Tests/package.json`，`ui-automation/` 下无 `package.json`**。脚本命名跨模块统一，便于技能与 CI 直接调用。
20. **auth 链路（`global-setup.ts` / `capture-auth.ts` / `base.fixture.ts`）必须读 `TEST_DOMAIN_PATH` 确定一级模块**（独立运行如 `npm run auth:capture` 时回退到 `.env` 的 `DEFAULT_DOMAIN`），`storageState` 路径随作用域走 `Tests/shared/.auth/<一级模块>/domain-state.json`。**禁止在任何 auth 文件里硬编码模块名**。
21. **报告输出路径随运行粒度落盘**：单二级模块 → `test-reports/<一级模块>/<二级模块>/`；一级模块全量 → `test-reports/<一级模块>/all-modules/`。`junit.xml` / `html/` / `artifacts/` / `execution-digest.json` / `TEST-REPORT.md` 均落在此目录。
22. **禁止绕过 `run.mjs` / `run-report.mjs` 直接 `npx playwright test` 裸跑**：裸跑不注入 `TEST_DOMAIN_PATH`，运行时作用域版 config 会直接报错（`TEST_DOMAIN_PATH 必填`）。所有执行必须经 `node run.mjs --domain <一级模块> [--module <二级模块>]` 或对应 npm script。
23. **grep 过滤必须走 `TEST_GREP` 环境变量通道**：`run.mjs` 把 `--grep` 值提取到 `TEST_GREP` env，`playwright.config.ts` 的 `grep` 选项读取注入；禁止直接用 `--grep=...|...` 命令行参数（Windows cmd 把 `|` 当管道符）。使用：`$env:TEST_GREP="FT-XXX-(...)"`，用 `FT-` 前缀排除 `ET-` 同号异常用例子串误匹配。
