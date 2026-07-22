# Tests/api-automation — 接口自动化（一期：Playwright API）

与 `Tests/ui` 同级的接口自动化测试框架。复用与 UI **完全相同**的登录态 `Tests/shared/.auth/<一级模块>/domain-state.json`，因此接口用例无需登录、也无需过图片拖拽验证码。

## 1. 技术栈

| 类别 | 说明 |
| --- | --- |
| 测试框架 | `@playwright/test`（与 UI 同版本，依赖安装在 `Tests/` 级，见 `Tests/package.json`） |
| 运行环境 | Node.js（建议 LTS 18 / 20+） |
| 语言 | TypeScript（由 Playwright 即时编译，无需单独 `tsc`） |
| 鉴权 | 复用 UI 导出的 `storageState`（cookie 自动随请求发送） |
| 报告 | List + JUnit（`test-reports/api/junit.xml`，便于 CI 接入） |

## 2. 目录结构

```
Tests/api-automation/
├─ package.json                          # scripts: api / capture:auth
├─ playwright.api.config.ts              # 接口配置；use.storageState 指向 Tests/shared/.auth
└─ <一级模块>/<二级模块>/api-specs/*.api.spec.ts   # 接口用例（如 CONFIG-配置中心/BILLCFG-.../api-specs）
```

共享代码不放在本目录内，统一在 `Tests/shared/`：

- `Tests/shared/.auth/<一级模块>/domain-state.json` — 共享登录态（UI 与接口共用）
- `Tests/shared/auth/auth-state.ts` — 登录态路径解析
- `Tests/shared/auth/api-auth.ts` — `createAuthedApiContext()` / `getTokenFromAuthState()`
- `Tests/shared/capture-auth.ts` — 手动导出登录态（人工过验证码）

## 3. 前置：安装共享依赖

`@playwright/test` 与 `tsx` 的单一来源安装在 `Tests/` 级：

```powershell
cd d:\AIauto\Tests
npm install
```

## 4. 登录态准备（一次）

接口用例依赖 `Tests/shared/.auth/<一级模块>/domain-state.json`：

- 自动：先跑一次 UI（`cd Tests/ui && npm test ...`），`global-setup.ts` 会自动生成登录态；
- 手动（验证码自动破解不稳时）：

```powershell
Start-Process msedge -ArgumentList "--remote-debugging-port=9222"
# 浏览器里手动登录（人工拖验证码），停在业务页
cd d:\AIauto\Tests\api-automation
$env:TEST_DOMAIN_PATH = 'CONFIG-配置中心'
npm run capture:auth
```

## 5. 编写接口用例

接口用例直接复用配置里的 `request` fixture（已自动带登录 cookie）：

```ts
import { test, expect } from "@playwright/test";

test("IT-xxx: 已登录态可访问业务接口", async ({ request }) => {
  const res = await request.get("/api/your/path");
  expect(res.status()).toBe(200);
});
```

若后端用 localStorage 里的 token 鉴权（非 cookie），改用编程式上下文：

```ts
import { createAuthedApiContext, getTokenFromAuthState } from "../../../../shared/auth/api-auth";

const token = getTokenFromAuthState("token");
const request = await createAuthedApiContext({
  extraHTTPHeaders: { Authorization: `Bearer ${token}` },
});
```

## 6. 运行

```powershell
cd d:\AIauto\Tests\api-automation
$env:TEST_DOMAIN_PATH = 'CONFIG-配置中心'
npm run api
```

JUnit 报告落到 `test-reports/api/junit.xml`，供 CI 读取。

## 7. 相关文档

- UI 框架与登录态说明：`Tests/ui/README.md`
- 总体方案：`docs/ai-playwright-automation-plan-full.md`
