---
name: ui-automation-bootstrap
description: 基于测试用例与页面信息生成 UI 自动化目录结构、README 要点和脚本骨架建议。
allowed-tools: Read Glob Grep Edit Write
---

# ui-automation-bootstrap

## 1. 目标

在项目**决定采用 Playwright 做 UI 自动化测试**时触发，围绕目标模块输出一套可直接起步的 **UI 自动化骨架方案**（目录结构 + 文件清单 + 含 `data-testid` 定位占位的 page/spec 骨架 + 标准脚本复制），服务 `Tests/ui-automation/...` 目录建设；骨架确认后，由 `playwright-test-implementation` 接手完成具体脚本编写。

## 2. 适用输入

- `02-详细设计文档.md`（含 §7 `data-testid` 清单，是稳定定位字典的直接输入）
- 模块 `data-testid.snapshot.json`（data-testid 知识库快照：§7 intent + 脚本引用证据 `evidence` + 缺口清单 `gaps`）
- `03-测试用例文档.md`
- `01-需求文档.md`
- 页面路径 / 路由信息
- 相关前端代码（如可读）

## 3. 期望输出

至少输出：

1. 目标 UI 自动化目录结构
2. 建议创建的 `specs/pages/fixtures/data` 文件清单
3. `README.md` 要点（**必须**含首次运行前置三步：`npm install` → `npx playwright install` 安装浏览器二进制 → `npm run auth:capture` 捕获登录态；漏装浏览器二进制会导致 `auth:capture` / 测试执行报错）
4. 每个 `FT-*` 与**嵌入 FT/IT 表格的 `ET-*` 异常用例**对应的初始脚本命名建议（`ET-*` 写入同源功能 spec，不另立文件）
5. 定位方式与等待策略建议
6. 哪些场景先做、哪些场景后做
7. **标准脚本复制清单**（见 §5，从 skill 内 `scripts/` 与 `templates/` 复制，不凭记忆复刻）

## 4. 使用步骤

1. 从 `03` 中找出适合 UI 自动化的 `FT-*` 与**嵌入 FT/IT 表格中的 `ET-*` 异常用例**（`ET-*` 编号带功能域粒度 `ET-{MODULE}-{FEATURE}-{NNN}`，与所在 FT 表格域前缀一致；跨域异常 `ET-{MODULE}-X-{NNN}`）。
2. 结合页面结构与原型说明，建议脚本拆分方式。
3. 输出 `ATS-*.spec.ts` 命名约束（**硬规则**）：`ATS-{一级模块}-{二级模块}-{功能域}-{起始用例号}.spec.ts`（如 `ATS-CONFIG-BILLCFG-DETAIL-001.spec.ts`），禁止自由命名。同一功能域用例较多时可按子域拆多个文件，每个文件用其首条用例编号命名。
4. 输出页面对象、夹具、数据文件的最小清单。
5. 根据 `02-详细设计文档.md` §7 的 `data-testid` 清单与模块 `data-testid.snapshot.json`，**顺带把已定义的 `data-testid` 直接写进 page 对象 / spec 骨架的定位占位**（用 `getByTestId(...)`）；仅当 §7 也未定义某交互所需定位时，才标记该处需前端补充 `data-testid`。
6. **生成测试数据前，先访问测试页面查看系统已有数据**（机构名、项目名、状态值等），基于实际数据编写，不要凭空编造。
7. **按 §5 复制清单，把 skill 内标准脚本/模板复制到 Tests/ 对应位置**，不要凭记忆重写。

## 5. 脚本与模板固化（核心）

skill 内自带标准脚本与模板，bootstrap 时**直接复制**，避免凭记忆复刻导致漂移或传播已知 bug。

### 5.1 复制清单

| skill 内文件                              | 复制到                                              | 处理                                                                                               |
| ----------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `scripts/run.mjs`                         | `Tests/ui-automation/run.mjs`                       | 原样                                                                                               |
| `scripts/run-report.mjs`                  | `Tests/ui-automation/run-report.mjs`                | 原样                                                                                               |
| `scripts/gen-report.mjs`                  | `Tests/ui-automation/gen-report.mjs`                | 原样（**已修复** junit `<error>` 标签不识别 bug）                                                  |
| `scripts/global-setup.ts`                 | `Tests/ui-automation/global-setup.ts`               | 原样（默认值已参数化为读 `.env` 的 `DEFAULT_DOMAIN`/`DEFAULT_AUTH_PATH`）                          |
| `templates/playwright.config.ts`          | `Tests/ui-automation/playwright.config.ts`          | 原样（运行时作用域版，无硬编码）                                                                   |
| `templates/report-template.md` | `Tests/ui-automation/report-template.md` | 原样（AI 报告模板）                                                                                |
| `templates/env.example.template`          | `Tests/.env.example` → 复制为 `Tests/.env`          | 填入实际值（`TEST_BASE_URL`/`TEST_USERNAME`/`TEST_PASSWORD`/`DEFAULT_DOMAIN`/`DEFAULT_AUTH_PATH`） |
| `templates/module-README.template.md`     | `<二级模块>/README.md`                              | 替换 `{{占位}}`（模块名/一级模块/二级模块/MODULE）                                                 |
| `templates/helpers/*.ts`（4 文件）        | `Tests/ui-automation/helpers/`                      | 原样（含经验修复：cascader 浮层关闭 / MessageBox 时序 / 固定列偏移 / toast+行内双查）              |
| `templates/fixtures/base.fixture.ts`      | `Tests/ui-automation/fixtures/base.fixture.ts`      | 原样（默认值已参数化为读 `.env` 的 `DEFAULT_DOMAIN`）                                              |
| `reference/*.md`                          | **不复制**                                          | agent 按需 Read（目录结构/文件清单/硬规则参考）                                                    |

### 5.2 版本对齐

skill 内脚本会持续修复 bug 与增强。已建项目如需对齐，对比 `scripts/` 与 `Tests/ui-automation/` 对应文件的版本（看文件头注释或 git log），按需同步。已知修复记录：

- `gen-report.mjs`：识别 junit `<error>` 标签（原版漏识别导致 error 用例误标为 passed）
- `global-setup.ts` / `base.fixture.ts`：默认值参数化为读 `.env`（原版硬编码 `CONFIG-配置中心`）
- `run.mjs`：`--grep` 走 `TEST_GREP` 环境变量通道（绕开 Windows cmd 对 `|` 的管道解析）
- `helpers/`：含交互经验修复（cascader 浮层关闭 `dismissCascaderPopper` / MessageBox 时序 `waitForMessageBox` / 固定列偏移 `cellIndex` / toast+行内双查 `collectErrors`）

## 6. 目录结构与文件清单（参考）

完整目录树与文件清单见：

- `reference/directory-layout.md` — 「共享层 + UI 套件 + 接口套件 + 一级模块 + 二级模块」目录树与说明
- `reference/file-inventory.md` — 共享层 / UI 套件 / 二级模块文件清单表

要点：依赖与 `.env` 单一来源在 `Tests/` 级；登录态在 `Tests/shared/.auth/<一级模块>/`；UI 套件根放 6 个脚本 + config + global-setup（无 `package.json`，scripts 在 `Tests/package.json`）。

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
- **按 §5 复制清单把标准脚本/模板落到 Tests/ 对应位置**

### 8.2 本 skill 不负责

- 不直接承担完整可执行的 `spec/page/fixture/data` 脚本实现
- 不负责基于 trace / error-context / junit 的失败脚本修复
- 不负责版本迭代中的既有脚本改造、维护与回归修订

### 8.3 何时移交给下一个 skill

用户确认骨架（尤其定位点是否正确）后，切换到 `playwright-test-implementation` 填充真实交互、断言、测试数据与失败修复。

## 9. 核心硬规则（完整版见 `reference/conventions.md`）

1. **spec 命名**：必须 `ATS-{一级模块}-{二级模块}-{功能域}-{起始用例号}.spec.ts`，禁止自由命名；`ET-*` 写入同源 spec 不另立文件。
2. **首次运行三步**：`npm install` → `npx playwright install` → `npm run auth:capture`；漏装浏览器二进制会报错。
3. **运行时作用域 config**：单份 `playwright.config.ts` 放 UI 套件根，读 `TEST_DOMAIN_PATH`/`TEST_MODULE_PATH` 动态定 testDir/testMatch/报告；禁止为模块复制 config，禁止裸跑 `npx playwright test`。
4. **执行/报告链路三件套**：`run.mjs` + `run-report.mjs` + `gen-report.mjs` 固定放 UI 套件根，禁止下沉到二级模块；所有执行经 `node run.mjs --domain <一级模块> [--module <二级模块>]`。
5. **grep 走 TEST_GREP 环境变量**：禁止 `--grep=...|...` 命令行参数（Windows cmd 把 `|` 当管道符）；用 `FT-` 前缀排除 `ET-` 同号误匹配。

完整 23 条硬规则（含定位/等待/数据/依赖/auth/报告路径等）见 `reference/conventions.md`。
