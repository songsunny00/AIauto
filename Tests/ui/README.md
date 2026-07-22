# Tests/ui — 多模块 UI 自动化测试框架（Playwright）

基于 [Playwright Test](https://playwright.dev/) 的 UI 端到端测试框架，按「一级模块 → 二级模块 → specs」三级目录组织用例，支持一次运行锁定一个一级模块、按需跑其下全部二级模块或单个二级模块。

## 1. 技术栈

| 类别 | 说明 |
| --- | --- |
| 测试框架 | `@playwright/test` `^1.61.1` |
| 运行环境 | Node.js（建议 LTS 18 / 20+，需支持 ESM `import.meta`） |
| 语言 | TypeScript（`.spec.ts` / `.config.ts` 由 Playwright 即时编译，无需单独 `tsc`） |
| 浏览器内核 | Playwright 自带 Chromium，或系统 Microsoft Edge / Google Chrome（通过 `PW_BROWSER_CHANNEL` 切换） |
| 报告 | List（终端）+ HTML + JUnit（三汇报器并行） |
| 执行封装 | `run.mjs`（执行入口，屏蔽 Windows / Bash 设置中文环境变量差异）、`gen-report.mjs`（读取 `junit.xml` 生成 Markdown 报告） |

## 2. 环境要求

- **Node.js**：18+，已安装 `npm`（同机）。
- **目标 Web 应用**：一个可访问的测试站点，默认 `http://localhost:7001`（与外网 `http://ack.omicsone.com` 为同一套前端 SPA）。需要保证该服务处于运行状态。
- **测试账号**：一个具有 admin 角色、且菜单权限包含 `menuId=11013` 的账号（用于登录生成共享登录态）。
- **浏览器**（二选一）：
  - 使用系统浏览器（无需下载）：本机已安装 Microsoft Edge（推荐）或 Google Chrome，并设置 `PW_BROWSER_CHANNEL=msedge`（或 `chrome`）。
  - 使用自带 Chromium：执行一次 `npm run test:install` 下载。

## 3. 目录结构

```
Tests/ui/                                         # 只放 UI 自己的用例与配置
├─ run.mjs                                        # 跨平台执行脚本（推荐测试入口）
├─ gen-report.mjs                                 # 测试报告生成器（读取 junit.xml -> Markdown）
├─ package.json                                   # 依赖 + npm scripts（capture:auth 走 ../shared）
├─ playwright.config.ts                           # 共享配置：动态 testDir / 报告目录 / 浏览器 channel
├─ global-setup.ts                                # 一级模块共享登录态生成 + 滑块验证码处理（写入 Tests/shared/.auth）
├─ .env / .env.example                            # 环境与账号（.env 不入库）
├─ .gitignore                                     # 忽略 .env / test-reports / node_modules
├─ test-reports/<一级模块>/<二级模块|all-modules>/{html, junit.xml, artifacts}
└─ <一级模块>/                                     # 运行边界（如 CONFIG-配置中心）
   └─ <二级模块>/                                  # 筛选项（如 BILLCFG-商业化计费配置）
      ├─ specs/*.spec.ts                           # 用例
      ├─ fixtures/*.fixture.ts                     # 模块专属 fixture（如登录态消费 + 数据预热）
      ├─ pages/*.page.ts                           # Page Object
      ├─ data/*.data.ts                            # 测试数据
      └─ README.md                                 # 二级模块说明

# 共享层（ui 与 api-automation 共用，不在 ui 内）：
Tests/shared/
├─ .auth/<一级模块>/domain-state.json             # 共享登录态（global-setup / capture-auth 生成）
├─ auth/{auth-state.ts, api-auth.ts}              # 登录态路径解析 + 接口请求上下文 helper
└─ capture-auth.ts                                # 手动导出登录态（人工过验证码）

# 接口自动化（与 ui 同级，复用同一份登录态）：
Tests/api-automation/
├─ package.json                                   # scripts: api / capture:auth
├─ playwright.api.config.ts                       # 接口配置，use.storageState 指向 Tests/shared/.auth
└─ <一级模块>/<二级模块>/api-specs/*.api.spec.ts  # 接口用例
```

## 4. 安装与初始化

> 依赖已**统一上提到 `Tests/` 级**（`Tests/package.json` 单一来源，ui 与 api-automation 共用），**不要在 `Tests/ui` 下再执行 `npm install`**，否则会在 ui 下重新生成一份 `node_modules`。

```powershell
# 依赖只需在 Tests/ 级装一次（已装过则跳过）
cd d:\AIauto\Tests
npm install
# 若使用自带 Chromium（而非系统 Edge/Chrome）才需要执行：
cd d:\AIauto\Tests\ui
npm run test:install
```

复制并填写环境配置（`.env` 已忽略入库，不会提交）：

```powershell
cd d:\AIauto\Tests\ui
Copy-Item .env.example .env
# 编辑 .env，至少确认以下字段：
#   TEST_BASE_URL=http://localhost:7001
#   TEST_USERNAME=你的账号
#   TEST_PASSWORD=你的密码
#   PW_BROWSER_CHANNEL=msedge
```

## 5. 使用场景

### 场景 A：一次运行一个一级模块下的全部二级模块

```powershell
node run.mjs --domain CONFIG-配置中心
# 等价 npm scripts：
npm test -- --domain CONFIG-配置中心
```

### 场景 B：只运行某个二级模块（推荐做单模块回归）

```powershell
node run.mjs --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置
```

### 场景 C：只运行某个 spec 文件

`--` 之后的参数会原样透传给 Playwright：

```powershell
node run.mjs --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置 -- specs/ATS-CONFIG-BILLCFG-LIST-001.spec.ts
```

### 场景 D：只列出用例（不执行，dry-run / discovery）

```powershell
# 列出一级模块全部用例
node run.mjs --domain CONFIG-配置中心 --list

# 列出单个二级模块用例
node run.mjs --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置 --list

# 等价 npm scripts：
npm run test:list -- --domain CONFIG-配置中心
```

### 场景 E：可视化调试（UI 模式）

UI 模式下可直接在浏览器看到每步操作、定位元素、单步重跑：

```powershell
node run.mjs --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置 -- --ui
```

### 场景 F：按标签 / 用例名筛选

```powershell
# 只跑 P0 冒烟集（按用例标题关键词）
node run.mjs --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置 -- --grep "P0|冒烟"

# 跑指定行（文件:行号）
node run.mjs --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置 -- specs/ATS-CONFIG-BILLCFG-LIST-001.spec.ts:42
```

### 场景 G：指定浏览器内核

编辑 `.env` 的 `PW_BROWSER_CHANNEL`：

- 留空 → Playwright 自带 Chromium
- `msedge` → 系统 Microsoft Edge（默认）
- `chrome` → 系统 Google Chrome

`playwright.config.ts` 与 `global-setup.ts` 会同步读取该变量，确保登录态生成与用例执行使用同一内核。

### 场景 H：不使用 run.mjs，直接用原生 Playwright 命令

**PowerShell：**

```powershell
$env:TEST_DOMAIN_PATH = 'CONFIG-配置中心'
$env:TEST_MODULE_PATH = 'BILLCFG-商业化计费配置'
npx playwright test --config=playwright.config.ts
```

**Bash / Git Bash：**

```bash
TEST_DOMAIN_PATH=CONFIG-配置中心 TEST_MODULE_PATH=BILLCFG-商业化计费配置 \
  npx playwright test --config=playwright.config.ts
```

### 场景 I：CI / 流水线

`run.mjs` 对参数做校验，非法输入以退出码 `2` 失败，便于流水线快速暴露配置错误：

```yaml
# 示例：在 CI 中跑单二级模块并产出 JUnit
- run: |
    cd Tests/ui
    node run.mjs --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置
  # 失败时读取 test-reports/CONFIG-配置中心/BILLCFG-商业化计费配置/junit.xml
```

### 场景 J：生成 Markdown 测试报告

测试跑完后，用 `gen-report.mjs` 把 Playwright 产出的 `junit.xml` 整理成一份可读的 Markdown 报告（含执行概览、各 spec 明细、失败/跳过用例清单、产物路径）。需先执行测试生成 `junit.xml`，再运行报告生成：

```powershell
# 第 1 步：跑测试（生成 junit.xml）
npm test -- --domain CONFIG-配置中心

# 第 2 步：生成报告
npm run report:gen -- --domain CONFIG-配置中心
# 等价：node gen-report.mjs --domain CONFIG-配置中心
```

- 不传 `--module` → 读取全量结果 `test-reports/<一级模块>/all-modules/junit.xml`，报告落到同目录 `TEST-REPORT.md`。
- 传 `--module` → 读取单个二级模块结果，报告落到 `test-reports/<一级模块>/<二级模块>/TEST-REPORT.md`。
- 报告内容：元信息（环境 / 浏览器 / 版本 / 时间）、执行概览（通过/失败/跳过/错误/耗时）、各 spec 文件明细、失败用例清单、跳过用例清单、产物位置。

> 报告生成脚本无额外依赖，仅用 Node 内置模块解析 `junit.xml`，可随时重跑。

## 6. 报告与登录态

- **登录态**：`global-setup.ts` 用 `.env` 账号登录后，写入 `.auth/<一级模块>/domain-state.json`，被各二级模块 fixture 共享消费。
- **HTML 报告**：
  - 单二级模块：`test-reports/<一级模块>/<二级模块>/html`
  - 一级模块全量：`test-reports/<一级模块>/all-modules/html`
- **JUnit**：同目录下的 `junit.xml`（便于 CI 接入）。
- **Markdown 报告**：执行测试后用 `npm run report:gen -- --domain <一级模块> [--module <二级模块>]` 生成，落到同目录 `TEST-REPORT.md`。详见「场景 J」。
- **查看报告**：

```powershell
npx playwright show-report test-reports/CONFIG-配置中心/BILLCFG-商业化计费配置/html
# 等价 npm scripts：
npm run report -- test-reports/CONFIG-配置中心/BILLCFG-商业化计费配置/html
```

> 失败用例自动保留截图 / 视频 / trace（`screenshot/video/trace: retain-on-failure`），可在 HTML 报告中查看。

## 7. 执行边界与约定

- 一次执行**只面向一个一级模块**（`--domain` / `TEST_DOMAIN_PATH` 必传），否则报错退出（退出码 2）。
- 锁定一级模块后，可选跑其下**全部二级模块**（不传 `--module`）或**某个二级模块**（传 `--module`）。
- `--domain` / `--module` 必须是单个目录段，不能含 `/`、`\`、或 `..`（防止路径穿越），非法输入同样以退出码 2 失败。
- 二级模块目录约定需包含 `specs/` 子目录存放 `.spec.ts` 用例。

## 8. 常见问题

| 现象 | 可能原因 / 处理 |
| --- | --- |
| `[playwright.config] TEST_DOMAIN_PATH is required` | 未传 `--domain`，或 `--module` 写成了含路径的值。 |
| `Global setup login failed` | 账号密码错误、目标站点不可达，或滑块验证码未通过。检查 `.env` 与目标服务状态；失败截图见 `.auth/<一级模块>/login-failed.png`。 |
| 找不到浏览器 / 启动报错 | 用系统 Edge 需本机已装 Edge 且 `PW_BROWSER_CHANNEL=msedge`；用自带 Chromium 需先 `npm run test:install`。 |
| 用例在 `/login` 后无法进入业务页 | 账号缺少 `menuId=11013` 菜单权限，或未生成登录态（先确保 `global-setup` 通过）。 |
| 报告没生成 / 路径不对 | 报告按运行粒度落盘到 `test-reports/<一级模块>/<二级模块|all-modules>/`，与运行参数对应。 |

## 9. 登录态手动导出（验证码自动破解不稳时）

`global-setup.ts` 自带滑块验证码破解并自动写入 `Tests/shared/.auth/<一级模块>/domain-state.json`。若自动破解偶发失败，可用「人工登录一次、永久复用」的备用通道：

```powershell
# 第 1 步：用调试端口启动浏览器（关闭已开的同款浏览器，避免端口冲突）
Start-Process msedge -ArgumentList "--remote-debugging-port=9222"

# 第 2 步：在打开的浏览器里手动登录（人工拖验证码），停在业务页
# 第 3 步：另开终端，导出登录态（写回同一份 Tests/shared/.auth/<一级模块>/domain-state.json）
cd Tests/ui        # 或 cd Tests/api-automation，二者都有 capture:auth 脚本
$env:TEST_DOMAIN_PATH = 'CONFIG-配置中心'
npm run capture:auth
```

`Tests/shared/capture-auth.ts` 通过 `connectOverCDP` 连接你本地已登录的浏览器，把 cookie + localStorage 导出到与 UI 用例**完全相同**的 `Tests/shared/.auth/<一级模块>/domain-state.json`，因此 UI 与接口用例无需任何改动即可继续消费。导出后你的浏览器可照常使用，脚本只断开连接、不会关闭浏览器。

> 登录态会随会话过期失效；过期后重新执行一次 `npm run capture:auth` 即可，UI 与接口两边都不用改代码。

## 10. 接口测试复用登录态

接口自动化（一期 Playwright API，位于 `Tests/api-automation`，与 `Tests/ui` 同级）复用与 UI **同一份**登录态，因此接口用例也无需登录、无需过验证码：

```powershell
cd Tests/api-automation
$env:TEST_DOMAIN_PATH = 'CONFIG-配置中心'
npm run api
```

`npm run api` 走 `Tests/api-automation/playwright.api.config.ts`，其 `use.storageState` 指向 `Tests/shared/.auth/<一级模块>/domain-state.json`，每个接口请求会自动带上登录 cookie。接口用例也可直接调用共享 helper：

```ts
import { createAuthedApiContext } from "../../../../shared/auth/api-auth";
const request = await createAuthedApiContext();        // 自动带登录 cookie
const res = await request.get("/api/billingConfig/list");
```

- cookie 鉴权：开箱即用，`storageState` 自动随请求发送。
- localStorage 里的 token 鉴权：cookie 带不出去，用 `getTokenFromAuthState("token")` 取出后通过 `extraHTTPHeaders: { Authorization: \`Bearer ${token}\` }` 传入。

示例用例见 `Tests/api-automation/CONFIG-配置中心/BILLCFG-商业化计费配置/api-specs/billing.api.spec.ts`，按真实接口路径替换即可。

## 11. 相关文档

- 设计文档：`docs/superpowers/specs/2026-07-16-ui-multi-module-playwright-config-design.md`
- 实施计划：`docs/superpowers/plans/2026-07-16-ui-multi-module-playwright-config-implementation.md`
- 二级模块说明：`<一级模块>/<二级模块>/README.md`
