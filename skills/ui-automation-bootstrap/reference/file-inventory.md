# 文件清单参考

> 本文档从 SKILL.md §6 拆分，供 agent 按需加载。列出共享层、UI 套件、二级模块的标准文件清单。

## 6.1 测试资产共享层（`Tests/` 与 `Tests/shared/`）

| 文件 / 目录 | 说明 | 必需 |
| --- | --- | --- |
| `Tests/package.json` | **依赖 + npm scripts 单一来源**（`@playwright/test` + `tsx` + `@types/node` + `typescript`）；scripts 含 `test`/`test:ui`/`test:list`/`test:install`/`test:report`/`report:gen`/`report`/`typecheck`/`auth:capture` | ✅ |
| `Tests/.env` | 环境与账号单一来源（不入库）；含 `TEST_BASE_URL`/`TEST_USERNAME`/`TEST_PASSWORD`/`DEFAULT_DOMAIN`/`DEFAULT_AUTH_PATH` | ✅ |
| `Tests/.env.example` | `.env` 模板（入库） | ✅ |
| `Tests/.gitignore` | 忽略 `node_modules/` / 运行产物 / `.env` / `.auth` | ✅ |
| `Tests/shared/.auth/<一级模块>/domain-state.json` | 共享认证态（gitignore），UI 与接口共用 | ✅ |
| `Tests/shared/auth/auth-state.ts` | 登录态路径解析 | ✅ |
| `Tests/shared/auth/api-auth.ts` | 接口请求上下文 helper（带登录 cookie / token） | 按需 |
| `Tests/shared/auth/capture-auth.ts` | 手动导出登录态（`auth:capture` 调用，connectOverCDP 人工过验证码） | ✅ |

> **校准**：`Tests/ui-automation/` 下**无 `package.json`**（依赖与 scripts 单一来源在 `Tests/package.json`）；`.env` 也在 `Tests/` 级，不在 `ui-automation/` 下。

## 6.2 UI 套件（`Tests/ui-automation/`）

| 文件 / 目录 | 说明 | 必需 |
| --- | --- | --- |
| `run.mjs` | 跨平台执行入口：解析 `--domain`/`--module`，注入 `TEST_DOMAIN_PATH`/`TEST_MODULE_PATH`/`TEST_GREP` | ✅ |
| `run-report.mjs` | 一键收尾入口：依次调 `run.mjs` + `gen-report.mjs`（技能默认调用） | ✅ |
| `gen-report.mjs` | `junit.xml` → `TEST-REPORT.md`（机械版）+ `execution-digest.json` | ✅ |
| `report-template.md` | AI 回归报告模板（失败归因 `ENV/DATA/SCRIPT/DEFECT/CHANGE`） | ✅ |
| `playwright.config.ts` | 运行时作用域版配置（读 `TEST_DOMAIN_PATH`/`TEST_MODULE_PATH` 动态定 testDir/testMatch/报告） | ✅ |
| `global-setup.ts` | 登录态校验 + 失效唤起人工过码 + 写入 `Tests/shared/.auth` | ✅ |
| `test-reports/` | 报告输出目录（随运行粒度落盘：`<一级模块>/<二级模块\|all-modules>/`） | ✅ |

> 上述 6 个脚本/模板的**标准实现固化在 skill 的 `scripts/` 与 `templates/`**，bootstrap 时直接复制，不要凭记忆复刻。

## 6.3 二级模块（`Tests/ui-automation/<一级模块>/<二级模块>/`）

| 文件 | 说明 | 必需 |
| --- | --- | --- |
| `specs/ATS-*.spec.ts` | 每个功能点编号对应一个 spec 文件；嵌入 FT 表格的 `ET-*` 异常用例写入同域 spec 内，不另立文件 | ✅ |
| `pages/*.page.ts` | 页面对象，封装选择器与操作 | ✅ |
| `fixtures/*.fixture.ts` | 模块夹具，封装模块级上下文与扩展能力 | ✅ |
| `data/*.data.ts` | 测试数据集中管理（基于系统已有数据） | ✅ |
| `snapshots/` | 模块级快照或对比工件 | 按需 |
| `data-testid.snapshot.json` | data-testid 知识库快照：§7 intent + 脚本覆盖证据 + 缺口清单 | 按需 |
| `README.md` | 模块说明、运行方式、前置条件（含首次运行三步） | ✅ |
