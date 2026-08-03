# Helpers / Fixture API 速查

> 本文件从 `playwright-test-implementation` SKILL 拆出，供 agent 实现脚本时按需加载。
> helpers 与 `base.fixture.ts` 的**标准实现固化在 `ui-automation-bootstrap` skill 的 `templates/helpers/` 与 `templates/fixtures/`**（详见 bootstrap §5.1 复制清单）。本文件仅做用法速查，不重复实现源码。
> 已落地的项目副本路径：`Tests/ui-automation/helpers/*.ts`、`Tests/ui-automation/fixtures/base.fixture.ts`。

## 1. element-plus.ts — Element Plus 组件交互

> 沉淀交互经验修复（el-select placeholder 拦截 / el-cascader 残留菜单 / el-date-range-picker 日历定位 / MessageBox 时序）。**写表单 / 弹窗用例优先复用，不要重新造轮子。**

### 1.1 el-select

| 函数                    | 签名                               | 用途                                                           |
| ----------------------- | ---------------------------------- | -------------------------------------------------------------- |
| `selectElOptionByText`  | `(page, selectTestId, optionText)` | 按文案选 el-select 选项；force click 容器绕过 placeholder 拦截 |
| `selectElOptionByIndex` | `(page, selectTestId, index=0)`    | 按索引选（第一个非禁用项）                                     |
| `clearElSelect`         | `(page, selectTestId)`             | 清除已选值（点标签 x），无标签时不报错                         |

```ts
import { selectElOptionByText } from "../../helpers/element-plus";
await selectElOptionByText(page, "org-select", "检测机构A");
```

### 1.2 el-cascader（含 FORM-004 浮层关闭修复）

| 函数                | 签名                                                | 用途                                                |
| ------------------- | --------------------------------------------------- | --------------------------------------------------- |
| `pickCascaderNode`  | `(page, cascaderLocator, level1Idx=0, level2Idx=0)` | 单选节点；选完自动 `dismissCascaderPopper` 关闭浮层 |
| `pickCascaderMulti` | `(page, cascaderLocator, picks[])`                  | 多选节点；选完自动关闭浮层                          |
| 返回                | `CascaderPickResult { tagCount, tagTexts }`         | 已选标签数与文案                                    |

```ts
import { pickCascaderMulti } from "../../helpers/element-plus";
const cascader = page.locator("[data-testid=project-cascader]");
const { tagCount } = await pickCascaderMulti(page, cascader, [
  { level1: 0, level2: 0 },
  { level1: 0, level2: 1 },
]);
expect(tagCount).toBe(2);
```

> **FORM-004 修复点**：`checkStrictly` / 多选模式下浮层保持展开会拦截确定按钮点击。`dismissCascaderPopper` 向 body 派发 `pointerdown/mousedown` 触发 `onClickOutside` 关闭浮层，无副作用（不误触按钮、不关对话框）。比按 Escape 安全（Escape 可能触发 dialog `closeOnPressEscape`）。

### 1.3 el-date-range-picker

| 函数            | 签名                        | 用途                                                                           |
| --------------- | --------------------------- | ------------------------------------------------------------------------------ |
| `pickDateRange` | `(page, dateEditorLocator)` | 点左面板 `.is-left` + 右面板 `.is-right` 第一个可用日期，返回 `{ start, end }` |

```ts
import { pickDateRange } from "../../helpers/element-plus";
const { start, end } = await pickDateRange(
  page,
  page.locator("[data-testid=contract-period]"),
);
```

### 1.4 MessageBox（含 LIST-009/010 时序修复）

| 函数                  | 签名                        | 用途                                                                                  |
| --------------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| `waitForMessageBox`   | `(page, timeoutMs=5000)`    | 等待 MessageBox 可见（解决异步渲染时序）；返回 bool                                   |
| `confirmMessageBox`   | `(page, buttonText='确定')` | 确认：先 waitFor 可见再 locator click，限定 `.el-messagebox` 内避免误点对话框同名按钮 |
| `cancelMessageBox`    | `(page)`                    | 取消（调 `confirmMessageBox(page,'取消')`）                                           |
| `isMessageBoxVisible` | `(page)`                    | 即时可见性检查，用 `.first()` 避免残留 DOM 多匹配                                     |

```ts
import {
  confirmMessageBox,
  waitForMessageBox,
} from "../../helpers/element-plus";
await billingPage.clickToggle(contractRow); // 点启停
expect(await waitForMessageBox(page)).toBeTruthy(); // 等弹窗
await confirmMessageBox(page); // 确认
```

> **LIST-009/010 修复点**：①点击启停后 MessageBox 异步渲染，即时 `isVisible()` 可能在渲染前返回 false → 用 `waitFor`；②残留 MessageBox DOM 导致 strict mode 多匹配 → 用 `.first()`；③原 `evaluate` 原生 click 在事件路径异常时不触发 Vue handler → 改用 Playwright locator click。**禁止用 `getComputedStyle` 判断可见性**。

## 2. visibility.ts — 可见性判断与残留清理

| 函数 / 常量              | 签名                       | 用途                                                                        |
| ------------------------ | -------------------------- | --------------------------------------------------------------------------- |
| `isVisible`              | `(locator)`                | 安全可见性判断（封装 `isVisible`，统一禁止 `getComputedStyle`）             |
| `removeResidualOverlays` | `(page)`                   | 移除残留遮罩层（点取消按钮 + 兜底移除可见 overlay）                         |
| `safeGoto`               | `(page, url)`              | 安全跳转：goto + 等待 + 清残留遮罩 + 等列表首行可见；每个 spec 开头推荐调用 |
| `EXPAND_COLUMN_OFFSET`   | `1`                        | 展开列偏移常量                                                              |
| `cellIndex`              | `(logicalIndex)`           | 表头逻辑列索引 → 实际 td 索引（加展开列偏移）                               |
| `LIST_COLUMN_INDEX`      | 对象                       | 列表逻辑列名 → 逻辑索引映射                                                 |
| `getCellText`            | `(page, rowIndex, column)` | 取指定行指定列文本（自动修正偏移）                                          |

```ts
import { safeGoto, getCellText } from "../../helpers/visibility";
import { LIST_COLUMN_INDEX } from "../../helpers/visibility";

await safeGoto(page, `${process.env.TEST_BASE_URL}/billing/list`);
const status = await getCellText(page, 0, "status"); // 自动加展开列偏移
```

> **§5.2 修复点**：el-table 带 expand-column 时，td 实际数 = 表头数 + 1（idx 0=序号, idx 1=展开列空, idx 2 起=实际数据列）。`cellIndex` 统一修正，避免列错位断言。

## 3. network.ts — 网络请求工具（API 等待 / mock / 计数）

> 用于成功类组合断言（§8.3）、ET 用例 API mock、断言「未调用接口」。

| 函数                   | 签名                                      | 用途                                              |
| ---------------------- | ----------------------------------------- | ------------------------------------------------- |
| `waitForApi`           | `(page, {url, method?}, timeoutMs=15000)` | 等待匹配响应；url 支持子串或正则                  |
| `mockApiFailure`       | `(page, urlPattern, status=500, body?)`   | mock 失败响应                                     |
| `mockApiSuccess`       | `(page, urlPattern, body)`                | mock 成功响应                                     |
| `mockApiTimeout`       | `(page, urlPattern, delayMs=30000)`       | mock 超时（延迟 abort）                           |
| `mockApiMalformedJson` | `(page, urlPattern, rawBody)`             | mock 非法 JSON（ET-DETAIL-009）                   |
| `createCallCounter`    | `(page, urlPattern)` → `CallCounter`      | 调用计数器；断言「未调用接口」（ET-FORM-003/004） |

```ts
import { waitForApi } from "../../helpers/network";
import { createCallCounter } from "../../helpers/network";

// 成功类组合断言
const [resp] = await Promise.all([
  waitForApi(page, { url: "/base/quota/contract/edit", method: "POST" }),
  billingPage.submitForm(),
]);
expect((await resp.json()).retCode).toBe(0);

// 断言未调用新增接口（必填校验用例）
const counter = await createCallCounter(page, "/base/quota/contract/add");
await billingPage.submitForm();
expect(counter.count).toBe(0);
await counter.cleanup();
```

## 4. errors.ts — 错误消息收集（toast + 行内双查）

> §1.1：配额行校验错在 `.el-message__content`（toast），必填校验错在 `.el-form-item__error`（行内），**两种都必须查否则遗漏**。

| 函数                  | 签名                                                     | 用途                             |
| --------------------- | -------------------------------------------------------- | -------------------------------- |
| `collectErrors`       | `(page)` → `CollectedErrors { toasts, formErrors, all }` | 收集页面所有错误（toast + 行内） |
| `expectErrorContains` | `(page, text)` → bool                                    | 错误含指定文本（toContain 语义） |
| `expectErrorExact`    | `(page, text)` → bool                                    | 错误精确匹配（完整文案，§8.1）   |
| `expectNoErrors`      | `(page)` → bool                                          | 无任何错误                       |
| `waitForError`        | `(page, text, timeoutMs=3000)` → bool                    | 等待错误出现                     |

```ts
import { expectErrorExact } from "../../helpers/errors";
// FT-BILLCFG-FORM-003：完整文案精确匹配（不用关键词包含）
expect(
  await expectErrorExact(page, "合同编号仅支持字母、数字、-或_"),
).toBeTruthy();
```

## 5. base.fixture.ts — 通用登录态夹具

> 提供基础 `authedPage` 夹具，所有模块测试依赖。一级模块由 `run.mjs --domain` 注入 `TEST_DOMAIN_PATH`，独立运行回退 `.env` 的 `DEFAULT_DOMAIN`，**两者都缺则抛错（禁止硬编码模块名）**。

```ts
// 模块 fixture 继承基础夹具
import { test } from "../../fixtures/base.fixture";
import { BillingPage } from "../pages/billing.page";

export const test = base.extend<{ billingPage: BillingPage }>({
  billingPage: async ({ authedPage }, use) => {
    await use(new BillingPage(authedPage));
  },
});
// spec 里：test('FT-...', async ({ billingPage }) => { ... });
```

- `authedPage` 消费 `Tests/shared/.auth/<一级模块>/domain-state.json` 创建已登录上下文（viewport 1440×900，locale zh-CN）。
- 用完自动 `ctx.close()`，每条用例独立上下文，互不污染。
- **不要在 `beforeEach` 重新登录**；非鉴权用例直接用 `authedPage`。

## 6. 复用纪律

- **优先复用**：表单 / 弹窗 / 列表 / 网络 / 错误场景，先查本速查有无现成函数，避免重写。
- **不修改 helpers 源码**：如需增强，先在模块 page object 包一层；确属通用增强，回流到 bootstrap `templates/helpers/` 并同步本项目副本（记录在 bootstrap §5.2 版本对齐）。
- **新增 `data-testid` 必须回写**模块 `data-testid.snapshot.json`，不要只在 page object 里硬编码（§12 自检）。
