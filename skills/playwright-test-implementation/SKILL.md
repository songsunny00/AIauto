---
name: playwright-test-implementation
description: 以需求、测试用例与详细设计文档为主，必要时结合前端代码和失败工件核对实现，生成或维护真实可执行的 Playwright 脚本。
allowed-tools: Read Glob Grep Edit Write Bash
---

# playwright-test-implementation

## 1. 目标

围绕目标模块输出或维护一套**真实可执行、可回归、可维护**的 Playwright 脚本，覆盖 `Tests/ui/...` 下的 `specs/pages/fixtures/data` 实现，并支持：

- 新模块首轮脚本建设
- 后续版本迭代下的脚本修改
- 基于 `junit.xml` / `error-context.md` / `trace.zip` 的失败修复

## 2. 适用输入

- `03-测试用例文档.md`
- `01-需求文档.md`
- `02-详细设计文档.md`（如有，建议提供，可用于补充字段、交互、接口与校验口径）
- `01c-原型文档.md`（如有）
- 相关前端页面代码 / 路由信息（必要时用于核对真实实现、定位点与交互逻辑）
- 目标模块现有 `Tests/ui/...` 自动化目录（如已存在）
- 失败工件：`junit.xml` / screenshot / `error-context.md` / `trace.zip`（如是修失败场景）

## 3. 前置检查

开始写或改脚本前，先确认：

1. 当前任务属于哪一类：**新模块起步 / 版本迭代 / 失败修复**。
2. 是否已有可复用目录，以及共享层 `Tests/ui/playwright.config.ts`、`Tests/ui/global-setup.ts`、`Tests/ui/.auth/` 与模块级 `fixtures`。
3. 是否已经查看测试页面与系统实际数据；**不要凭空编造机构名、项目名、产品名、状态值、合同编号**。
4. 需求/详设/后端文案若已明确，文案断言是否应按**完整文案精确匹配**，而不是关键词包含。
5. 前置数据或权限是否真的不存在；`test.skip(reason)` 应基于**实际页面数据或明确前置条件检查**，不要仅凭脚本作者预设假设直接跳过。
6. 若是写操作场景，是否已考虑**数据隔离、回收或清理**，避免污染后续用例。
7. 当前改动是否只影响目标 `FT-*`，避免顺手重构无关脚本。

## 4. 工作模式

| 场景 | 重点动作 | 期望输出 |
| --- | --- | --- |
| 新模块起步 | 从 `03` 拆 spec、补 page/fixture/data/config | 首轮可执行脚本 + 目录内说明 |
| 版本迭代 | 对照需求增量修改既有 spec/page/data | 最小改动的脚本增量 |
| 失败修复 | 先读失败工件，再定位脚本/数据/后端问题 | 可复现、可解释、可回归的修复 |

## 5. 实现步骤

1. 从 `03` 中找出适合自动化的 `FT-*`，按功能域拆到 `ATS-*.spec.ts`。
2. 先补页面对象，再写测试步骤；选择器和交互细节收敛到 `pages/*.page.ts`。
3. 测试数据统一收敛到 `data/*.data.ts`，避免在 spec 内散落字面量。
4. 使用 `Tests/ui/global-setup.ts` + `storageState` 复用登录态，避免每条用例重复登录。
5. 断言优先验证**真实业务结果**，不要只验证 toast 是否出现。
6. 改动后先回归最小受影响 spec，再决定是否扩大回归范围。

## 6. 页面对象与夹具约定

### 6.1 选择器优先级

`data-testid` > `getByRole/name` > 稳定属性 > CSS/text 兜底

### 6.2 页面对象职责

- page object 负责：选择器、页面操作、通用等待、通用断言辅助。
- spec 负责：业务场景编排、测试数据选择、结果断言。
- 不要把大段业务判断塞进 page object。

### 6.3 夹具约定

- 默认使用已登录 `authedPage`。
- 认证态统一由 `Tests/ui/global-setup.ts` 生成，并通过 `storageState` 复用到 `Tests/ui/.auth/`。
- 非鉴权本身的用例，不要在 `beforeEach` 里重新走登录流程。

## 7. 数据与环境约定

- 环境地址、账号、密码统一走 `Tests/ui/.env` / `Tests/ui/.env.example`。
- **禁止**在脚本中硬编码 `baseURL`、用户名、密码、验证码处理参数。
- 测试数据要基于系统已有数据编写；需要真实新增数据时，要明确其对后续回归的影响。
- 修改型场景必须确保形成**真实变更**，避免“写回原值”导致伪失败。
- `test.skip(reason)` 的触发应基于**实际数据检查结果**，而不是静态假设某类数据不存在。
- 写操作用例默认要考虑**数据清理、专用测试数据或唯一标识隔离**；不要让新增/编辑结果污染后续用例。

示例：

```ts
const currentStorageDays = await billingPage.storageDaysInput.inputValue();
const newStorageDays = currentStorageDays === "90" ? "120" : "90";
await billingPage.storageDaysInput.fill(newStorageDays);
await billingPage.storageDaysInput.press("Tab");
```

动态 skip 示例：

```ts
if (!(await billingPage.hasConsumedContract())) {
  test.skip(true, "缺少 hasConsumed=true 合同数据");
}
```

## 8. 断言与等待规范

- 不把 `networkidle` 当主要等待手段；优先使用：
  - 元素可见 / 可编辑 / 可点击
  - loading mask 消失
  - `waitForResponse(...)`
  - `expect.poll(...)`

### 8.1 文案断言

- 当需求、详设或后端文案已明确时，优先使用**完整文案精确匹配**。
- 不要只断言“字母”“数字”“成功”“失败”这类关键词，否则容易漏检文案差异。
- 只有在文案本身包含动态值、前后缀或时间戳时，才使用 `toContainText` 或正则。

推荐：

```ts
await expect(errorMessage).toHaveText("请输入字母、数字、-或_");
```

谨慎使用：

```ts
await expect(errorMessage).toContainText("字母");
```

### 8.2 行为断言

- 不要把“组件存在”当成“行为正确”。
- 分页场景要验证**实际翻页行为**，不要只断言分页器存在。
- 缓存复用场景要验证**请求次数或无重复请求**，不要只断言二次展开后内容还在。
- 汇总/统计场景要验证**数值口径**，不要只断言汇总区字段存在。
- 写操作场景要验证**提交结果 + 页面反馈 + 数据变化**，不要只看 toast。

### 8.3 成功类场景推荐组合

成功类场景至少结合以下之一：

- 关键接口响应成功
- 返回体 `retCode === 0`
- 弹窗关闭 / 抽屉关闭
- 列表内容、状态、计数或明细实际变化

推荐模式：

```ts
const [saveResponse] = await Promise.all([
  page.waitForResponse(
    (resp) =>
      resp.url().includes("/base/quota/contract/edit") &&
      resp.request().method() === "POST",
    { timeout: 10_000 },
  ),
  billingPage.submitForm(),
]);

expect(saveResponse.ok()).toBeTruthy();
const saveBody = await saveResponse.json();
expect(saveBody.retCode).toBe(0);
await billingPage.expectToast("保存成功");
```

### 8.4 表单稳定性

- 日期、级联、下拉等复杂控件填写后，要补**回显值校验**或后续可提交态校验，避免前置字段未真正写入。
- 对依赖基础信息的校验用例，先确认基础字段已成功填写，再触发目标校验分支。
- 如果按钮本身应置灰，优先断言 disabled，不要直接 `force: true` 掩盖问题。

## 9. 版本迭代维护规则

- 增量需求优先修改现有 `spec/page/data`，不要为同一页面平行再造一套脚本。
- `FT-*` / `ATS-*` 编号主线必须保留，新增用例按同模块编号延展。
- 如果前端 DOM 变化导致大量选择器失效，先统一修 page object，再回归 spec。
- 如果需求文档口径变更，先同步测试数据与断言，再决定是否调整页面对象方法。
- 只改与本次需求直接相关的脚本，不顺带整理无关文件。

## 10. 失败修复与回归策略

排查顺序固定为：

1. 看 `junit.xml`：确认失败用例、耗时、是否批量失效。
2. 看 screenshot / `error-context.md`：确认失败瞬间的 DOM 与提示信息。
3. 看 `trace.zip`：确认是否真的点到了按钮、是否打开了弹窗、是否发出了请求。
4. 再判断根因属于哪类：
   - 选择器不稳
   - 页面未就绪
   - 未形成真实变更
   - 前置数据不满足
   - 断言过宽导致伪通过或漏检
   - 请求已发出但后端业务拒绝

必须区分：

- **脚本没点到按钮**
- **按钮点到了，但请求没发出**
- **请求发出了，但后端返回业务错误码**
- **请求成功了，但前端提示或页面反馈未按预期出现**

如果工件已表明返回业务错误码（如 `retCode != 0`），不要继续把问题默认归因为“定位器没找到”或“按钮没点击”。

## 11. 禁止事项 / 约束

- 禁止每条用例单独登录。
- 禁止硬编码环境地址、账号、密码。
- 禁止优先使用脆弱 CSS class / 纯文本定位，明明有 `data-testid` 还不用。
- 禁止把 `networkidle` 当主要等待手段。
- 禁止把 toast 作为唯一成功依据。
- 禁止在需求文案已明确时，仅用关键词包含断言替代完整文案断言。
- 禁止用“组件存在”“字段存在”冒充“行为已验证”。
- 禁止在未确认数据条件时强行让用例失败，应该显式 `test.skip(reason)`。
- 禁止通过静态假设直接 skip，本应先检查实际页面数据。
- 禁止通过 `force: true` 掩盖本应 disabled / hidden / 不可提交的问题。
- 禁止脱离页面实际数据凭空编写机构、项目、状态和合同数据。
- 禁止让写操作残留数据无控制地污染后续用例。
- 禁止为了修一个用例顺手重构整个自动化目录。

## 12. 完成前自检

提交前至少核对：

- 是否沿用了现有目录与命名模式。
- 是否使用了 `globalSetup + storageState`。
- 是否把测试数据收敛到 `data/*.data.ts`。
- 是否优先用了 `data-testid` 或稳定语义定位。
- 文案类断言是否在需求已明确时采用了完整匹配，而不是宽松关键词匹配。
- 行为类断言是否验证了真实行为，而不是只验证组件存在。
- 是否对保存/启停/状态变化场景验证了真实结果，而不只是 toast。
- `test.skip(reason)` 是否基于实际数据检查，而不是静态假设。
- 写操作场景是否考虑了数据清理、隔离或唯一标识，避免污染后续用例。
- 是否先回归了最小影响范围，并保留失败工件。
- 是否没有引入与当前需求无关的重构。
