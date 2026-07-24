---
name: playwright-cli-testing
description: 基于 official playwright-cli skill 的项目增强层：聚焦快速功能验证、首次功能验证与探索摸底。支持两类场景——独立运行自测用例、作为探索/验证阶段的技术支撑。仅补充项目约束（登录态、流程、Element Plus 交互、PowerShell 陷阱、data-testid 快照、数据生命周期），不重复官方命令文档。
allowed-tools: Read Glob Grep Edit Write RunCommand
---

# playwright-cli-testing（项目增强层）

> **架构定位**：本 skill 是 [official playwright-cli skill](file:///d:/AIauto/.agents/skills/playwright-cli/SKILL.md) 的**项目增强层**。官方命令（`snapshot`/`click`/`fill`/`eval`/`run-code`/`screenshot`/`console`/`requests`/`state-*`/`cookie-*`/`localstorage-*`）不在此重复，仅规定**何时调哪个官方模块**及项目特定约束。官方文档见 `d:\AIauto\.agents\skills\playwright-cli\SKILL.md`。

## 1. 定位与两种核心场景

本 skill 聚焦三件事：**快速功能验证 · 首次功能验证 · 探索摸底**。

两种核心应用场景：

- **场景一 · 独立运行自测**：用户给出自测用例（FT-* 或自由描述）→ 直接驱动浏览器跑并产出结果报告。
- **场景二 · 探索与验证支撑**：配合 `ui-automation-bootstrap`（骨架定位）与 `playwright-test-implementation`（脚本实现），负责探页面结构、确认/维护模块 `data-testid.snapshot.json`、验证定位稳定性。

> 场景二**只做探索与验证**，不产出正式 spec 脚本；正式脚本由 `playwright-test-implementation` 负责。

## 2. 前置检查（指令）

1. `playwright-cli --version` 正常输出 → **跳过 install**；仅命令缺失或版本过旧才 `npm install -g @playwright/cli@latest`。
2. 输出含版本警告框（skill 与 tool 不匹配）→ 执行 `playwright-cli install --skills=agents`（exit code 可能非 0 但实际成功）；输出干净则跳过。
3. persistent profile 目录 `D:\AIauto\Tests\.auth\playwright-profile` 应存在（首启自动创建，首次需手动登录一次），长期复用。
4. 确认 `.env`/账号、目标路由、截图输出路径（默认报告下 `testing-imgs/`）。
5. 确认 `03-测试用例文档.md`（FT-* 来源）与模块 `data-testid.snapshot.json`、`02-详细设计文档.md` §7 是否就绪。

## 3. 登录态策略

**方案 A（主选）：persistent profile**——playwright-cli 原生管理浏览器，登录态长期保持；`click()` 直接触发 Vue `@click`，命令 ~0.5-2s。（CDP 接管已废弃为主选：需 `dispatchEvent`、~5-10s/命令。）

```powershell
# 首次需手动登录，后续自动复用登录态
playwright-cli open --profile=D:\AIauto\Tests\.auth\playwright-profile --browser=msedge http://ack.omicsone.com/login
playwright-cli goto http://ack.omicsone.com/config/billingConfig
# 验证登录态
playwright-cli eval "() => ({ url: location.href, hasToken: !!document.cookie.match(/token|session/i) })"
```

**方案 B（备选）：storageState 复用**——CI 或 profile 损坏时。

```powershell
playwright-cli open --browser=msedge
playwright-cli state-load .auth/billing-state.json   # 无则先登录再 state-save
playwright-cli goto http://ack.omicsone.com/config/billingConfig
```

**方案 C（特殊）：CDP 接管已登录浏览器**——仅当用户已在浏览器登录且需保留会话，见附录 §10。

**约束**：主选 A；不硬编码环境地址/账号（取 `.env` 或用户输入）；全程复用同一会话；profile 路径固定 `D:\AIauto\Tests\.auth\playwright-profile`；token 过期**不自动重登**，提示用户手动登录后继续。

## 4. 探索摸底流程（场景二支撑）

### 4.1 数据/字段探测（写操作前必做）

**列表数据探测**（用 `run-code --filename` 规避 PowerShell 中文编码）：

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
  const headers = (await page.locator(".el-table__header th .cell").allTextContents())
    .map((h) => h.trim()).filter((h) => h);
  const firstRowContract = await page.locator(".el-table__row").first()
    .locator("td").nth(7).textContent().catch(() => "");
  return JSON.stringify({ totalRows, statusDistribution: statusDist, headers, firstRowContractNo: firstRowContract.trim() });
};
```

**表单字段完整性探测**（写操作用例执行前必须跑，含无 `data-testid` 的必填字段，避免漏填静默失败）：

```javascript
// probe-form-fields.js
async (page) => {
  await page.locator("[data-testid=billing-add-tenant-btn]").click();
  await page.waitForTimeout(1500);
  const formInfo = await page.evaluate(() => {
    const dialog = document.querySelector("[data-testid=billing-edit-dialog]") || document.querySelector(".el-dialog");
    if (!dialog) return { found: false };
    const formItems = Array.from(dialog.querySelectorAll(".el-form-item")).map((fi) => ({
      label: fi.querySelector(".el-form-item__label")?.textContent?.trim() || "",
      required: fi.classList.contains("is-required"),
      testid: fi.querySelector("[data-testid]")?.getAttribute("data-testid") || "",
      inputType: fi.querySelector("input")?.type ||
        (fi.querySelector(".el-select") ? "select" : fi.querySelector(".el-cascader") ? "cascader" : fi.querySelector(".el-date-editor") ? "date-picker" : "unknown"),
      disabled: !!fi.querySelector("input:disabled") || fi.classList.contains("is-disabled"),
    }));
    const sectionTitles = Array.from(dialog.querySelectorAll(".section-title")).map((t) => t.textContent.trim());
    const allInputs = Array.from(dialog.querySelectorAll("input")).map((inp) => ({ type: inp.type, placeholder: inp.placeholder, testid: inp.getAttribute("data-testid") || "", disabled: inp.disabled, value: inp.value }));
    return { found: true, sectionTitles, formItems, allInputs };
  });
  await page.locator("[data-testid=billing-cancel-btn]").click().catch(() => {});
  return JSON.stringify(formInfo);
};
```

**判断规则**：前置满足→正常执行；不满足→标记"条件不满足"并记录缺失类型；部分满足→执行可验证部分并标记"部分通过"；写操作用例探测到无 `data-testid` 的必填字段→先记录其定位方式再执行。

### 4.2 维护 data-testid 快照（含无 data-testid 的兜底输出）

用 `snapshot` 打开页面后，把页面真实元素与模块 `data-testid.snapshot.json`（及 `02-详设 §7`）比对，按「设计意图 vs 页面实际」闭环处理：

- 页面有 `data-testid`、快照/§7 有 → 该 `testId` 的 `evidence` 升级为 `page-verified`（`actual.exists:true`）。
- §7 有、页面无 `data-testid` → 计入 `gaps.missingInPage`（可带 `suggestedSelector`），**回推前端补 `data-testid`**；同时用兜底定位完成探索，不卡住。
- 页面有、§7/快照无 → 计入 `gaps.extraInPage`（带 `selector`），回填 §7 与快照。

**无 data-testid 时的兜底与输出**：老页面 / 未接 §7 规范的模块，很多元素没有 `data-testid`，此时不能等 testid，应：

1. 用稳定兜底定位完成交互（优先级）：`getByRole(role,{name})` > `locator`+稳定属性(`aria-label`/`name`/业务 class) > `getByText` > 最后才脆弱 CSS。
2. 在快照 `elements[]` 记 `hasDataTestId:false` + `actual:{ exists:true, selector:<兜底定位> }` + `evidence:page-verified`；缺 testid 的项同时进 `gaps.missingInPage`。
3. 若模块 testid 普遍缺失或尚无快照，额外产出 **`探索结果清单.md`**（存 `snapshots/`）：列「元素语义 / 是否含 testid / 页面实际稳定定位 / 建议（推前端补 testid 或临时用兜底）」，作为 bootstrap / implementation 的临时定位字典。

> 兜底定位需标注脆弱度（role/aria 稳定 > 业务 class 稳定 > 纯结构 CSS 脆弱），便于 implementation 决定临时用还是推前端补。快照 schema 见 `ui-automation-bootstrap` / `playwright-test-implementation`，完整字段见方案文档 §14.3。

## 5. 功能验证流程（场景一）

**执行顺序**（降数据污染）：只读用例 → 状态切换 → 新增 → 编辑 → 删除（只删本次新增）。

**命令模式选择**（persistent profile 下）：

| 场景             | 命令模式                                 | 理由                     |
| ---------------- | ---------------------------------------- | ------------------------ |
| 探索未知页面     | `snapshot` + ref                         | 可视化 YAML，官方推荐    |
| 单元素点击/填写  | `click "getByTestId('xxx')"` / `fill e5` | 语义化定位，无需写 JS    |
| 批量多步骤操作   | `run-code --filename`                    | 单次调用多步骤           |
| 含中文/正则的 JS | `run-code --filename`                    | 规避 PowerShell 转义     |
| 截图             | `screenshot --filename=绝对路径`         | 一行命令                 |
| 控制台/网络检查  | `console` / `requests`                   | 官方命令直接输出         |

**关键官方模块调用**：

```bash
# 探索：获取元素 ref（e15、e23）
playwright-cli snapshot
playwright-cli click e15
playwright-cli snapshot --depth=4

# 单元素（带 data-testid 时首选）
playwright-cli click "getByTestId('billing-confirm-btn')"
playwright-cli fill "getByTestId('billing-search-keyword')" "HT-OSEQ"

# 结果后处理（--raw 仅返回值，便于 jq/重定向）
playwright-cli --raw snapshot > before.yml
playwright-cli --raw eval "JSON.stringify([...document.querySelectorAll('a')].map(a=>a.href))" > links.json

# 调试
playwright-cli console warning
playwright-cli requests
playwright-cli request 5

# 截图（必须绝对路径）
playwright-cli screenshot --filename=D:\AIauto\MySpace\ui-test\testing-imgs\FORM-003-FAIL.png
```

**混合模式**：探索 `snapshot` → 单元素 `getByTestId` → 批量 `run-code`；调试 `console`/`requests` → 断言挂载监听 `run-code`。

**约束**：首次打开/不熟悉布局必须先 `snapshot`；元素带 `data-testid` 必须优先 `getByTestId`，禁止直接 `querySelector`；调试优先 `console`/`requests`，禁止跳过官方命令直接写监听 JS；截图禁止相对路径。

## 6. 写操作数据管理

- 单次测试最多新增 **10 条**；先探测可复用数据，优先复用；每条新增记录唯一标识到数据清单。
- **只删本次新增**，禁止删原有数据；删除前确认来源，无法区分则不删并标记"条件不满足"。
- 测试结束按分级策略清理：UI 删除 > 禁用软清理 > 恢复初始状态 > 保留+残留预警；允许保留 **≤5 条**（优先失败用例相关数据）。

**测试数据清单**（实时维护）：

```markdown
| 序号 | 数据类型 | 唯一标识    | 创建用例 | 创建时间 | 复用情况         | 清理状态         | 保留原因                   |
| ---- | -------- | ----------- | -------- | -------- | ---------------- | ---------------- | -------------------------- |
| 1    | 合同     | HT-TEST-001 | FORM-004 | 14:30    | 编辑(FORM-008)   | 已删除           | —                          |
| 2    | 合同     | HT-TEST-002 | FORM-004 | 14:32    | 失败用例FORM-003 | 已保留           | 失败用例相关，用于缺陷复现 |
| 3    | 合同     | HT-TEST-003 | FORM-004 | 14:35    | 未复用           | 已禁用（软清理） | UI 无删除入口              |
```

## 7. Element Plus 交互模板（persistent profile）

**原则**：`click()` 直接触发 Vue `@click`，**无需 `dispatchEvent`**；仅 **MessageBox** 的 Confirm/Cancel 需 `page.evaluate(() => btn.click())` 原生 JS click（`dispatchEvent` 不触发 Vue handler）。

```javascript
// 7.1 el-select（click() 打开下拉，原生 click 选中）
async (page) => {
  const innerInput = page.locator("[data-testid=billing-org-name-select] input").first();
  await innerInput.click(); await page.waitForTimeout(800);
  const firstItem = page.locator(".el-select-dropdown__item:not(.is-disabled)").first();
  if ((await firstItem.count()) > 0) { await firstItem.click(); await page.waitForTimeout(300); }
};
```

```javascript
// 7.2 el-cascader 多选（点击打开→勾选一/二级节点→点标题关闭）
async (page) => {
  await page.locator(".el-cascader input").first().click(); await page.waitForTimeout(1000);
  const l1 = page.locator(".el-cascader-menu:nth-child(1) .el-cascader-node").first();
  if ((await l1.count()) > 0) { await l1.click(); await page.waitForTimeout(500); }
  const l2 = page.locator(".el-cascader-menu:nth-child(2) .el-cascader-node").first();
  if ((await l2.count()) > 0) { await l2.click(); await page.waitForTimeout(500); }
  await page.locator(".el-dialog__title").click(); await page.waitForTimeout(300);
};
```

```javascript
// 7.3 el-date-picker 范围（打开→左 today→右 available→确认）
async (page) => {
  await page.locator(".el-date-editor--datetimerange").click(); await page.waitForTimeout(1000);
  const lt = page.locator(".el-picker-panel__content:nth-child(1) td.today").first();
  if ((await lt.count()) > 0) { await lt.click(); await page.waitForTimeout(500); }
  const ra = page.locator(".el-picker-panel__content:nth-child(2) td.available").first();
  if ((await ra.count()) > 0) { await ra.click(); await page.waitForTimeout(500); }
  const cf = page.locator(".el-picker-panel__footer button.is-plain").first();
  if ((await cf.count()) > 0) { await cf.click(); await page.waitForTimeout(500); }
};
```

```javascript
// 7.4 MessageBox（必须原生 JS click）
async (page) => {
  await page.evaluate(() => {
    for (const btn of document.querySelectorAll(".el-messagebox button")) {
      if (btn.textContent.trim() === "Confirm") { btn.click(); return; }
    }
  });
};
```

## 8. 失败诊断

**写操作失败先查网络请求**（区分前端校验阻止 vs 后端拒绝）：

```javascript
// 提交前挂载监听，提交后检查
async (page) => {
  const captured = [];
  const handler = (req) => { if (req.url().includes("contract") && !req.url().includes("contract/page")) captured.push({ url: req.url(), method: req.method(), body: req.postData() }); };
  page.on("request", handler);
  const beforeRows = await page.locator(".el-table__row").count();
  await page.locator("[data-testid=billing-confirm-btn]").click();
  await page.waitForTimeout(2000);
  const afterRows = await page.locator(".el-table__row").count();
  page.off("request", handler);
  const messages = await page.evaluate(() => Array.from(document.querySelectorAll(".el-message__content")).map((m) => m.textContent.trim()));
  return JSON.stringify({ beforeRows, afterRows, capturedRequests: captured, messages, requestSent: captured.length > 0, rowAdded: afterRows > beforeRows });
};
```

**DOM 状态捕获**（弹窗/错误/按钮）：

```javascript
async (page) => await page.evaluate(() => {
  const dialog = document.querySelector(".el-dialog");
  return {
    url: location.href,
    dialogVisible: dialog && getComputedStyle(dialog).display !== "none",
    dialogTitle: dialog?.querySelector(".el-dialog__title")?.textContent?.trim() || "",
    formErrors: Array.from(document.querySelectorAll(".el-form-item__error")).map((e) => e.textContent.trim()),
    toastMessages: Array.from(document.querySelectorAll(".el-message__content")).map((m) => m.textContent.trim()),
  };
});
```

**原因分类**：元素未找到 / 不可交互 / 断言不匹配 / 超时 / 前置不满足 / 网络错误(4xx,5xx) / **前端校验阻止(API 未发出)**。

## 9. 文案精确比对

校验类用例**必须逐字比对**实际与预期文案；比对在 JS 文件内完成（浏览器编码正确，规避 PowerShell 中文损坏），任何差异即不通过。

```javascript
// 文案比对必须在 JS 内完成
async (page) => {
  const input = await page.locator("[data-testid=billing-contract-no-input]").elementHandle();
  const formItem = await input.evaluateHandle((el) => el.closest(".el-form-item"));
  const actualMsg = await formItem.evaluate((fi) => { const e = fi.querySelector(".el-form-item__error"); return e ? e.textContent.trim() : ""; });
  const expectedMsg = "请输入字母、数字、-或_";
  return JSON.stringify({ expected: expectedMsg, actual: actualMsg, match: actualMsg === expectedMsg });
};
```

**禁止**：只用关键词包含判断；文案不一致仍判通过；忽略差异仅因"功能已生效"。

## 10. PowerShell 转义陷阱（必读）

PowerShell 会吞掉 JS 内 `|`、单引号、双引号，导致 `eval` 内联失败：

```bash
# ❌ 失败：吞掉 /token|session/i 的 |
playwright-cli eval "() => !!document.cookie.match(/token|session/i)"
# ❌ 失败：吞掉 '.el-dialog:visible' 单引号
playwright-cli eval "() => !!document.querySelector('.el-dialog:visible')"
```

**规避（按优先级）**：
1. **首选 `run-code --filename` 执行 JS 文件**（完全绕过转义）：`playwright-cli run-code --filename=check-state.js`
2. **次选纯 ASCII 简单 `eval`**（无 `|`、无单引号、无 CSS 选择器）：`playwright-cli eval "document.title"` / `"1 + 1"` / `"() => location.href"`
3. **禁止**：含中文、正则、CSS 选择器、单引号的 `eval` 内联。

## 11. 截图与过程产物

- 默认**每用例必截**（成功/失败均截），除非用户说明不需要；文件名绝对路径 `{用例}-{描述}-{SUCCESS|FAIL}.png`，存 `testing-imgs/`。
- 测试结束仅留报告 `.md` + 关键截图；**删除所有中间 `.js`/`.ps1` 脚本、调试截图、临时文件**，禁止多版本调试脚本残留。

## 12. 约束（硬规则）

- 主选 persistent profile，仅 profile 损坏/CI 回退 storageState；profile 路径固定。
- 禁止硬编码环境地址/账号；禁止每用例重登；token 过期不自动重登。
- 禁止重复执行安装命令（`--version` 正常即跳过）。
- 禁止 `networkidle` 等待，改用 DOM 可见性断言。
- 禁止关键词包含判文案；禁止文案不一致判通过；禁止凭空编造数据（先探测）。
- 禁止删原有数据；禁止新增 >10；禁止保留 >5（优先失败用例数据）。
- 禁止跳过截图（除非用户说明）；禁止相对路径截图。
- 写操作用例禁止跳过表单字段完整性探测；写操作失败禁止不查网络请求。
- 禁止保留中间脚本；禁止忽略官方 skill 版本警告。
- 含中文/正则/CSS 选择器的 JS 禁止 `eval` 内联，必须 `run-code --filename`。
- 探索禁止跳过 `snapshot`；单元素带 `data-testid` 禁止跳过 `getByTestId`；调试禁止跳过 `console`/`requests`。
- 禁止 `dispatchEvent("click")` 触发 Vue（persistent profile 下 `click()` 直接触发；仅 MessageBox 用原生 `btn.click()`）。

## 13. 完成前自检

- [ ] 跳过已安装的 playwright-cli 重复安装；消除官方 skill 版本警告
- [ ] 用 persistent profile（路径固定），全程复用同一会话
- [ ] 已探测列表数据 + 写操作用例已做表单字段完整性探测（含无 testid 字段）
- [ ] 每条用例有明确结果；校验类逐字比对文案并记录预期 vs 实际
- [ ] 失败用例已捕获截图/DOM/网络请求/原因分类
- [ ] `click()` 触发 Vue（非 dispatchEvent）；MessageBox 用原生 `btn.click()`
- [ ] 截图绝对路径、带 SUCCESS/FAIL 标识、存 testing-imgs/
- [ ] 已维护测试数据清单（清理状态 + 保留原因）；新增 ≤10、保留 ≤5
- [ ] 测试结束按分级策略清理；报告按 `report-template.md` 输出且非通过用例有详解
- [ ] 清理所有中间脚本（仅留报告 + 关键截图）
- [ ] 探索用 `snapshot`、单元素优先 `getByTestId`、中文/正则 JS 用 `run-code`
- [ ] 调试优先 `console`/`requests`；截图用绝对路径

## 14. 附录：CDP 接管模式（特殊情况）

仅当用户已登录且需保留会话时使用，不作主选。

```powershell
Start-Process chrome -ArgumentList "--remote-debugging-port=9222","--user-data-dir=D:\AIauto\Tests\.auth\cdp-profile","http://ack.omicsone.com/login"
# 等待 3 秒用户手动登录后：
playwright-cli attach --cdp=http://127.0.0.1:9222   # 禁止 localhost，必须 127.0.0.1
```

**CDP 约束**：禁止 `localhost:9222`（用 `127.0.0.1`）；禁止 `click()` 触发 Vue（必须 `dispatchEvent("click")`）；禁止 `eval` 内联正则/CSS；profile 固定 `D:\AIauto\Tests\.auth\cdp-profile`；el-select/cascader/date-picker 用 `page.evaluate(() => btn.click())` 原生 JS。

| 操作                  | persistent profile 模式            | CDP 模式（必须）                                                           |
| --------------------- | ---------------------------------- | -------------------------------------------------------------------------- |
| 按钮点击              | `locator.click()` ✅               | `locator.dispatchEvent("click")` ✅                                        |
| 输入框填写            | `locator.fill()` ✅                | `locator.fill()` + `dispatchEvent("change")` + `dispatchEvent("input")` ✅ |
| 触发校验              | `locator.dispatchEvent("blur")`    | `locator.dispatchEvent("blur")` ✅                                         |
| el-select 打开下拉    | `click()` ✅                       | `locator("input").click({ force: true })` 打开 + JS `item.click()` 选中    |
| el-cascader 多选      | `click()` ✅                       | JS `inp.click()` 打开 + JS `checkbox.click()` 勾选                         |
| el-date-picker 选日期 | Playwright locator API ✅          | JS `todayCell.click()` + JS `availCell.click()` + JS `confirmBtn.click()`  |
| MessageBox Confirm    | `page.evaluate(() => btn.click())` | `page.evaluate(() => btn.click())`（相同）                                 |
