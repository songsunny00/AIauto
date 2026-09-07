---
name: playwright-cli-testing
description: 用于使用 playwright-cli 对 Element Plus 页面执行 UI 功能验证、首次功能验证或页面探索摸底；当执行 FT-* 测试用例、探测页面结构与 data-testid 稳定性、或需要快速功能自测时使用
---

# playwright-cli-testing（项目增强层）

> **架构定位**：本 skill 是 official playwright-cli skill 的**项目增强层**（官方 skill 路径：`${PROJECT_ROOT}/.agents/skills/playwright-cli/SKILL.md`）。官方命令（`snapshot`/`click`/`fill`/`eval`/`run-code`/`screenshot`/`console`/`requests`/`state-*`/`cookie-*`/`localstorage-*`）不在此重复，仅规定**何时调哪个官方模块**及项目特定约束。

## 1. 定位与两种核心场景

本 skill 聚焦三件事：**快速功能验证 · 首次功能验证 · 探索摸底**。

- **场景一 · 独立运行自测**：用户给出自测用例（FT-\* 或自由描述）→ 直接驱动浏览器跑并产出标准化结果报告。
- **场景二 · 探索与验证支撑**：配合 `ui-automation-bootstrap`（骨架定位）与 `playwright-test-implementation`（脚本实现），负责探页面结构、确认/维护模块 `data-testid.snapshot.json`、验证定位稳定性。

> 场景二**只做探索与验证**，不产出正式 spec 脚本；正式脚本由 `playwright-test-implementation` 负责。

---

## 2. 环境与路径变量（通用性基础）

> **设计原则**：本 skill **禁止硬编码任何绝对路径或环境地址**，所有路径与地址通过变量解析，确保跨环境、跨项目可移植。

### 2.1 路径变量解析约定

| 变量               | 用途                                           | 默认值（变量未设置时）                     | 解析优先级                                       |
| ------------------ | ---------------------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| `PROJECT_ROOT`     | 项目根目录                                     | 自动探测：git root 或 skill 上溯三级       | 1. `.env` 同名变量 → 2. git root → 3. skill 上溯 |
| `TESTS_DIR`        | 测试相关文件根目录                             | `${PROJECT_ROOT}/Tests`                    | `.env` 同名变量 > 默认                           |
| `ENV_FILE`         | 自动化测试环境变量文件（仅测试相关变量）       | `${TESTS_DIR}/.env`                        | `.env` 同名变量 > 默认                           |
| `AUTH_DIR`         | 认证/profile 目录                              | `${TESTS_DIR}/.auth`                       | `.env` 同名变量 > 默认                           |
| `PROFILE_DIR`      | persistent profile 目录                        | `${AUTH_DIR}/playwright-profile`           | `.env` 同名变量 > 默认                           |
| `REPORT_DIR`       | 测试输出根目录（报告+截图+探索+脚本）          | `${TESTS_DIR}/playwright-cli-test`         | `.env` 同名变量 > 默认                           |
| `SCREENSHOT_DIR`   | 截图输出目录                                   | `${REPORT_DIR}/screenshots`                | `.env` 同名变量 > 默认                           |
| `SCRIPTS_DIR`      | 固化脚本目录（**仅 Persistent Profile 相关**） | `${REPORT_DIR}/scripts/persistent-profile` | `.env` 同名变量 > 默认                           |
| `TEMP_SCRIPTS_DIR` | 临时中间脚本目录（测试结束询问是否删除）       | `${REPORT_DIR}/scripts/temp`               | `.env` 同名变量 > 默认                           |
| `EXPLORATION_DIR`  | 探索结果输出目录                               | `${REPORT_DIR}/exploration`                | `.env` 同名变量 > 默认                           |

> **目录结构约定**（所有测试输出统一存储，禁止散落他处）：
>
> ```
> Tests/
> ├── .env                              # 自动化测试相关变量（TEST_BASE_URL/账号等）
> ├── .auth/playwright-profile/         # persistent profile（长期复用）
> └── playwright-cli-test/
>     ├── reports/                      # 测试报告 .md
>     ├── screenshots/                  # 测试截图 .png
>     ├── exploration/                  # 探索结果 JSON/MD
>     ├── scripts/
>     │   ├── persistent-profile/       # 固化脚本（仅 Persistent Profile 相关，保留）
>     │   └── temp/                     # 临时中间脚本（测试结束询问是否删除）
>     └── 测试过程问题经验总结.md        # 经验教训（持续积累）
> ```

**解析规则**：

1. 所有路径变量优先从 `${ENV_FILE}`（默认 `Tests/.env`）读取。
2. `.env` 未设置时用上表默认值。
3. **`.env` 配置信息也可能来源于测试用例文档或用户输入**（如地址、账号），`.env` 仅为便捷默认；不明确时直接询问用户。
4. `TEST_BASE_URL` 作为环境标识（登录页构造、报告环境标注），**测试目标地址直接取自测试用例文档 §2.1**，不与 `TEST_BASE_URL` 拼接（见 §2.2）。

### 2.2 测试地址标准化（硬规则）

> **本节解决"地址不一致"问题**：测试目标地址直接来源于测试用例文档，禁止任何形式的硬编码与拼接。

**执行流程**：

1. 读取测试用例文档 `03-测试用例文档.md` §2.1"前端入口"的**完整地址**（如 `http://localhost:7001/config/billingConfig`）。
2. 若文档地址不明确（仅给路由、缺失或存疑），**直接询问用户确认**，禁止自行推断或从历史会话/记忆取。
3. 全程使用此地址；`TEST_BASE_URL`（`.env`）仅作环境标识（登录页构造、报告标注），**不参与目标地址拼接**。

```powershell
# ✅ 正确：目标地址直接取自测试用例文档 §2.1 完整前端入口
$targetUrl = "http://localhost:7001/config/billingConfig"  # 从 03-测试用例文档.md §2.1 读取
playwright-cli open --profile="$PROFILE_DIR" --browser=chromium $targetUrl

# ❌ 禁止：硬编码地址（含从历史会话/记忆取）
playwright-cli open http://omicsone-cloud-test.bgi.com/config/billingConfig
# ❌ 禁止：自行拼接 TEST_BASE_URL + 路由
$targetUrl = "$baseUrl/config/billingConfig"
```

> **教训记录**：曾因 SKILL 示例写死 `omicsone-cloud-test.bgi.com`、且自行拼接地址，导致测试在错误环境执行。现改为地址直接取自测试文档，不明确则询问用户。

---

## 2.5 安装前置要求（首次使用必读）

> 本 skill 依赖以下组件。**执行测试前必须确认已安装，缺失则先安装再继续**，禁止在缺依赖情况下直接跑 `open` / `run-code`。

### 2.5.1 依赖清单

| 依赖                               | 用途                                                                                     | 版本要求               | 检查命令                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------- | -------------------------- |
| Node.js + npm                      | 运行 playwright-cli（npm 全局包）                                                        | Node ≥ 18 LTS          | `node -v` / `npm -v`       |
| @playwright/cli（playwright-cli）  | 浏览器自动化驱动                                                                         | 最新稳定版             | `playwright-cli --version` |
| Playwright 完整 chromium（GUI 版） | 支撑 `--profile`（persistent）与 `--headed` 登录；`chromium_headless_shell` 不足以持久化 | 随 playwright-cli 安装 | 见 §2.5.2                  |

> **关键说明**：`--profile`（persistent / `launchPersistentContext`）需要**完整 GUI chromium**，`chromium_headless_shell` 无法承载持久化上下文。必须用 `playwright install chromium` 安装完整版（不是仅 headless shell）。本机 `ms-playwright/chromium-*` 目录存在即表示已装。

### 2.5.2 安装步骤（缺失时按序执行）

```powershell
# 1. 安装 playwright-cli（全局）
npm install -g @playwright/cli@latest

# 2. 安装 Playwright 官方 skills（消除版本警告）
playwright-cli install --skills=agents

# 3. 安装完整 chromium（GUI 版，支撑 --profile 与 --headed）
playwright-cli install chromium
```

> 安装后确认：`playwright-cli --version` 正常输出版本；`$env:USERPROFILE\AppData\Local\ms-playwright\chromium-*\chrome-win\chrome.exe` 存在。

### 2.5.3 缺失引导（面向用户）

若检测到依赖缺失，主动提示用户并等待安装完成，**不要静默继续**：

> ⚠️ 检测到 `[xxx]` 未安装。请先执行以下命令安装后再继续测试：
>
> 1. `npm install -g @playwright/cli@latest`
> 2. `playwright-cli install chromium`
>    安装完成后回复"已安装"，我再继续。

---

## 3. 前置检查（指令）

1. `playwright-cli --version` 正常输出 → **跳过 install**；仅命令缺失或版本过旧才 `npm install -g @playwright/cli@latest`。
2. 输出含版本警告框（skill 与 tool 不匹配）→ 执行 `playwright-cli install --skills=agents`（exit code 可能非 0 但实际成功）；输出干净则跳过。
3. 按 §2.1 解析路径变量；确认 `PROFILE_DIR` 目录存在（首启自动创建，首次需手动登录一次），长期复用。
4. 确认 Playwright 完整 chromium 已安装（见 §2.5）；缺失则先 `playwright-cli install chromium` 再继续。
5. 确认 `${ENV_FILE}`（`Tests/.env`）含 `TEST_BASE_URL`、`TEST_USERNAME`、`TEST_PASSWORD`；目标地址按 §2.2 直接取自测试用例文档 §2.1 完整前端入口（不拼接，不明确则询问用户）。
6. 确认 `03-测试用例文档.md`（FT-\* 来源）与模块 `data-testid.snapshot.json`、`02-详细设计文档.md` §7 是否就绪。

---

## 4. 登录态策略

> **设计原则**：登录态由 persistent profile **自动管理**；本 skill 仅调用 `ensureLoginState()` 语义（检查 → 有效则继续 → 无效则提示），**不包含登录实现细节**（验证码处理、Canvas 求解等由项目登录脚本/外部方案负责）。

### 4.1 唯一主选：persistent profile

**只有一种主选方案**——persistent profile。无"方案 A/B/C"分支，避免流程混淆。

```powershell
# 启动（首次需手动登录，后续自动复用登录态）
playwright-cli open --profile="$PROFILE_DIR" --browser=chromium "$targetUrl"

# 验证登录态（ensureLoginState 语义）
playwright-cli eval "() => ({ url: location.href, loggedIn: !location.href.includes('login') })"
```

**`ensureLoginState()` 决策流程**（skill 仅做决策，不做登录实现）：

```
打开页面 → URL 是否含 /login？
  ├─ 否 → 登录态有效，继续执行
  └─ 是 → 登录态失效
        → 关闭 playwright-cli 会话（释放 profile 锁）
        → 启动可见浏览器（--headed 模式，见 §4.1.1）
        → 提示用户手动登录（含验证码），完成后关闭可见浏览器并回复继续
        → 等待用户确认
        → 重新用 playwright-cli 打开页面并验证登录态
        → 仍失效则终止并报告
```

### 4.1.1 登录态失效时打开可见浏览器（--headed 模式，帮用户完成手动登录）

> **本节解决"看不到 playwright-cli 浏览器窗口、无法手动登录"问题**：登录态失效时，主动用 `playwright-cli open --headed` 打开一个**可见的 chromium 窗口**（复用同一 persistent profile），让用户在其中完成账号/验证码登录，而非仅提示"在已打开的浏览器中登录"或依赖外部 msedge。

**触发条件**：`ensureLoginState()` 检测到 URL 含 `/login`（登录态失效）。

**操作流程**：

1. **关闭 playwright-cli 当前（无头）会话**（释放 persistent profile 锁，避免与可见浏览器冲突）：

   ```powershell
   playwright-cli close 2>$null
   ```

2. **用 `--headed` 打开可见 chromium，复用同一 persistent profile**（用户可手动操作）：

   ```powershell
   # --headed：打开可见窗口（非后台无头），用户在里面手动登录
   playwright-cli open --headed --profile="$PROFILE_DIR" --browser=chromium "$targetUrl"
   ```

   > 该命令直接复用 Playwright 已安装的完整 chromium，无需额外定位 msedge.exe。

3. **提示用户**（明确告知操作步骤）：

   > 已打开可见 chromium 浏览器窗口（--headed 模式，复用 persistent profile），请在其中完成以下操作：
   >
   > 1. 输入账号 `${TEST_USERNAME}` / 密码 `${TEST_PASSWORD}` 登录
   > 2. 如遇滑块 / 短信验证码，手动完成验证
   > 3. 确认已成功进入目标页面（URL 不再含 `/login`）
   > 4. **关闭该浏览器窗口**（释放 profile 锁，供 playwright-cli 接管）
   > 5. 回复"继续"

4. **用户确认后**：
   - 确认可见浏览器已关闭（profile 锁释放）
   - 重新用无头模式接管：`playwright-cli open --profile="$PROFILE_DIR" --browser=chromium "$targetUrl"`
   - 重新验证登录态（URL 不含 `/login` → 继续；仍失效 → 终止并报告）

**关键约束**：

- playwright-cli 与可见 chromium **不能同时占用同一 profile 目录**（`__dirlock` 锁冲突）；手动登录前**必须先关闭无头会话**，登录后**必须先关闭可见浏览器**再让 playwright-cli 无头接管。
- `--headed` 仅用于"用户手动登录"这一步；常规自动化执行仍用默认无头模式（更快、更稳、不占屏）。
- 滑块验证码、短信验证码等**只能由用户手动完成**，skill 不尝试自动求解。
- 账号/密码取 `${ENV_FILE}`（`Tests/.env`），禁止硬编码。
- 若 persistent profile 损坏（登录后仍失效），可删除 `${PROFILE_DIR}` 重新创建（首启需重新手动登录）。

### 4.2 重复执行流程

> **本节解决"重复执行登录态"问题**：重复执行**始终**用 persistent profile，token 过期仅提示用户手动登录。

```
首次执行：open --profile → 手动登录 → 执行用例
第二次及后续执行：open --profile → ensureLoginState →
  ├─ 登录态有效 → 直接执行用例（~0-1s）
  └─ 登录态失效 → 提示手动登录 → 等待用户确认 → 继续
```

**硬规则**：

- **禁止**每用例重登；token 过期**不自动重登**，仅提示用户手动登录后继续。
- persistent profile 是唯一主选方案，无降级分支。

### 4.3 约束

- 主选 persistent profile，仅 profile 损坏/CI 回退 storageState（`state-load`/`state-save`）。
- 不硬编码环境地址/账号（取 `${ENV_FILE}`）；全程复用同一会话；profile 路径按 §2.1 解析。

---

## 5. 探索摸底流程（场景二支撑）

### 5.1 数据/字段探测（写操作前必做）

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
  const headers = (
    await page.locator(".el-table__header th .cell").allTextContents()
  )
    .map((h) => h.trim())
    .filter((h) => h);

  // ⚠️ 表头-单元格映射：展开列会导致 td 索引偏移
  // el-table 带 expand-column 时，td 实际数 = 表头数 + 1（idx 1 为展开列空单元格）
  // 因此 nth(N) 对应的表头列 = N-1；须输出首行全部单元格内容确认映射
  const firstRowCells = await page
    .locator(".el-table__row")
    .first()
    .locator("td")
    .allTextContents();
  const cellMapping = firstRowCells.map((c, i) => ({
    tdIndex: i,
    header: headers[i - 1] || "(展开列/空)",
    text: c.trim().substring(0, 20),
  }));

  return JSON.stringify({
    totalRows,
    statusDistribution: statusDist,
    headers,
    headerCount: headers.length,
    tdCount: firstRowCells.length,
    cellMapping,
    expandColumnOffset: firstRowCells.length - headers.length,
  });
};
```

> **⚠️ 展开列索引偏移**：el-table 带行展开（expand-column）时，`.el-table__row td` 实际数量 = 表头列数 + 1——idx 0=序号、idx 1=展开列（空）、idx 2 起=实际数据列。用 `nth(N)` 取单元格时，**目标列的实际 td 索引 = 表头索引 + 1**。探测时必须输出 `cellMapping` 确认映射，禁止凭表头顺序直接推断 td 索引。

**表单字段完整性探测**（写操作用例执行前必须跑，含无 `data-testid` 的必填字段，避免漏填静默失败）：

```javascript
// probe-form-fields.js
async (page) => {
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
  await page
    .locator("[data-testid=billing-cancel-btn]")
    .click()
    .catch(() => {});
  return JSON.stringify(formInfo);
};
```

**判断规则**：前置满足→正常执行；不满足→标记"条件不满足"并记录缺失类型；部分满足→执行可验证部分并标记"部分通过"；写操作用例探测到无 `data-testid` 的必填字段→先记录其定位方式再执行。

### 5.2 维护 data-testid 快照（含无 data-testid 的兜底输出）

用 `snapshot` 打开页面后，把页面真实元素与模块 `data-testid.snapshot.json`（及 `02-详设 §7`）比对，按「设计意图 vs 页面实际」闭环处理：

- 页面有 `data-testid`、快照/§7 有 → 该 `testId` 的 `evidence` 升级为 `page-verified`（`actual.exists:true`）。
- §7 有、页面无 `data-testid` → 计入 `gaps.missingInPage`（可带 `suggestedSelector`），**回推前端补 `data-testid`**；同时用兜底定位完成探索，不卡住。
- 页面有、§7/快照无 → 计入 `gaps.extraInPage`（带 `selector`），回填 §7 与快照。

**无 data-testid 时的兜底与输出**：老页面 / 未接 §7 规范的模块，很多元素没有 `data-testid`，此时不能等 testid，应：

1. 用稳定兜底定位完成交互（优先级）：`getByRole(role,{name})` > `locator`+稳定属性(`aria-label`/`name`/业务 class) > `getByText` > 最后才脆弱 CSS。
2. 在快照 `elements[]` 记 `hasDataTestId:false` + `actual:{ exists:true, selector:<兜底定位> }` + `evidence:page-verified`；缺 testid 的项同时进 `gaps.missingInPage`。
3. 按 §13 标准化输出探索结果清单。

> 兜底定位需标注脆弱度（role/aria 稳定 > 业务 class 稳定 > 纯结构 CSS 脆弱），便于 implementation 决定临时用还是推前端补。快照 schema 见 `ui-automation-bootstrap` / `playwright-test-implementation`，完整字段见方案文档 §14.3。

---

## 6. 功能验证流程（场景一）

### 6.0 探索阶段（执行前必做，结果独立输出）

> **本节解决"功能测试不输出探索结果"问题**：功能测试**不能直接跳到执行**，必须先探索页面结构、验证 data-testid 实现情况，并输出**独立探索文件**到 `${EXPLORATION_DIR}/`。探索结果与测试报告分离，便于跨轮次对比 testid 实现进度。

**探索流程**（写操作用例前必做）：

1. `snapshot` 摸页面结构（首次打开/不熟悉布局必须先 snapshot）。
2. 调固化脚本 `explore-testids.js` 扫描页面全部 `[data-testid]`，按区域（查询区/操作列/弹窗/抽屉/展开区）分组：
   ```powershell
   playwright-cli run-code --filename=${SCRIPTS_DIR}/explore-testids.js
   ```
3. 与 `02-详细设计文档.md` §7（data-testid 清单）逐项比对，标记「✓ 已实现 / ✗ 未实现」。
4. 输出独立探索文件到 `${EXPLORATION_DIR}/data-testid-validation-{模块名}-{YYYYMMDD}.md`（原始 JSON 同存此目录），内容须含：环境信息、分区域比对表、未实现 testid 的兜底定位与风险、完整 testid 清单。
5. 识别未实现 testid → 记录兜底定位（优先级 `getByRole` > 稳定属性 > `getByText` > CSS）→ 后续执行阶段用兜底定位完成交互。
6. 列表数据探测（调 `probe-list.js`）+ 表单字段完整性探测（调 `probe-form-fields.js`，写操作用例必做）。

> **硬规则**：探索文件是功能测试的**强制产出**，非可选。未输出探索文件视为流程未完成（见 §13.3）。

### 6.1 执行阶段

**执行顺序**（降数据污染）：只读用例 → 状态切换 → 新增 → 编辑 → 删除（只删本次新增）。

**命令模式选择**（persistent profile 下）：

| 场景             | 命令模式                                 | 理由                  |
| ---------------- | ---------------------------------------- | --------------------- |
| 探索未知页面     | `snapshot` + ref                         | 可视化 YAML，官方推荐 |
| 单元素点击/填写  | `click "getByTestId('xxx')"` / `fill e5` | 语义化定位，无需写 JS |
| 批量多步骤操作   | `run-code --filename`                    | 单次调用多步骤        |
| 含中文/正则的 JS | `run-code --filename`                    | 规避 PowerShell 转义  |
| 截图             | `screenshot --filename=绝对路径`         | 一行命令              |
| 控制台/网络检查  | `console` / `requests`                   | 官方命令直接输出      |

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

# 截图（必须绝对路径，用 ${SCREENSHOT_DIR} 变量）
playwright-cli screenshot --filename=${SCREENSHOT_DIR}/FORM-003-FAIL.png
```

**混合模式**：探索 `snapshot` → 单元素 `getByTestId` → 批量 `run-code`；调试 `console`/`requests` → 断言挂载监听 `run-code`。

**约束**：首次打开/不熟悉布局必须先 `snapshot`；元素带 `data-testid` 必须优先 `getByTestId`，禁止直接 `querySelector`；调试优先 `console`/`requests`，禁止跳过官方命令直接写监听 JS；截图禁止相对路径。

### 6.2 固化脚本复用（避免重复编写）

> **设计原则**：通用操作（登录态检查、列表探测、表单探测、data-testid 探索、MessageBox 确认、数据清理、文案比对）已固化为可复用脚本，存 `${SCRIPTS_DIR}/`（仅 Persistent Profile 相关），**禁止每次测试重复编写**；测试过程中产生的临时中间脚本存 `${TEMP_SCRIPTS_DIR}/`，测试结束询问用户是否删除。

| 固化脚本                | 用途                                               | 调用方式                                                   |
| ----------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `ensure-login.js`       | 登录态检查（ensureLoginState 语义）                | `run-code --filename=${SCRIPTS_DIR}/ensure-login.js`       |
| `probe-list.js`         | 列表数据探测（数据量/状态/表头）                   | `run-code --filename=${SCRIPTS_DIR}/probe-list.js`         |
| `probe-form-fields.js`  | 表单字段完整性探测（含无 testid 字段）             | `run-code --filename=${SCRIPTS_DIR}/probe-form-fields.js`  |
| `explore-testids.js`    | data-testid 全量探索（按区域分组，通用模板）       | `run-code --filename=${SCRIPTS_DIR}/explore-testids.js`    |
| `messagebox-confirm.js` | MessageBox 确认（原生 JS，处理堆叠）               | `run-code --filename=${SCRIPTS_DIR}/messagebox-confirm.js` |
| `cleanup-disable.js`    | 合同禁用软清理（改 `contractNo` 变量）             | `run-code --filename=${SCRIPTS_DIR}/cleanup-disable.js`    |
| `compare-text.js`       | 文案精确比对（改 `expectedText`+`testidSelector`） | `run-code --filename=${SCRIPTS_DIR}/compare-text.js`       |

**使用规范**：

- 需改参数的脚本在文件顶部有 `===== 修改此处 =====` 标注区
- `compare-text.js` 的 `expectedText` **必须从测试用例文档原文复制**（见 §10）
- `${SCRIPTS_DIR}/`（persistent-profile）为固化脚本，长期保留；临时中间脚本写入 `${TEMP_SCRIPTS_DIR}/`，每轮测试结束列出清单询问用户是否删除；脚本格式以 `}` 结尾无尾随分号
- 模块特定脚本（如 `cleanup-disable.js` 仅适用计费配置）需标注适用范围

---

## 7. 写操作数据管理

- 单次测试最多新增 **10 条**；先探测可复用数据，优先复用；每条新增记录唯一标识到数据清单。
- **只删本次新增**，禁止删原有数据；删除前确认来源，无法区分则不删并标记"条件不满足"。
- 测试结束按分级策略清理：UI 删除 > 禁用软清理 > 恢复初始状态 > 保留+残留预警；允许保留 **≤5 条**（优先失败用例相关数据）。

**测试数据清单**（实时维护，写入最终报告）：

| 序号 | 数据类型 | 唯一标识    | 创建用例 | 创建时间 | 复用情况         | 清理状态         | 保留原因                   |
| ---- | -------- | ----------- | -------- | -------- | ---------------- | ---------------- | -------------------------- |
| 1    | 合同     | HT-TEST-001 | FORM-004 | 14:30    | 编辑(FORM-008)   | 已删除           | —                          |
| 2    | 合同     | HT-TEST-002 | FORM-004 | 14:32    | 失败用例FORM-003 | 已保留           | 失败用例相关，用于缺陷复现 |
| 3    | 合同     | HT-TEST-003 | FORM-004 | 14:35    | 未复用           | 已禁用（软清理） | UI 无删除入口              |

---

## 8. Element Plus 交互模板（persistent profile）

**原则**：`click()` 直接触发 Vue `@click`，**无需 `dispatchEvent`**；仅 **MessageBox** 的 Confirm/Cancel 需 `page.evaluate(() => btn.click())` 原生 JS click（`dispatchEvent` 不触发 Vue handler）。

```javascript
// 8.1 el-select（force click 容器 + 键盘导航选中）
// 注意：Element Plus 新版 placeholder div 会拦截 input 点击，需 force click 容器
async (page) => {
  await page
    .locator("[data-testid=billing-org-name-select]")
    .click({ force: true });
  await page.waitForTimeout(1000);
  // 键盘导航：ArrowDown 选中第一项，Enter 确认
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
};
```

> **el-select 备选方案（evaluate 遍历可见下拉）**：当键盘导航不适用时，可用 evaluate 通过 `offsetParent !== null` 过滤可见下拉（注意：`display !== "none"` 不可靠，搜索表单的隐藏下拉也返回 block）：
>
> ```javascript
> await page.evaluate(() => {
>   for (const dd of document.querySelectorAll(".el-select-dropdown")) {
>     if (dd.offsetParent !== null) {
>       const item = dd.querySelector(
>         ".el-select-dropdown__item:not(.is-disabled)",
>       );
>       if (item) {
>         item.click();
>         return;
>       }
>     }
>   }
> });
> ```

```javascript
// 8.2 el-cascader 多选（点击打开→勾选一/二级节点→点标题关闭）
async (page) => {
  await page.locator(".el-cascader input").first().click();
  await page.waitForTimeout(1000);
  const l1 = page
    .locator(".el-cascader-menu:nth-child(1) .el-cascader-node")
    .first();
  if ((await l1.count()) > 0) {
    await l1.click();
    await page.waitForTimeout(500);
  }
  const l2 = page
    .locator(".el-cascader-menu:nth-child(2) .el-cascader-node")
    .first();
  if ((await l2.count()) > 0) {
    await l2.click();
    await page.waitForTimeout(500);
  }
  await page.locator(".el-dialog__title").click();
  await page.waitForTimeout(300);
};
```

> **⚠️ 级联菜单残留干扰**：第二次级联选择时，`document.querySelectorAll(".el-cascader-menu")` 可能找到上一次残留的隐藏菜单，导致选错节点。**必须用 `offsetParent !== null` 过滤可见菜单**（`display !== "none"` 不可靠，隐藏菜单也返回 block）：
>
> ```javascript
> // ✅ 正确：过滤可见级联菜单
> await page.evaluate(() => {
>   const menus = Array.from(
>     document.querySelectorAll(".el-cascader-menu"),
>   ).filter((m) => m.offsetParent !== null);
>   if (menus.length > 0) {
>     menus[0].querySelector(".el-cascader-node:not(.is-disabled)")?.click();
>   }
> });
> ```
>
> **多配额行选择不同套餐**：避免多行选相同套餐导致冲突，按行索引选不同级联节点。

```javascript
// 8.3 el-date-range-picker（force click 打开→evaluate 点击左右面板可用日期）
// 注意：Playwright locator 定位日历单元格常失败，改用 evaluate 原生 click
async (page) => {
  await page.locator(".el-date-editor").first().click({ force: true });
  await page.waitForTimeout(1500);
  // 左面板（开始日期）— 类名 .is-left，非 :nth-child
  await page.evaluate(() => {
    const left = document.querySelector(
      ".el-date-range-picker__content.is-left",
    );
    if (left) {
      const c = left.querySelector("td.available");
      if (c) c.click();
    }
  });
  await page.waitForTimeout(500);
  // 右面板（结束日期）— 类名 .is-right
  await page.evaluate(() => {
    const right = document.querySelector(
      ".el-date-range-picker__content.is-right",
    );
    if (right) {
      const c = right.querySelector("td.available");
      if (c) c.click();
    }
  });
  await page.waitForTimeout(800);
  // 点击弹窗标题关闭可能残留的日期面板
  await page
    .locator(".el-dialog__title")
    .click()
    .catch(() => {});
  await page.waitForTimeout(500);
};
```

```javascript
// 8.4 MessageBox（必须原生 JS click）
async (page) => {
  await page.evaluate(() => {
    for (const btn of document.querySelectorAll(".el-messagebox button")) {
      if (btn.textContent.trim() === "Confirm") {
        btn.click();
        return;
      }
    }
  });
};
```

> **MessageBox 定位提示**：当 `getByRole('button', {name:'关闭'})` 报 strict mode violation（多个元素匹配）时，优先用 `snapshot` 找到确认按钮的 `ref`（如 `f1e2400`），再 `playwright-cli click f1e2400`，避免用模糊 name 定位。

```javascript
// 8.5 残留遮罩清理（跨脚本执行必做）
// 问题：run-code 脚本完成后弹窗可能未完全关闭（动画进行中/关闭失败），
//   .el-overlay-dialog 遮罩层拦截 pointer events，导致下一脚本 click 超时 30s。
// 解决：每脚本开头重载页面 + 强制清理残留遮罩
async (page) => {
  // 1. 重载页面（最可靠，清除 Vue 弹窗状态）
  await page.goto(page.url());
  await page.waitForTimeout(2000);

  // 2. 若仍残留，原生 click 取消按钮 + 移除遮罩
  await page.evaluate(() => {
    const cancelBtn = document.querySelector(
      "[data-testid=billing-cancel-btn]",
    );
    if (cancelBtn) cancelBtn.click();
  });
  await page.waitForTimeout(500);

  // 3. 兜底：移除所有残留 overlay（慎用，仅在上述无效时）
  await page.evaluate(() => {
    document.querySelectorAll(".el-overlay").forEach((o) => {
      if (o.style.display !== "none") o.remove();
    });
  });
  await page.waitForTimeout(300);
};
```

> **何时用**：每个 `run-code --filename` 脚本开头（跨脚本执行时）；连续测试间弹窗状态可能残留。也可用 `playwright-cli press Escape` 作为轻量清理，但不如原生 click 可靠。

---

## 9. 失败诊断

**写操作失败先查网络请求**（区分前端校验阻止 vs 后端拒绝）：

```javascript
// 提交前挂载监听，提交后检查
async (page) => {
  const captured = [];
  const handler = (req) => {
    if (req.url().includes("contract") && !req.url().includes("contract/page"))
      captured.push({
        url: req.url(),
        method: req.method(),
        body: req.postData(),
      });
  };
  page.on("request", handler);
  const beforeRows = await page.locator(".el-table__row").count();
  await page.locator("[data-testid=billing-confirm-btn]").click();
  await page.waitForTimeout(2000);
  const afterRows = await page.locator(".el-table__row").count();
  page.off("request", handler);
  const messages = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".el-message__content")).map((m) =>
      m.textContent.trim(),
    ),
  );
  return JSON.stringify({
    beforeRows,
    afterRows,
    capturedRequests: captured,
    messages,
    requestSent: captured.length > 0,
    rowAdded: afterRows > beforeRows,
  });
};
```

**DOM 状态捕获**（弹窗/错误/按钮）：

> **⚠️ 可见性判断硬规则**：Element Plus 的 overlay/drawer/dialog 关闭时，**父级 `.el-overlay` 的 `display` 变为 `none`，而子元素（`.el-drawer`/`.el-dialog`）自身的 `display` 仍为 `flex`**。因此**禁止**用 `getComputedStyle(el).display` 单独判断目标元素可见性——必须用 `page.locator(...).isVisible()`（自动处理父元素隐藏链，等价于人眼判断）。详见 `${REPORT_DIR}/测试过程问题经验总结.md` §6.1。

```javascript
// ✅ 正确：isVisible() 判断可见性（evaluate 只取文本/DOM 信息，可见性交给 Playwright）
async (page) => {
  const dialogVisible = await page
    .locator(".el-dialog")
    .isVisible()
    .catch(() => false);
  const drawerVisible = await page
    .locator("[data-testid=billing-detail-drawer], .el-drawer")
    .first()
    .isVisible()
    .catch(() => false);
  const state = await page.evaluate(() => {
    const dialog = document.querySelector(".el-dialog");
    return {
      url: location.href,
      dialogTitle:
        dialog?.querySelector(".el-dialog__title")?.textContent?.trim() || "",
      formErrors: Array.from(
        document.querySelectorAll(".el-form-item__error"),
      ).map((e) => e.textContent.trim()),
      toastMessages: Array.from(
        document.querySelectorAll(".el-message__content"),
      ).map((m) => m.textContent.trim()),
    };
  });
  return JSON.stringify({ dialogVisible, drawerVisible, ...state });
};

// ❌ 禁止：getComputedStyle(dialog).display !== "none"
//   Element Plus 关闭弹窗时 .el-overlay display:none，.el-dialog display 仍为 flex → 误判
```

**原因分类**：元素未找到 / 不可交互 / 断言不匹配 / 超时 / 前置不满足 / 网络错误(4xx,5xx) / **前端校验阻止(API 未发出)**。

> **⚠️ 错误消息位置（硬规则）**：Element Plus 表单校验错误可能出现在**两个位置**，必须同时检查：
>
> - **toast 消息**（`.el-message__content`）：配额行校验（如"第 X 行检测项目及产品套餐必填"）**仅出现在 toast**，不在 `.el-form-item__error`。
> - **行内错误**（`.el-form-item__error`）：必填字段校验（如"请选择机构名称"）出现在行内。
>
> 仅检查 `.el-form-item__error` 会遗漏所有配额行校验错误，导致用例误判为"无错误"。错误收集函数应合并两个来源：
>
> ```javascript
> const errors = await page.evaluate(() => {
>   const toasts = Array.from(
>     document.querySelectorAll(".el-message__content"),
>   ).map((m) => m.textContent.trim());
>   const formErrors = Array.from(
>     document.querySelectorAll(".el-form-item__error"),
>   ).map((e) => e.textContent.trim());
>   return [...toasts, ...formErrors];
> });
> ```
>
> **toast 消失时机**：el-message 默认 3s 后自动关闭，提交后需在 ~1.5s 内检查；连续测试间等待 3s+ 让 toast 消失，避免串扰。

---

## 10. 文案精确比对

校验类用例**必须逐字比对**实际与预期文案；比对在 JS 文件内完成（浏览器编码正确，规避 PowerShell 中文损坏），任何差异即不通过。

> **⚠️ 预期文案来源（硬规则）**：`expectedText` **必须从测试用例文档（`03-测试用例文档.md`）原文复制**，禁止从本 skill 示例、记忆、历史会话取。曾因 SKILL 示例硬编码错误预期值导致 FORM-003 误报（详见 `${REPORT_DIR}/测试过程问题经验总结.md`）。

```javascript
// 文案比对必须在 JS 内完成；expectedText 必须取自测试用例文档原文
async (page) => {
  // expectedText 必须从 03-测试用例文档.md 对应用例行复制，禁止手敲或从 skill 取
  const expectedText = "<从测试用例文档复制预期文案>";
  const testidSelector = "billing-contract-no-input"; // 按实际 testid 修改
  const input = await page
    .locator(`[data-testid=${testidSelector}]`)
    .elementHandle();
  const formItem = await input.evaluateHandle((el) =>
    el.closest(".el-form-item"),
  );
  const actualMsg = await formItem.evaluate((fi) => {
    const e = fi.querySelector(".el-form-item__error");
    return e ? e.textContent.trim() : "";
  });
  return JSON.stringify({
    expected: expectedText,
    actual: actualMsg,
    match: actualMsg === expectedText,
    source: "expectedText 来源：测试用例文档原文",
  });
};
```

**也可直接调用固化脚本**：`playwright-cli run-code --filename=${SCRIPTS_DIR}/compare-text.js`（修改文件顶部 `expectedText` 与 `testidSelector`）。

**禁止**：只用关键词包含判断；文案不一致仍判通过；忽略差异仅因"功能已生效"；**从 SKILL 示例或记忆取预期文案**。

---

## 11. PowerShell 转义陷阱（必读）

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

> **`run-code --filename` 尾随分号陷阱**：写入的 `.js` 文件若以 `};\r\n` 结尾会触发 `SyntaxError: Unexpected token ';'`。写入后用 `[System.IO.File]::WriteAllText` 确保**以 `}` 结尾、无尾随分号、无 BOM**。

---

## 12. 截图与过程产物

- 默认**每用例必截**（成功/失败均截），除非用户说明不需要；文件名绝对路径 `{用例}-{描述}-{SUCCESS|FAIL}.png`，存 `${SCREENSHOT_DIR}`。
- 测试报告存 `${REPORT_DIR}/reports/`；探索结果存 `${EXPLORATION_DIR}/`；**所有测试输出统一存 `${REPORT_DIR}/` 下，禁止散落他处**。
- 固化脚本（仅 Persistent Profile 相关）存 `${SCRIPTS_DIR}/`，长期保留；临时中间脚本存 `${TEMP_SCRIPTS_DIR}/`，**每轮测试结束列出 temp/ 清单询问用户是否删除**（全删/保留部分/全保留）。
- 每轮测试结束更新 `${REPORT_DIR}/测试过程问题经验总结.md`（记录新发现问题与经验教训）。

---

## 13. 探索结果输出标准化

> **本节解决"结果输出不统一"问题**：无论场景一（功能验证）还是场景二（探索摸底），执行后均须按本节 schema 输出标准化结果，确保完整、清晰、可追溯。

### 13.1 统一输出文件

所有探索/验证结果输出到 **`${EXPLORATION_DIR}/`** 目录，按场景区分命名：

- **功能测试探索文件**（场景一，§6.0 强制产出）：`data-testid-validation-{模块名}-{YYYYMMDD}.md`，原始探测 JSON 同存此目录（`explore-testids-raw-{模块名}-{YYYYMMDD}.json`）。
- **探索摸底结果**（场景二）：`探索结果-{模块名}-{YYYYMMDD}.md`（schema 固定，见下方）。

```markdown
# 探索结果清单 - {模块名}（{YYYY-MM-DD}）

## 1. 环境信息

| 项       | 值                                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| 测试地址 | {测试用例文档 §2.1 完整前端入口，如 http://localhost:7001/config/billingConfig}（来源：测试用例文档 §2.1） |
| 登录态   | persistent profile（${PROFILE_DIR}）                                                                       |
| 执行日期 | YYYY-MM-DD                                                                                                 |

## 2. 页面元素清单

| 序号 | 元素语义 | data-testid        | 兜底定位                          | 脆弱度 | 验证状态      | 建议                 |
| ---- | -------- | ------------------ | --------------------------------- | ------ | ------------- | -------------------- |
| 1    | 查询按钮 | billing-search-btn | getByRole('button',{name:'查询'}) | 稳定   | page-verified | —                    |
| 2    | 状态标签 | (无)               | .el-tag                           | 脆弱   | page-verified | 推前端补 data-testid |

## 3. data-testid 缺口（gaps）

- missingInPage：§7 有、页面无 → [列表]
- extraInPage：页面有、§7 无 → [列表]

## 4. 前置数据探测

| 探测项 | 实际值 | 影响用例 | 是否满足 |
| ------ | ------ | -------- | -------- |

## 5. 用例执行结果（场景一）/ 探索结论（场景二）

| 用例编号 | 结果 | 实际证据 |
| -------- | ---- | -------- |

## 6. 缺陷/问题清单

| 编号 | 关联用例 | 描述 | 修复建议 |
| ---- | -------- | ---- | -------- |
```

### 13.2 脆弱度标注规范

| 脆弱度 | 定位方式                                   | 示例                                 |
| ------ | ------------------------------------------ | ------------------------------------ |
| 稳定   | `getByRole` / `data-testid` / `aria-label` | `getByTestId('billing-confirm-btn')` |
| 中等   | 业务 class + 文本                          | `.el-button--primary` + 文本"确定"   |
| 脆弱   | 纯结构 CSS / nth-child                     | `.el-table__row td:nth-child(7)`     |

### 13.3 输出强制规则

- 场景一（功能验证）：输出用例执行结果表 + 缺陷清单 **+ 探索结果独立文件**（data-testid 验证，见 §6.0）。
- 场景二（探索摸底）：输出元素清单 + data-testid 缺口。
- 两种场景均须输出环境信息（含地址来源）和前置数据探测。
- **探索文件是功能测试的强制产出**（非可选）；未输出探索文件视为流程未完成。
- **禁止**省略环境信息或地址来源标注。

---

## 14. 约束（硬规则）

- **地址**：测试目标地址直接取自测试用例文档 §2.1 完整前端入口（不明确则询问用户）；禁止硬编码任何环境地址；禁止自行拼接 `TEST_BASE_URL`+路由。
- **路径**：所有路径按 §2.1 变量解析；`.env` 取 `${ENV_FILE}`（`Tests/.env`）；禁止硬编码 `D:\AIauto` 等绝对路径。
- **登录态**：主选 persistent profile（唯一主选，无降级分支）；禁止每用例重登；token 过期不自动重登，按 §4.1.1 打开可见浏览器让用户手动登录。
- 禁止重复执行安装命令（`--version` 正常即跳过）。
- 禁止 `networkidle` 等待，改用 DOM 可见性断言。
- 禁止关键词包含判文案；禁止文案不一致判通过；禁止凭空编造数据（先探测）。
- **禁止从 SKILL 示例或记忆取预期文案**；预期文案必须取自测试用例文档原文。
- 禁止删原有数据；禁止新增 >10；禁止保留 >5（优先失败用例数据）。
- 禁止跳过截图（除非用户说明）；禁止相对路径截图。
- 写操作用例禁止跳过表单字段完整性探测；写操作失败禁止不查网络请求。
- 临时中间脚本存 `${TEMP_SCRIPTS_DIR}/`，每轮测试结束询问用户是否删除；禁止忽略官方 skill 版本警告。
- 含中文/正则/CSS 选择器的 JS 禁止 `eval` 内联，必须 `run-code --filename`。
- 探索禁止跳过 `snapshot`；单元素带 `data-testid` 禁止跳过 `getByTestId`；调试禁止跳过 `console`/`requests`。
- 禁止 `dispatchEvent("click")` 触发 Vue（persistent profile 下 `click()` 直接触发；仅 MessageBox 用原生 `btn.click()`）。
- **禁止用 `getComputedStyle(el).display` 判断 Element Plus overlay/drawer/dialog 可见性**（关闭时父级 `.el-overlay` display:none、子元素 display 仍为 flex → 误判）；必须用 `page.locator(...).isVisible()`。
- 探索/验证结果必须按 §13 标准化输出，禁止省略环境信息与地址来源。
- **禁止测试输出散落他处**；所有报告/截图/探索/脚本统一存 `${REPORT_DIR}/` 下对应子目录。
- **禁止重复编写固化脚本**；通用操作优先调用 `${SCRIPTS_DIR}/` 已有脚本（见 §6.2）。

---

## 15. 完成前自检

- [ ] 跳过已安装的 playwright-cli 重复安装；消除官方 skill 版本警告
- [ ] 测试目标地址直接取自测试用例文档 §2.1 完整前端入口（未硬编码、未拼接；不明确已询问用户）
- [ ] 所有路径按 §2.1 变量解析；`.env` 取 `${ENV_FILE}`（`Tests/.env`）（未硬编码 `D:\AIauto`）
- [ ] 用 persistent profile（路径按变量解析），全程复用同一会话
- [ ] 重复执行时始终用 persistent profile（唯一主选），token 过期时按 §4.1.1 打开可见浏览器让用户手动登录（非仅文字提示）
- [ ] 已探测列表数据 + 写操作用例已做表单字段完整性探测（含无 testid 字段）
- [ ] 每条用例有明确结果；校验类逐字比对文案并记录预期 vs 实际
- [ ] **预期文案取自测试用例文档原文**（未从 SKILL 示例或记忆取）
- [ ] 失败用例已捕获截图/DOM/网络请求/原因分类
- [ ] `click()` 触发 Vue（非 dispatchEvent）；MessageBox 用原生 `btn.click()` 或 snapshot ref
- [ ] 弹窗/抽屉可见性用 `page.locator(...).isVisible()` 判断（非 `getComputedStyle(display)`）
- [ ] 截图绝对路径、带 SUCCESS/FAIL 标识、存 `${SCREENSHOT_DIR}`
- [ ] 已维护测试数据清单（清理状态 + 保留原因）；新增 ≤10、保留 ≤5
- [ ] 测试结束按分级策略清理；报告按 §13 标准化输出且非通过用例有详解
- [ ] **所有输出统一存 `${REPORT_DIR}/` 下**（报告/截图/探索/脚本各归其位）
- [ ] **通用操作调用固化脚本**（`${SCRIPTS_DIR}/`，仅 Persistent Profile 相关），未重复编写
- [ ] 已更新 `${REPORT_DIR}/测试过程问题经验总结.md`
- [ ] 临时中间脚本已列出 `${TEMP_SCRIPTS_DIR}/` 清单并询问用户是否删除（固化脚本保留）
- [ ] 探索用 `snapshot`、单元素优先 `getByTestId`、中文/正则 JS 用 `run-code`
- [ ] 调试优先 `console`/`requests`；截图用绝对路径
- [ ] 探索/验证结果按 §13 输出（含环境信息 + 地址来源）；**功能测试已输出 data-testid 验证独立文件**（§6.0，存 `${EXPLORATION_DIR}/`）
