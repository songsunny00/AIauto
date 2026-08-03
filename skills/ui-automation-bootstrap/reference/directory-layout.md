# 目录结构参考

> 本文档从 SKILL.md §5 拆分，供 agent 按需加载。描述「测试资产共享层 + UI 套件 + 接口套件 + 一级模块 + 二级模块」的标准目录结构。

## 结构总览

默认采用「**测试资产共享层（Tests/）+ UI 套件 + 接口套件 + 一级模块 + 二级模块**」结构。

- **共享层**：放在 `Tests/`（含 `Tests/package.json` 依赖单一来源、`Tests/.env` 环境变量单一来源）与 `Tests/shared/`（登录态、鉴权 helper、手动导出脚本），供 `Tests/ui-automation` 与 `Tests/api-automation` 共用。
- **UI 套件**：`Tests/ui-automation/`，只放 UI 自己的用例与配置（`playwright.config.ts`、`global-setup.ts`、公共脚本、报告）。
- **接口套件**：`Tests/api-automation/`，与 `Tests/ui-automation` 同级，复用同一份登录态。
- **一级模块**：如 `CONFIG-配置中心/`。
- **二级模块**：如 `BILLCFG-商业化计费配置/`，只放本模块自己的 `specs/pages/fixtures/data/README`。

## 目录树

```text
Tests/
├── package.json                # 依赖单一来源：@playwright/test + tsx + @types/node
├── node_modules/               # 统一安装目录（ui/api 向上解析复用）
├── .env                        # 环境与账号单一来源（不入库；含 DEFAULT_DOMAIN/DEFAULT_AUTH_PATH）
├── .env.example                # .env 模板（入库）
├── .gitignore                  # 忽略 node_modules / 运行产物 / .env / .auth
├── shared/                     # 共享层（ui-automation 与 api-automation 共用，不在 ui-automation 内）
│   ├── .auth/                  # 共享认证态（gitignore），按一级模块隔离
│   │   └── <一级模块>/domain-state.json
│   ├── auth/
│   │   ├── auth-state.ts       # 登录态路径解析
│   │   └── api-auth.ts         # 接口请求上下文 helper（带登录 cookie / token）
│   └── capture-auth.ts         # 手动导出登录态（connectOverCDP，人工过验证码）
├── ui-automation/              # UI 套件：只放 UI 用例与配置（无 package.json，scripts 在 Tests/ 级）
│   ├── run.mjs                 # 跨平台执行入口：解析 --domain/--module，注入 TEST_DOMAIN_PATH/TEST_MODULE_PATH/TEST_GREP
│   ├── run-report.mjs          # 一键收尾入口：跑 run.mjs + gen-report.mjs（技能默认调用）
│   ├── gen-report.mjs          # junit.xml -> TEST-REPORT.md（机械版）+ execution-digest.json
│   ├── report-template.md # AI 回归报告模板（失败归因 ENV/DATA/SCRIPT/DEFECT/CHANGE）
│   ├── playwright.config.ts    # 运行时作用域版：读 TEST_DOMAIN_PATH/TEST_MODULE_PATH 动态定 testDir/testMatch/报告目录
│   ├── global-setup.ts         # 校验登录态，失效唤起人工过码，写入 Tests/shared/.auth/<一级模块>/domain-state.json
│   ├── helpers/                # 通用 helpers（跨模块复用，由 bootstrap templates/helpers/ 复制；含交互经验修复）
│   │   ├── element-plus.ts     # el-select/cascader/MessageBox 交互
│   │   ├── visibility.ts       # 可见性/残留清理/固定列偏移
│   │   ├── network.ts          # API 等待/mock/调用计数
│   │   └── errors.ts           # toast+行内双查错误收集
│   ├── fixtures/
│   │   └── base.fixture.ts     # 通用夹具 authedPage（由 bootstrap templates/fixtures/ 复制）
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

## 关键说明

- **依赖只在 `Tests/` 级安装一份**（`Tests/package.json`），`ui-automation` 与 `api-automation` 通过 npm 向父目录解析复用，不要在二级套件下再 `npm install`。
- **`.env` 与 `.env.example` 在 `Tests/` 级**（单一来源），不在 `ui-automation/` 下；含 `DEFAULT_DOMAIN` / `DEFAULT_AUTH_PATH`（global-setup 独立运行回退值）。
- **登录态统一在 `Tests/shared/.auth/<一级模块>/domain-state.json`**，UI 与接口共用同一份，验证码只需过一次。
- 验证码处理已内联进 `global-setup.ts`（滑块破解不再单独成脚本）；默认不要把 `playwright.config.ts`、`global-setup.ts` 散落到二级模块目录。
- **运行时作用域（单 config 跑任意模块）**：`playwright.config.ts` 只有一份，放 UI 套件根；由 `run.mjs --domain <一级模块> [--module <二级模块>]` 注入 `TEST_DOMAIN_PATH`（必填）/`TEST_MODULE_PATH`（可选）两个环境变量驱动，config 内据此动态决定 `testDir` / `testMatch` / 报告输出目录 / storageState 路径。**禁止为每个二级模块复制一份 config**，也**禁止直接 `npx playwright test` 裸跑**（不会注入作用域变量，config 直接报错）。
- **执行/报告链路三件套**（`run.mjs` + `run-report.mjs` + `gen-report.mjs`，辅以 `report-template.md` 模板）固定放 UI 套件根，供所有一级/二级模块共用；**禁止把任一文件下沉到二级模块**。`run-report.mjs` 是技能默认收尾入口（跑测试 + 产出 digest + 机械报告）。
