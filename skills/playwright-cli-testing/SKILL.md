---
name: playwright-cli-testing
description: 基于 official playwright-cli skill 的项目增强层：规定登录态策略、测试流程、数据生命周期、Element Plus 交互模板、PowerShell 转义陷阱、报告输出与自检清单。不重复官方命令文档，仅补充项目特定约束。
allowed-tools: Read Glob Grep Edit Write RunCommand
---

# playwright-cli-testing（项目增强层）

## 1. 定位

本 skill 是 [official playwright-cli skill](file:///d:/AIauto/.agents/skills/playwright-cli/SKILL.md) 的**项目增强层**，不重复官方命令文档，仅补充：

- 登录态保持策略（persistent profile 主选，storageState 备选，CDP 仅特殊情况）
- 测试执行流程（前置探测 → 用例执行 → 失败捕获 → 数据清理 → 报告输出）
- Element Plus 组件交互模板（适配 persistent profile 模式，`click()` 直接触发 Vue 事件）
- PowerShell 转义陷阱与规避
- 测试数据生命周期（≤10 条新增、≤5 条保留、分级清理）
- 文案精确比对规范（避免 PowerShell 中文编码损坏）
- 测试报告输出格式与自检清单

**官方 skill 命令参考**：`snapshot`/`click`/`fill`/`eval`/`run-code`/`screenshot`/`console`/`requests`/`state-save`/`state-load`/`cookie-*`/`localstorage-*` 等，详见 [d:\AIauto\.agents\skills\playwright-cli\SKILL.md](file:///d:/AIauto/.agents/skills/playwright-cli/SKILL.md)。

## 2. 适用输入

- `03-测试用例文档.md`（必需，FT-\* 功能用例来源）
- `01-需求文档.md`（推荐，校验预期文案与行为口径）
- 页面 URL / 路由信息
- 测试账号（或已有 `.auth/` 认证态文件）
- 用户指定的截图输出路径与报告输出路径

## 3. 前置检查

1. **`playwright-cli` 是否已安装**：执行 `playwright-cli --version`，能正常输出版本号则**跳过安装步骤**，禁止重复执行 `install` / `install-browser`；仅在命令不存在或版本过旧时才执行 `npm install -g @playwright/cli@latest`。

2. **官方 skill 版本一致性检查**（消除版本警告，确保功能模块可用）：
   - 执行 `playwright-cli --version` 时观察输出是否包含警告框：
     ```
     ╔═════════════════════════════════════════════════════════════╗
     ║ The playwright-cli skill at '.agents\skills\playwright-cli' ║
     ║ does not match the tool version.                            ║
     ╚═════════════════════════════════════════════════════════════╝
     ```
   - **若出现警告** → 执行 `playwright-cli install --skills=agents` 更新官方 skill 至匹配版本（命令会输出 `✅ Skills installed to .agents\skills\playwright-cli`，exit code 可能非 0 但实际成功）
   - **若输出干净** → 跳过更新，直接进入下一步

3. **persistent profile 检查**：
   - 确认 profile 根目录存在：`D:\AIauto\Tests\.auth\playwright-profile`
   - 若不存在则首次启动时会自动创建（首次需手动登录一次）
   - 该 profile 长期复用，登录态保持，无需每次重登

4. 测试用例文档中哪些是 `FT-*` 功能用例，统计总数与优先级分布。

5. 用户是否指定了截图输出路径；默认输出到报告路径下的 `testing-imgs/` 文件夹。

6. 用户是否说明"不需要截图"；默认每个用例都截图（成功和失败均截）。

## 4. 测试流程

### 4.1 环境准备与登录态保持

**方案 A（推荐）：persistent profile**——playwright-cli 原生管理浏览器，登录态长期保持。

```powershell
# 步骤 1：启动 persistent 浏览器（首次需手动登录，后续自动复用登录态）
playwright-cli open --persistent --browser=msedge http://ack.omicsone.com/login

# 或指定 profile 目录（推荐，路径固定）
playwright-cli open --profile=D:\AIauto\Tests\.auth\playwright-profile --browser=msedge http://ack.omicsone.com/login

# 步骤 2：首次启动时手动登录（playwright-cli 控制浏览器，但允许手动操作）
# 登录成功后导航到目标页面
playwright-cli goto http://ack.omicsone.com/config/billingConfig

# 步骤 3：验证登录态
playwright-cli eval "() => ({ url: location.href, hasToken: !!document.cookie.match(/token|session/i) })"
```

**方案 A 优势**：

| 维度         | persistent profile       | CDP 接管（已废弃主选）        |
| ------------ | ------------------------ | ----------------------------- |
| 命令执行速度 | ~0.5-2s/命令             | ~5-10s/命令（sandbox 包装慢） |
| Vue 事件触发 | `click()` 直接触发       | 必须 `dispatchEvent("click")` |
| 中间 JS 脚本 | 不需要（用简短命令）     | 大量需要（PowerShell 转义）   |
| 用户手动浏览 | 不支持（cli 控制浏览器） | 支持（用户可同时操作）        |
| 登录态保持   | 长期复用 profile         | 长期复用 profile              |

**方案 B（备选）：storageState 复用**——CI 环境或 profile 损坏时使用。

```powershell
# 打开浏览器（非 persistent）
playwright-cli open --browser=msedge

# 加载已保存认证态
playwright-cli state-load .auth/billing-state.json

# 如无认证态，执行登录流程，登录后保存
playwright-cli goto http://ack.omicsone.com/login
# 手动登录或脚本登录...
playwright-cli state-save .auth/billing-state.json

# 导航到目标页面
playwright-cli goto http://ack.omicsone.com/config/billingConfig
```

**方案 C（特殊情况）：CDP 接管已登录浏览器**——仅当用户已在浏览器中登录且需要保留会话时使用。详见附录 §9。

**约束**：

- **主选方案 A**，仅在 profile 损坏或 CI 环境时回退到方案 B。
- 禁止硬编码环境地址与账号，从 `.env` 或用户输入获取。
- 禁止每个用例重新登录，全程复用同一浏览器会话与认证态。
- persistent profile 路径固定为 `D:\AIauto\Tests\.auth\playwright-profile`，禁止散落多处。
- token 过期时**禁止自动重登**，提示用户手动登录后继续。

### 4.2 前置数据探测

**测试前必须先扫描页面实际数据**，用于判断用例前置条件是否满足，减少不必要的 skip。

**探测分两部分**：列表数据 + 表单字段完整性。

#### 4.2.1 列表数据探测

使用 `run-code --filename` 一次性采集页面关键数据（避免 PowerShell 中文编码问题，用 Write 工具写 JS 文件）：

```javascript
// probe-list.js
async (page) => {
  await page.waitForTimeout(1500);
  const totalRows = await page.locator(".el-table__row").count();
  const tags = await page.locator(".el-tag").all();
  const statusDist = {};
  for (const tag of tags) {
    const text = (await tag.textContent()).trim();
    statusDist[text] = (statusDist[text] || 0) + 1;
  }
  const headers = (
    await page.locator(".el-table__header th .cell").allTextContents()
  )
    .map((h) => h.trim())
    .filter((h) => h);
  const firstRowContract = await page
    .locator(".el-table__row")
    .first()
    .locator("td")
    .nth(7)
    .textContent()
    .catch(() => "");
  return JSON.stringify({
    totalRows,
    statusDistribution: statusDist,
    headers,
    firstRowContractNo: firstRowContract.trim(),
  });
};
```

#### 4.2.2 表单字段完整性探测（写操作用例必备）

**写操作用例执行前必须探测表单所有必填字段**，包括无 `data-testid` 的字段，避免漏填导致静默失败：

```javascript
// probe-form-fields.js
async (page) => {
  // 打开新增弹窗（persistent profile 模式 click() 直接触发 Vue @click）
  await page.locator("[data-testid=billing-add-tenant-btn]").click();
  await page.waitForTimeout(1500);

  const formInfo = await page.evaluate(() => {
    const dialog =
      document.querySelector("[data-testid=billing-edit-dialog]") ||
      document.querySelector(".el-dialog");
    if (!dialog) return { found: false };

    const formItems = Array.from(dialog.querySelectorAll(".el-form-item")).map(
      (fi) => ({
        label:
          fi.querySelector(".el-form-item__label")?.textContent?.trim() || "",
        required: fi.classList.contains("is-required"),
        testid:
          fi.querySelector("[data-testid]")?.getAttribute("data-testid") || "",
        inputType:
          fi.querySelector("input")?.type ||
          (fi.querySelector(".el-select")
            ? "select"
            : fi.querySelector(".el-cascader")
              ? "cascader"
              : fi.querySelector(".el-date-editor")
                ? "date-picker"
                : "unknown"),
        disabled:
          !!fi.querySelector("input:disabled") ||
          fi.classList.contains("is-disabled"),
      }),
    );

    const sectionTitles = Array.from(
      dialog.querySelectorAll(".section-title"),
    ).map((t) => t.textContent.trim());

    // 配额行字段（可能不在 form-item 内，而是在自定义布局中）
    const allInputs = Array.from(dialog.querySelectorAll("input")).map(
      (inp) => ({
        type: inp.type,
        placeholder: inp.placeholder,
        testid: inp.getAttribute("data-testid") || "",
        disabled: inp.disabled,
        value: inp.value,
      }),
    );

    return { found: true, sectionTitles, formItems, allInputs };
  });

  // 关闭弹窗
  await page
    .locator("[data-testid=billing-cancel-btn]")
    .click()
    .catch(() => {});
  return JSON.stringify(formInfo);
};
```

**判断规则**：

- 前置条件满足 → 正常执行用例
- 前置条件不满足 → 标记"条件不满足"，记录缺失的数据类型
- 部分满足 → 执行可验证部分，标记"部分通过"，记录未验证部分
- **写操作用例**：若探测到无 `data-testid` 的必填字段，先记录其定位方式，再执行用例

### 4.3 测试执行策略

**执行顺序**（降低数据污染风险）：

1. **只读用例优先**：列表加载、查询筛选、展开明细、状态查看、明细抽屉
2. **状态切换用例次之**：禁用/启用（会改变数据状态，但可逆）
3. **新增用例**：创建测试数据，为后续编辑/删除用例提供数据源
4. **编辑用例**：复用新增的数据或已有可编辑数据
5. **删除用例**：只删除本次测试新增的数据

**批量验证**：对同类操作（如检查多行状态、展开多行明细）使用 `run-code --filename` 在单次调用中循环执行，减少跨进程通信开销。

**命令模式选择**（persistent profile 下）：

| 场景             | 命令模式                                 | 理由                     |
| ---------------- | ---------------------------------------- | ------------------------ |
| 探索未知页面     | `snapshot` + ref                         | 官方推荐，可视化 YAML    |
| 单元素点击/填写  | `click "getByTestId('xxx')"` / `fill e5` | 语义化定位器，无需写 JS  |
| 批量多步骤操作   | `run-code --filename`                    | 单次调用执行多步骤       |
| 含中文/正则的 JS | `run-code --filename`                    | 规避 PowerShell 转义陷阱 |
| 截图             | `screenshot --filename=绝对路径`         | 一行命令                 |
| 控制台/网络检查  | `console` / `requests`                   | 官方命令直接输出         |

### 4.4 写操作数据管理

**新增数据约束**：

- 单次测试最多新增 **10 条**数据。
- 新增前先检查是否已有可复用数据（避免重复创建）。
- 新增数据的唯一标识（ID/编号）必须记录到测试数据清单。

**数据复用规则**：

- 新增的数据优先用于后续编辑用例（避免编辑原有数据）。
- 新增的数据可用于删除用例（删除后不影响原有数据）。
- 新增的数据可用于状态切换用例（禁用/启用后可恢复）。

**删除数据约束**：

- **只能删除本次测试新增的数据**，禁止删除原有数据。
- 删除前确认目标数据的创建来源（检查测试数据清单）。
- 如无法区分新旧数据，不执行删除，标记"条件不满足"。

**测试数据清单格式**（测试过程中实时维护）：

```markdown
| 序号 | 数据类型 | 唯一标识    | 创建用例 | 创建时间 | 复用情况       | 清理状态 | 保留原因 |
| ---- | -------- | ----------- | -------- | -------- | -------------- | -------- | -------- |
| 1    | 合同     | HT-TEST-001 | FORM-004 | 14:30    | 编辑(FORM-008) | 已删除   | —        |
| 2    | 合同     | HT-TEST-002 | FORM-004 | 14:32    | 未复用         | 待清理   | —        |
```

**测试结束清理**：

- 测试完成后，逐条清理本次新增的数据（删除或恢复初始状态）。
- 清理结果记录到测试数据清单的"清理状态"列。
- 如清理失败，在报告中标注残留数据预警。

### 4.5 截图规范

**默认规则**：

- 每个用例执行完毕后截图，**无论成功还是失败**。
- 除非用户明确说明"不需要截图"，否则必须截图。

**截图存储**：

- 输出到报告路径下的 `testing-imgs/` 文件夹。
- 截图文件名必须用**绝对路径**（`--filename=D:\...\testing-imgs\XXX.png`），避免相对路径保存到 CWD。

**截图命名规范**：

```
{用例编号}-{简短描述}-{结果标识}.png
```

- 结果标识：`SUCCESS` 或 `FAIL`
- 示例：`FT-BILLCFG-LIST-001-default-load-SUCCESS.png`
- 示例：`FT-BILLCFG-FORM-003-invalid-char-FAIL.png`

**关键里程碑额外截图**：

- 默认加载状态
- 查询结果
- 展开行明细
- 弹窗/抽屉打开
- 校验错误提示
- 状态切换结果
- 新增/编辑成功

### 4.6 文案精确比对规范

**校验类用例必须逐字比对**实际提示文案与预期文案：

1. 记录测试用例文档中的**预期提示文案**（完整原文）。
2. 使用 `run-code --filename` 获取页面实际提示文案（完整原文）——**比对在 JS 文件内完成**，不依赖 PowerShell 输出比对（中文会被 PowerShell 编码损坏）。
3. 逐字比对，任何差异均判定为**不通过**。

```javascript
// 文案比对必须在 JS 文件内完成（浏览器上下文编码正确）
async (page) => {
  const input = await page
    .locator("[data-testid=billing-contract-no-input]")
    .elementHandle();
  const formItem = await input.evaluateHandle((el) =>
    el.closest(".el-form-item"),
  );
  const actualMsg = await formItem.evaluate((fi) => {
    const errEl = fi.querySelector(".el-form-item__error");
    return errEl ? errEl.textContent.trim() : "";
  });
  const expectedMsg = "请输入字母、数字、-或_";
  return JSON.stringify({
    expected: expectedMsg,
    actual: actualMsg,
    match: actualMsg === expectedMsg,
  });
};
```

**比对结果记录格式**：

```markdown
| 项       | 内容                                       |
| -------- | ------------------------------------------ |
| 预期文案 | `请输入字母、数字、-或_`                   |
| 实际文案 | `合同编号仅支持字母、数字、连字符和下划线` |
| 是否一致 | 否 → ❌ 不通过                             |
```

**禁止**：

- 禁止只用关键词包含判断（如只检查"字母""数字"是否出现）。
- 禁止在文案不一致时仍判定为通过。
- 禁止忽略文案差异，仅因为"功能已生效"就判通过。

### 4.7 失败现场捕获规范

**用例失败时必须按以下顺序捕获**（网络请求优先，快速定位根因）：

#### 4.7.1 网络请求监控（写操作失败首选诊断）

写操作（新增/编辑/删除）失败时，**第一步检查 API 请求是否发出**，区分"前端校验阻止"与"后端拒绝"：

```javascript
// 在提交前挂载监控，提交后检查
async (page) => {
  const captured = [];
  const handler = (req) => {
    if (
      req.url().includes("contract") &&
      !req.url().includes("contract/page")
    ) {
      captured.push({
        url: req.url(),
        method: req.method(),
        body: req.postData(),
      });
    }
  };
  page.on("request", handler);

  const beforeRows = await page.locator(".el-table__row").count();
  await page.locator("[data-testid=billing-confirm-btn]").click();
  await page.waitForTimeout(2000);

  const afterRows = await page.locator(".el-table__row").count();
  page.off("request", handler);

  // 读取消息提示
  const messages = await page.evaluate(() => {
    const msgs = document.querySelectorAll(".el-message__content");
    return Array.from(msgs).map((m) => m.textContent.trim());
  });

  return JSON.stringify({
    beforeRows,
    afterRows,
    capturedRequests: captured,
    messages: messages,
    requestSent: captured.length > 0,
    rowAdded: afterRows > beforeRows,
  });
};
```

#### 4.7.2 DOM 状态捕获

```javascript
// 失败时捕获 DOM 状态（含弹窗、错误提示、按钮状态）
async (page) => {
  return await page.evaluate(() => {
    const dialog = document.querySelector(".el-dialog");
    const errors = document.querySelectorAll(".el-form-item__error");
    const messages = document.querySelectorAll(".el-message__content");
    return {
      url: location.href,
      dialogVisible: dialog && getComputedStyle(dialog).display !== "none",
      dialogTitle:
        dialog?.querySelector(".el-dialog__title")?.textContent?.trim() || "",
      formErrors: Array.from(errors).map((e) => e.textContent.trim()),
      toastMessages: Array.from(messages).map((m) => m.textContent.trim()),
    };
  });
};
```

#### 4.7.3 失败原因分类

- 元素未找到（选择器问题）
- 元素不可交互（未就绪/disabled/覆盖）
- 断言不匹配（文案/状态/数据不符）
- 超时（加载慢/接口慢）
- 前置条件不满足（数据缺失）
- 网络错误（接口 4xx/5xx）
- **前端校验阻止（API 未发出）**——新增分类

### 4.8 Element Plus 交互模式（persistent profile 模式）

**核心原则**：persistent profile 模式下 `click()` 直接触发 Vue `@click` 处理器，**无需 `dispatchEvent`**。仅在以下场景用 `page.evaluate(() => btn.click())`：

- Element Plus **MessageBox** 的 Confirm/Cancel 按钮（dispatchEvent 不触发 Vue handler，必须原生 JS click）

#### 4.8.1 el-select 下拉选择

```javascript
// persistent profile 模式：用 click() 打开下拉
async (page) => {
  const innerInput = page
    .locator("[data-testid=billing-org-name-select] input")
    .first();
  await innerInput.click();
  await page.waitForTimeout(800);

  // 选第一个可选项（用 Playwright locator，原生 click 触发 Vue 选中）
  const firstItem = page
    .locator(".el-select-dropdown__item:not(.is-disabled)")
    .first();
  if ((await firstItem.count()) > 0) {
    await firstItem.click();
    await page.waitForTimeout(300);
  }
};
```

#### 4.8.2 el-cascader 多选（检测项目及产品套餐）

```javascript
async (page) => {
  // 1. 用 click() 打开 cascader
  const cascaderInput = page.locator(".el-cascader input").first();
  await cascaderInput.click();
  await page.waitForTimeout(1000);

  // 2. 勾选第一级第一个节点（项目）
  const level1Node = page
    .locator(".el-cascader-menu:nth-child(1) .el-cascader-node")
    .first();
  if ((await level1Node.count()) > 0) {
    await level1Node.click();
    await page.waitForTimeout(500);
  }

  // 3. 勾选第二级第一个节点（产品套餐）
  const level2Node = page
    .locator(".el-cascader-menu:nth-child(2) .el-cascader-node")
    .first();
  if ((await level2Node.count()) > 0) {
    await level2Node.click();
    await page.waitForTimeout(500);
  }

  // 4. 关闭 cascader（点击其他区域）
  await page.locator(".el-dialog__title").click();
  await page.waitForTimeout(300);
};
```

#### 4.8.3 el-date-picker 日期范围选择

```javascript
async (page) => {
  // 1. 打开日期选择器
  await page.locator(".el-date-editor--datetimerange").click();
  await page.waitForTimeout(1000);

  // 2. 点击左面板 today
  const leftPanelToday = page
    .locator(".el-picker-panel__content:nth-child(1) td.today")
    .first();
  if ((await leftPanelToday.count()) > 0) {
    await leftPanelToday.click();
    await page.waitForTimeout(500);
  }

  // 3. 点击右面板第一个 available
  const rightPanelAvail = page
    .locator(".el-picker-panel__content:nth-child(2) td.available")
    .first();
  if ((await rightPanelAvail.count()) > 0) {
    await rightPanelAvail.click();
    await page.waitForTimeout(500);
  }

  // 4. 点击确认按钮
  const confirmBtn = page
    .locator(".el-picker-panel__footer button.is-plain")
    .first();
  if ((await confirmBtn.count()) > 0) {
    await confirmBtn.click();
    await page.waitForTimeout(500);
  }
};
```

#### 4.8.4 Element Plus MessageBox（特殊：必须 JS 原生 click）

```javascript
// 重要：dispatchEvent("click") 不触发 MessageBox 的 Vue handler
// 必须用 page.evaluate 内的原生 btn.click()
async (page) => {
  await page.evaluate(() => {
    const btns = document.querySelectorAll(".el-messagebox button");
    for (const btn of btns) {
      if (btn.textContent.trim() === "Confirm") {
        btn.click();
        return;
      }
    }
  });
};
```

### 4.9 过程产物管理

**原则：测试结束后仅保留关键结果文件，删除所有中间脚本**。

**保留**：

- 测试报告 `.md` 文件
- 关键截图（`testing-imgs/` 下带 SUCCESS/FAIL 标识的截图）
- 数据探测结果（记录在报告中，不单独留文件）

**删除**（测试结束后清理）：

- 所有中间 `.js` 脚本（探测、测试、调试脚本）
- 所有中间 `.ps1` 脚本
- 调试截图（带 `debug` 标识的截图）
- 临时数据文件（`captcha.png` 等）

**禁止**：

- 禁止保留多个版本的调试脚本（`test-form004.js`, `test-form004-v2.js`, `test-form004-v3.js` 等）
- 禁止保留未带 SUCCESS/FAIL 标识的截图
- 禁止将中间脚本留在测试报告目录下

### 4.10 官方 skill 功能模块调用规范

> **目标**：在合适场景调用官方 `playwright-cli` skill（`d:\AIauto\.agents\skills\playwright-cli\SKILL.md`）的功能模块，避免过度依赖 `run-code --filename` 绕过官方主推交互模式。本 skill 不重复官方文档，仅规定**何时调用哪个官方模块**。

#### 4.10.1 调用决策表

| 场景                     | 首选官方模块                                   | 备选方案                           | 决策理由                                       |
| ------------------------ | ---------------------------------------------- | ---------------------------------- | ---------------------------------------------- |
| 探索未知页面结构         | `snapshot` + ref 交互                          | `run-code` 输出 JSON               | snapshot 提供可视化 YAML，便于定位元素 ref     |
| 单元素点击/填写          | `click "getByTestId('xxx')"` / `fill e5 "..."` | `run-code`                         | 官方语义化定位器更稳定，无需写 JS              |
| 批量多步骤操作           | `run-code --filename`                          | 多次 `click`/`fill`                | 单次调用执行多步骤，减少跨进程通信             |
| 含中文/正则的 JS 表达式  | `run-code --filename`                          | `eval "..."`（仅纯 ASCII）         | PowerShell 会吞掉 `\|` 和单引号，详见 §4.10.5  |
| 截图                     | `screenshot --filename=绝对路径`               | `run-code` 内 `page.screenshot()`  | 官方命令一行搞定，无需写 JS                    |
| 控制台日志检查           | `console` / `console warning`                  | `run-code` 内 `page.on("console")` | 官方命令直接输出，无需挂载监听                 |
| 网络请求检查（调试）     | `requests`                                     | `run-code` 内 `page.on("request")` | 官方命令直接输出请求列表                       |
| 网络请求监控（断言）     | `run-code` 内 `page.on("request")`             | `requests`（仅查看）               | 需要在提交前后对比时必须用 `run-code` 挂载监听 |
| 结果后处理/管道          | `--raw` 选项                                   | 手动剥离输出                       | `--raw` 仅返回结果值，便于 `jq`/重定向         |
| Cookie/localStorage 检查 | `cookie-list` / `localstorage-list`            | `eval` 读取                        | 官方命令结构化输出，无需写 JS                  |

#### 4.10.2 snapshot + ref 交互模式（探索阶段首选）

**何时用**：首次打开页面、用例失败需要查看 DOM 结构、不熟悉页面布局时。

```bash
# 1. 获取页面快照（含元素 ref，如 e15、e23）
playwright-cli snapshot

# 2. 用 ref 交互（persistent profile 模式 click() 直接触发 Vue @click）
playwright-cli click e15
playwright-cli fill e5 "user@example.com" --submit

# 3. 限定快照深度（提高效率）
playwright-cli snapshot --depth=4

# 4. 快照指定元素
playwright-cli snapshot "#main"
playwright-cli snapshot e34
```

**何时不用**：

- Element Plus 复杂组件（el-cascader/el-date-picker，用 §4.8 模式）
- 批量多步骤操作（用 `run-code --filename`）

**snapshot 输出保存**（用于调试对比）：

```bash
playwright-cli --raw snapshot > before-click.yml
playwright-cli click e5
playwright-cli --raw snapshot > after-click.yml
# 对比 before/after 定位变化
```

#### 4.10.3 getByTestId 定位器（单元素交互首选）

**何时用**：单元素点击/填写/检查，且元素带 `data-testid` 属性时。比 `run-code` 内 `document.querySelector` 更语义化、更稳定。

```bash
# 点击带 data-testid 的按钮
playwright-cli click "getByTestId('billing-confirm-btn')"

# 填写带 data-testid 的输入框
playwright-cli fill "getByTestId('billing-search-keyword')" "HT-OSEQ"

# 读取 data-testid 属性（snapshot 未显示时）
playwright-cli eval "el => el.getAttribute('data-testid')" e5
```

**何时不用**：

- 元素无 `data-testid`（用 CSS 选择器或 ref 兜底）
- 需要批量操作多个元素（用 `run-code --filename`）

**混合模式推荐**：探索用 snapshot → 单元素用 getByTestId → 批量操作用 run-code。

#### 4.10.4 --raw 原始输出（结果后处理首选）

**何时用**：需要把命令输出管道传递给其他工具（jq、重定向、变量赋值）时。

```bash
# 提取 JSON 字段
playwright-cli --raw eval "JSON.stringify(performance.timing)" | jq '.loadEventEnd - .navigationStart'

# 保存快照到文件
playwright-cli --raw snapshot > before.yml

# 提取 cookie 到变量
TOKEN=$(playwright-cli --raw cookie-get session_id)

# 收集所有链接
playwright-cli --raw eval "JSON.stringify([...document.querySelectorAll('a')].map(a => a.href))" > links.json
```

#### 4.10.5 PowerShell 转义陷阱与规避

**陷阱**：PowerShell 会吞掉 JS 表达式中的 `|`、单引号、双引号，导致 `eval` 内联失败。

```bash
# ❌ 失败：PowerShell 吞掉 /token|session/i 中的 |，正则变成 /tokensession/i
playwright-cli eval "() => !!document.cookie.match(/token|session/i)"

# ❌ 失败：PowerShell 吞掉 '.el-dialog:visible' 的单引号
playwright-cli eval "() => !!document.querySelector('.el-dialog:visible')"
```

**规避方案**（按优先级）：

1. **首选：用 `run-code --filename` 执行 JS 文件**（完全绕过转义）：

   ```powershell
   playwright-cli run-code --filename=check-state.js
   ```

2. **次选：纯 ASCII 简单表达式可用 `eval`**（无 `|`、无单引号、无 CSS 选择器）：

   ```bash
   playwright-cli eval "document.title"           # ✅ 纯字符串
   playwright-cli eval "1 + 1"                    # ✅ 纯数字
   playwright-cli eval "() => location.href"      # ✅ 纯属性访问
   ```

3. **禁止：含中文、正则、CSS 选择器、单引号的 `eval` 内联**：
   ```bash
   # 以下均会失败或结果错误
   playwright-cli eval "() => document.querySelector('.el-dialog')"     # ❌ 单引号
   playwright-cli eval "() => document.cookie.match(/token|session/i)"  # ❌ 正则 |
   playwright-cli eval "() => '请输入字母'"                              # ❌ 中文
   ```

**官方 skill 未提供 PowerShell 转义指南**，本节为补充规范。

#### 4.10.6 console / requests 命令（调试阶段首选）

**何时用**：用例失败需要快速查看控制台错误或网络请求时，一行命令直接输出，无需写 JS。

```bash
# 查看所有控制台消息
playwright-cli console

# 只看 warning 及以上级别
playwright-cli console warning

# 查看所有网络请求
playwright-cli requests

# 查看特定请求详情
playwright-cli request 5
```

**何时不用**：

- 需要在提交前后对比网络请求（用 `run-code` 内 `page.on("request")` 挂载监听，见 §4.7.1）
- 需要断言网络请求是否发出（用 `run-code` 内 `page.on("request")` 捕获并返回结构化 JSON）

**混合模式推荐**：调试用 `console`/`requests` → 断言用 `run-code` 挂载监听。

#### 4.10.7 截图命令（单步截图首选）

**何时用**：用例执行完毕后单步截图，一行命令搞定，无需写 JS。

```bash
# 整页截图（默认）
playwright-cli screenshot --filename=D:\AIauto\MySpace\ui-test\testing-imgs\FORM-003-FAIL.png

# 指定元素截图（如只截弹窗）
playwright-cli screenshot e5 --filename=dialog.png
```

**何时不用**：

- 需要在批量操作中截图（用 `run-code` 内 `page.screenshot({ path: "..." })`）
- 需要条件截图（如失败时才截，用 `run-code` 内判断后截图）

**禁止**：用相对路径 `--filename=FORM-003-FAIL.png`（会保存到 CWD，非 testing-imgs/），必须用绝对路径。

## 5. 测试数据生命周期

```
探测已有数据 → 规划新增数据(≤10条) → 执行新增 → 复用给编辑/删除 → 测试结束清理(允许保留≤5条)
     ↓                                          ↓                              ↓
  记录数据清单                              更新复用情况                   优先保留失败用例相关
```

**关键原则**：

- 先看后做：先探测已有数据，再决定是否需要新增。
- 最小创建：能复用已有数据就不新增。
- 可追溯：每条新增数据记录来源用例、唯一标识、复用情况。
- **可清理但允许保留**：测试结束后清理新增数据，但允许保留 **≤5 条**作为后续测试或缺陷复现的样本。

### 5.1 数据清理策略（分级执行）

按以下优先级依次尝试清理：

| 级别 | 策略                  | 适用场景                           | 记录方式                        |
| ---- | --------------------- | ---------------------------------- | ------------------------------- |
| 1    | **UI 删除按钮**       | 系统提供删除入口                   | 清理状态 = "已删除"             |
| 2    | **禁用/停用作软清理** | UI 无删除按钮但有禁用入口          | 清理状态 = "已禁用（软清理）"   |
| 3    | **恢复初始状态**      | 状态切换类用例（启用→禁用→启用）   | 清理状态 = "已恢复"             |
| 4    | **保留 + 残留预警**   | 上述均不可行，或属于"建议保留"情形 | 清理状态 = "已保留"，附保留原因 |

### 5.2 允许保留的数据（≤5 条）

**保留优先级**（从高到低）：

1. **失败用例相关数据**：用于缺陷复现、回归验证。
2. **边界值数据**：用于后续边界测试（如最大配额、最长合同周期）。
3. **特殊状态数据**：填补测试数据空白（如已停用、已到期状态样本不足时）。
4. **普通测试数据**：仅当上述三类均无须保留时，可保留普通数据凑数（不超过剩余配额）。

**保留规则**：

- 保留总数 **≤5 条**，超出必须清理。
- 每条保留数据必须在报告 §6.3 残留预警表中写明：数据标识、创建用例、保留原因、保留级别。
- 保留数据不影响线上业务（已禁用作软清理的优先保留；启用状态的数据保留须谨慎评估）。

### 5.3 测试数据清单格式

```markdown
| 序号 | 数据类型 | 唯一标识    | 创建用例 | 创建时间 | 复用情况         | 清理状态         | 保留原因                   |
| ---- | -------- | ----------- | -------- | -------- | ---------------- | ---------------- | -------------------------- |
| 1    | 合同     | HT-TEST-001 | FORM-004 | 14:30    | 编辑(FORM-008)   | 已删除           | —                          |
| 2    | 合同     | HT-TEST-002 | FORM-004 | 14:32    | 失败用例FORM-003 | 已保留           | 失败用例相关，用于缺陷复现 |
| 3    | 合同     | HT-TEST-003 | FORM-004 | 14:35    | 未复用           | 已禁用（软清理） | UI 无删除入口              |
```

## 6. 测试报告输出

测试完成后，按 `report-template.md` 模板输出测试报告到用户指定路径。

**报告必须包含**：

1. 测试概述（对象、环境、日期）
2. 测试结果总览（总数/通过/不通过/条件不满足/跳过）
3. 关键指标（覆盖度、失败率、通过率、准确度）
4. 技术方案（工具链、策略、环境配置、耗时、Token 消耗）
5. 测试用例明细（每条用例的编号、优先级、结果、实际证据）
6. 非通过用例备注详解（每条非通过用例的详细说明）
7. 截图清单（文件名、对应用例、说明）
8. 缺陷汇总（确认缺陷、待确认问题、测试数据不足）
9. 结论与建议

**结果判定标准**：

| 结果          | 判定条件                                         |
| ------------- | ------------------------------------------------ |
| ✅ 通过       | 实际行为与预期完全一致（含文案精确匹配）         |
| ❌ 不通过     | 实际行为与预期不符（功能错误/文案不符/断言失败） |
| ⚠️ 条件不满足 | 前置数据/权限不满足，无法执行                    |
| ⚠️ 部分通过   | 部分预期已验证，部分因条件限制未验证             |
| ⏭️ 跳过       | 主动跳过（需说明原因和已验证部分）               |

## 7. 约束

- **主选 persistent profile**（§4.1 方案 A），仅在 profile 损坏或 CI 环境时回退到 storageState。
- **禁止硬编码环境地址与账号**，必须从 `.env` 或用户输入获取。
- **禁止每个用例重新登录**，全程复用同一浏览器会话与认证态。
- **禁止重复执行安装命令**，`playwright-cli --version` 正常输出时跳过 `install` / `install-browser`。
- **禁止 token 过期时自动重登**，应提示用户手动登录后继续。
- **禁止用 `networkidle` 作为等待手段**，改用 DOM 元素可见性断言。
- **禁止只用关键词包含判断文案**，校验类用例必须逐字比对完整文案。
- **禁止删除原有数据**，只能删除本次测试新增的数据。
- **禁止新增超过 10 条数据**，优先复用已有数据。
- **禁止保留超过 5 条测试数据**，超出必须清理；优先保留失败用例相关数据。
- **禁止跳过截图**（除非用户明确说明不需要），成功和失败均需截图。
- **禁止凭空编造测试数据**，先探测页面实际数据再编写。
- **禁止在文案不一致时判定通过**，文案不符即为不通过。
- **禁止测试结束后数据清理情况不记录**，必须逐条记录清理状态（已删除/已禁用/已恢复/已保留）。
- **禁止 persistent profile 散落多处**，固定使用 `D:\AIauto\Tests\.auth\playwright-profile`。
- **禁止写操作用例跳过表单字段完整性探测**（§4.2.2），避免漏填必填字段导致静默失败。
- **禁止写操作失败时不检查网络请求**（§4.7.1），必须先判断 API 是否发出。
- **禁止保留中间脚本文件**（§4.9），测试结束后仅保留报告与关键截图。
- **禁止忽略官方 skill 版本警告**（§3 第 2 步），发现警告框立即执行 `playwright-cli install --skills=agents` 更新。
- **禁止含中文/正则/CSS 选择器/单引号的 `eval` 内联**（§4.10.5），必须改用 `run-code --filename` 执行，避免 PowerShell 转义陷阱。
- **禁止探索阶段跳过 `snapshot` 直接写 JS**（§4.10.2），首次打开页面或不熟悉布局时必须先用 `snapshot` 获取元素 ref。
- **禁止单元素交互时跳过 `getByTestId` 直接用 `querySelector`**（§4.10.3），元素带 `data-testid` 时必须优先用官方语义化定位器。
- **禁止调试阶段跳过 `console`/`requests` 直接写监听 JS**（§4.10.6），快速查看控制台/网络时必须先用官方命令。
- **禁止截图用相对路径**（§4.10.7），`screenshot --filename` 必须用绝对路径，避免保存到 CWD。
- **禁止用 `dispatchEvent("click")` 触发 Vue 事件**（persistent profile 模式下 `click()` 直接触发，仅 MessageBox 用原生 `btn.click()`，见 §4.8.4）。
- **禁止 Element Plus MessageBox 用 `dispatchEvent("click")`**（不触发 Vue handler），必须用 `page.evaluate(() => btn.click())` 原生 JS click。

## 8. 完成前自检

提交报告前核对：

- [ ] 是否跳过了已安装的 playwright-cli 重复安装步骤
- [ ] 是否消除了官方 skill 版本警告（§3 第 2 步，发现即执行 `playwright-cli install --skills=agents`）
- [ ] 是否使用 persistent profile 模式（方案 A），未走 storageState 全量登录
- [ ] persistent profile 路径是否固定为 `D:\AIauto\Tests\.auth\playwright-profile`
- [ ] 是否执行了列表数据探测并记录了页面实际数据分布
- [ ] 写操作用例是否执行了表单字段完整性探测（§4.2.2，含无 testid 字段）
- [ ] 每条用例是否都有明确结果（通过/不通过/条件不满足/跳过）
- [ ] 校验类用例是否逐字比对了文案并记录了预期 vs 实际
- [ ] 失败用例是否捕获了截图、DOM 状态、网络请求、失败原因分类
- [ ] persistent profile 模式下是否用 `click()` 触发 Vue 事件（非 `dispatchEvent`）
- [ ] Element Plus MessageBox 是否用 `page.evaluate(() => btn.click())` 原生 JS click（非 `dispatchEvent`）
- [ ] 截图是否输出到 `testing-imgs/` 文件夹并带 `SUCCESS`/`FAIL` 标识
- [ ] 截图文件名是否使用绝对路径
- [ ] 写操作用例是否记录了测试数据清单（含清理状态与保留原因两列）
- [ ] 新增数据是否超过 10 条限制
- [ ] 新增数据是否优先复用给编辑/删除用例
- [ ] 保留数据是否 ≤5 条，且优先保留了失败用例相关数据
- [ ] 每条保留数据是否在报告 §6.3 写明了保留原因与级别
- [ ] 测试结束后是否按分级策略清理了新增数据（删除 > 禁用 > 恢复 > 保留）
- [ ] 报告是否按模板输出并包含所有必需章节
- [ ] 非通过用例是否每条都有详细备注说明
- [ ] 测试结束后是否清理了所有中间脚本文件（仅保留报告 + 关键截图）
- [ ] 探索阶段是否用了 `snapshot` 获取页面结构与元素 ref（§4.10.2）
- [ ] 单元素交互是否优先用了 `getByTestId` 定位器（§4.10.3）
- [ ] 含中文/正则/CSS 选择器的 JS 是否都用了 `run-code --filename`（§4.10.5，禁 `eval` 内联）
- [ ] 调试阶段是否优先用了 `console`/`requests` 官方命令（§4.10.6）
- [ ] 截图命令是否都用了绝对路径（§4.10.7）

## 9. 附录：CDP 接管模式（特殊情况）

**仅当用户已在浏览器中登录且需要保留会话时使用**，不作为主选方案。

```powershell
# 步骤 1：启动带 CDP 的 Chrome（用户数据目录固定）
Start-Process chrome -ArgumentList `
  "--remote-debugging-port=9222",
  "--user-data-dir=D:\AIauto\Tests\.auth\cdp-profile",
  "http://ack.omicsone.com/login"

# 步骤 2：等待 3 秒，用户手动登录
# 步骤 3：playwright-cli 接管（必须用 127.0.0.1，禁用 localhost）
playwright-cli attach --cdp=http://127.0.0.1:9222
```

**CDP 模式特殊约束**：

- **禁止使用 `localhost:9222`**，必须用 `127.0.0.1:9222`（IPv6 解析问题）。
- **禁止用 `click()` 触发 Vue 事件**，必须用 `dispatchEvent("click")`（CDP 合成鼠标事件不触发 Vue `@click`）。
- **禁止含正则/CSS 选择器/单引号的 `eval` 内联**，必须用 `run-code --filename`（PowerShell 转义陷阱）。
- CDP profile 路径固定为 `D:\AIauto\Tests\.auth\cdp-profile`。
- CDP 模式下 el-select/el-cascader/el-date-picker 需用 `page.evaluate(() => btn.click())` 触发原生 JS click（dispatchEvent 不触发 Vue handler）。

**CDP 模式事件触发速查表**：

| 操作                  | persistent profile 模式            | CDP 模式（必须）                                                           |
| --------------------- | ---------------------------------- | -------------------------------------------------------------------------- |
| 按钮点击              | `locator.click()` ✅               | `locator.dispatchEvent("click")` ✅                                        |
| 输入框填写            | `locator.fill()` ✅                | `locator.fill()` + `dispatchEvent("change")` + `dispatchEvent("input")` ✅ |
| 触发校验              | `locator.dispatchEvent("blur")`    | `locator.dispatchEvent("blur")` ✅                                         |
| el-select 打开下拉    | `click()` ✅                       | `locator("input").click({ force: true })` 打开 + JS `item.click()` 选中    |
| el-cascader 多选      | `click()` ✅                       | JS `inp.click()` 打开 + JS `checkbox.click()` 勾选                         |
| el-date-picker 选日期 | Playwright locator API ✅          | JS `todayCell.click()` + JS `availCell.click()` + JS `confirmBtn.click()`  |
| MessageBox Confirm    | `page.evaluate(() => btn.click())` | `page.evaluate(() => btn.click())`（相同）                                 |
