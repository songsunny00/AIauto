# 完成前自检清单

> 本文件从 `playwright-test-implementation` SKILL §12 拆出，供提交/回归前逐项核对。
> 每项须有明确「是/否」依据，不允许「大概」「应该」。

## 1. 目录与命名

- [ ] 沿用了现有目录与命名模式，未平行再造一套脚本。
- [ ] spec 命名为 `ATS-{一级模块}-{二级模块}-{功能域}-{起始用例号}.spec.ts`，未自由命名。
- [ ] `03` 中嵌入 FT/IT 表格的 `ET-*` 异常用例实现在**同源功能 spec** 内，未遗漏、未另立 `-ERR-` 文件。
- [ ] `FT-*` / `ET-*` / `ATS-*` 编号主线保留，新增用例按同模块同功能域延展。

## 2. 鉴权与数据

- [ ] 使用了 `globalSetup + storageState` 复用登录态，未每条用例单独登录。
- [ ] 测试数据收敛到 `data/*.data.ts`，未在 spec 内散落字面量。
- [ ] 环境地址/账号/密码走 `Tests/.env`，未硬编码（`.env` 在 `Tests/` 级，非 `ui-automation/`）。
- [ ] 写操作场景考虑了数据清理 / 隔离 / 唯一标识，未污染后续用例。
- [ ] `test.skip(reason)` 基于实际数据检查，非静态假设。

## 3. 定位与等待

- [ ] 优先用 `data-testid` 或稳定语义定位，未首选脆弱 CSS class / 纯文本。
- [ ] 未把 `networkidle` 当主要等待手段（改用元素可见 / loading 消失 / `waitForResponse` / `expect.poll`）。
- [ ] 未用 `force: true` 掩盖本应 disabled / hidden / 不可提交的问题。
- [ ] 复杂控件（级联 / 下拉 / 日期 / MessageBox）优先用了 `helpers/element-plus.ts` 现成函数（详见 `reference/helpers-api.md`）。

## 4. 断言

- [ ] 文案类断言在需求已明确时用**完整文案精确匹配**，非宽松关键词包含。
- [ ] 行为类断言验证了真实行为（翻页 / 缓存复用 / 汇总口径 / 写操作结果），非仅「组件存在」。
- [ ] `03` 预期结果逐字列出的字段名/列名/文案，脚本对每一项有对应断言（表格列读表头、区块读字段标签、文案用常量精确匹配），未用「行数≥0」「可见」「存在」代理替代（防「用例有、脚本没测」）。
- [ ] 写操作 / 启停 / 状态变化验证了真实结果（接口 + 页面反馈 + 数据变化），非仅 toast。
- [ ] 成功类场景用了组合断言（关键接口 + `retCode === 0` + 弹窗关闭 + 列表变化，至少之一）。

## 5. data-testid 知识库

- [ ] 新增/变更的 `data-testid` 回写到了模块 `data-testid.snapshot.json`，未仅分散在 page 对象。
- [ ] 实现时优先从快照 `elements` 取 `testId` 并核对 `evidence`，页面新发现的标记 `page-verified`。

## 6. 执行与报告（核心硬规则）

- [ ] 执行测试经 `run.mjs` / `run-report.mjs`（或 `npm test` / `npm run test:report`），**未 `npx playwright test` 裸跑**（裸跑不注入 `TEST_DOMAIN_PATH`，config 直接报错）。
- [ ] 新增模块时**零改 `playwright.config.ts`**（未复制 config 到二级模块、未硬编码模块目录名）。
- [ ] 未把执行/报告链路三件套（`run.mjs` / `run-report.mjs` / `gen-report.mjs` / `report-template.md`）下沉或复制到二级模块。
- [ ] 首次执行前已 `npx playwright install` 装浏览器二进制（否则 `auth:capture` / 测试报 `Executable doesn't exist`）。
- [ ] 报告落到正确粒度路径：单二级模块 → `test-reports/<一级模块>/<二级模块>/`；一级模块全量 → `test-reports/<一级模块>/all-modules/`；`execution-digest.json` 与 `TEST-REPORT.md` 同在此目录。
- [ ] 脚本就绪后完成了「执行 → digest → AI 报告」三步收尾，`TEST-REPORT.md` 已由 Agent 覆盖机械版（方式 B，详见 `templates/report-generation-prompt.md`）。
- [ ] 失败用例归因只取 `ENV / DATA / SCRIPT / DEFECT / CHANGE` 五类之一（详见 `reference/failure-attribution.md`），未把 `retCode != 0` 误归「定位器没找到」。

## 7. 影响范围

- [ ] 改动后先回归了最小受影响 spec，再决定是否扩大范围。
- [ ] 保留了失败工件（screenshot / trace / error-context）。
- [ ] 未引入与当前需求无关的重构。
