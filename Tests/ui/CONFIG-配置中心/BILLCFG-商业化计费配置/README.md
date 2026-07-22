# 商业化计费配置 - UI 自动化测试

## 测试概览

| 字段     | 值                                                                                   |
| -------- | ------------------------------------------------------------------------------------ |
| 测试版本 | V1.6.1-R1                                                                            |
| 测试环境 | 通过 `Tests/ui/.env` 配置（见 `Tests/ui/.env.example`）                                |
| 测试账号 | 通过 `Tests/ui/.env` 配置（admin 角色，菜单权限含 `menuId=11013`）                    |
| 测试工具 | Playwright                                                                           |
| 覆盖模块 | 配置中心 / 商业化计费配置                                                            |
| 方案文档 | [billing-config-automation-plan.md](../../../docs/billing-config-automation-plan.md) |

## 目录结构

```text
Tests/ui/
├─ package.json                                  # UI 自动化共享依赖入口 + npm scripts
├─ run.mjs                                       # 跨平台执行脚本（一级模块必传、二级模块可选）
├─ playwright.config.ts                          # UI 共享 Playwright 配置入口（动态 testDir/报告）
├─ global-setup.ts                               # UI 共享登录态生成（一级模块级）
├─ .env                                          # UI 共享环境与账号（不入库，见 .env.example）
├─ .env.example                                  # UI 共享配置模板
├─ .auth/                                        # UI 共享 storageState
│  └─ <一级模块>/domain-state.json               # 一级模块共享登录态（如 CONFIG-配置中心/domain-state.json）
├─ test-reports/                                 # UI 共享报告输出目录（不入库）
│  └─ <一级模块>/
│     ├─ all-modules/{html,junit.xml,artifacts}  # 一级模块全量运行报告
│     └─ <二级模块>/{html,junit.xml,artifacts}   # 单二级模块运行报告
└─ CONFIG-配置中心/
   └─ BILLCFG-商业化计费配置/
      ├─ specs/
      │  ├─ ATS-CONFIG-BILLCFG-LIST-001.spec.ts  # 列表查询与默认加载 + 登录权限
      │  ├─ ATS-CONFIG-BILLCFG-LIST-002.spec.ts  # 合同列表展示与展开明细
      │  ├─ ATS-CONFIG-BILLCFG-LIST-003.spec.ts  # 合同状态展示与启停控制
      │  ├─ ATS-CONFIG-BILLCFG-FORM-001.spec.ts  # 新增合同配置
      │  ├─ ATS-CONFIG-BILLCFG-FORM-002.spec.ts  # 编辑合同配置
      │  └─ ATS-CONFIG-BILLCFG-DETAIL-001.spec.ts# 明细抽屉查看
      ├─ fixtures/
      │  └─ billing.fixture.ts                   # 模块登录态 fixture（authedPage）
      ├─ data/
      │  └─ billing.data.ts                      # 测试数据集中管理
      ├─ pages/
      │  └─ billing.page.ts                      # 页面对象（26 个 data-testid 定位）
      ├─ snapshots/                              # 页面结构快照（可选）
      └─ README.md
```

## 用例覆盖清单

| 文件                                    | 覆盖用例                                                  | 优先级   |
| --------------------------------------- | --------------------------------------------------------- | -------- |
| `ATS-CONFIG-BILLCFG-LIST-001.spec.ts`   | `PT-BILLCFG-001~003`；`FT-BILLCFG-LIST-001~004, 011, 016` | P0/P1    |
| `ATS-CONFIG-BILLCFG-LIST-002.spec.ts`   | `FT-BILLCFG-LIST-005~007, 012, 015`                       | P0/P1    |
| `ATS-CONFIG-BILLCFG-LIST-003.spec.ts`   | `FT-BILLCFG-LIST-008~010, 013, 014`                       | P0/P1    |
| `ATS-CONFIG-BILLCFG-FORM-001.spec.ts`   | `FT-BILLCFG-FORM-001~005, 009~014, 018`                   | P0/P1    |
| `ATS-CONFIG-BILLCFG-FORM-002.spec.ts`   | `FT-BILLCFG-FORM-006~008, 015, 016`                       | P0/P1    |
| `ATS-CONFIG-BILLCFG-DETAIL-001.spec.ts` | `FT-BILLCFG-DETAIL-001~006`                               | P0/P1/P2 |

**总用例数：39 个 FT + 3 个 PT（其余 PT/ET 需接口或手工补充）**

## 编号主线

```text
REQ-CONFIG-BILLCFG-{LIST/FORM/DETAIL}-{NNN}
 ├─ FT-BILLCFG-{NNN}  → ATS-CONFIG-BILLCFG-{NNN}.spec.ts
 ├─ IT-BILLCFG-{NNN}  → ATS-CONFIG-BILLCFG-{NNN}.api.spec.ts（接口侧，另行实施）
 └─ PT-BILLCFG-{NNN}  → 合并至对应 REQ 的 spec
```

## data-testid 覆盖

本模块 Page Object（`pages/billing.page.ts`）封装了 26 个 `data-testid` 稳定定位，命名规范 `billing-{区域}-{元素}-{序号}`：

| 区域          | 命名前缀                                                               | 数量 | 示例                        |
| ------------- | ---------------------------------------------------------------------- | ---- | --------------------------- |
| 查询区        | `billing-search-*`                                                     | 5    | `billing-search-inst-code`  |
| 主列表操作    | `billing-add-tenant-btn`、`billing-row-*-btn-{i}`                      | 4    | `billing-row-edit-btn-0`    |
| 展开明细      | `billing-expand-table`                                                 | 1    | `billing-expand-table`      |
| 新增/编辑弹窗 | `billing-edit-dialog`、`billing-*-input/select`、`billing-quota-*-{i}` | 14   | `billing-contract-no-input` |
| 明细抽屉      | `billing-detail-drawer`、`billing-detail-close-btn`                    | 2    | `billing-detail-drawer`     |

## 前置条件

确认以下测试数据已在环境中初始化（对应 `03-测试用例文档.md` §2.3）：

1. 至少 2 个启用机构，用于查询筛选与新增弹窗机构下拉。
2. 至少 2 个检测项目；每个项目至少 1 个产品套餐。
3. 合同状态数据：`NORMAL`、`EXPIRING_SOON`、`EXPIRED`、`DISABLED` 各 1 条。
4. 编辑态数据：`hasConsumed=false` 合同 1 条；`hasConsumed=true` 合同 1 条。
5. 用量与历史数据：有 `CONFIRMED` 消耗记录的合同、有 `EDIT` 历史的合同。
6. 边界校验数据：同机构下已存在的 `contractNo`、某配额行 `usedCount > 0` 的合同。

## 运行方式

### 安装依赖（首次）

```powershell
cd d:\AIauto\Tests\ui
npm install
# 使用系统 Edge/Chrome 时无需下载；如需 Playwright 自带 chromium：
npm run test:install
```

### 配置环境与账号

复制 `Tests/ui/.env.example` 为 `Tests/ui/.env`，填入实际值：

```powershell
cd d:\AIauto\Tests\ui
Copy-Item .env.example .env
# 编辑 .env 填入 TEST_BASE_URL、TEST_USERNAME、TEST_PASSWORD、PW_BROWSER_CHANNEL
```

`Tests/ui/.env` 已在 `Tests/ui/.gitignore` 中忽略，不会入库。

> 说明：`PW_BROWSER_CHANNEL` 留空使用 Playwright 自带 chromium；设 `msedge` 使用系统 Edge（无需额外下载浏览器）。

### 执行边界

- 一次执行只面向**一个一级模块**（`TEST_DOMAIN_PATH` 必传）。
- 在锁定一级模块后，可跑该一级模块下**全部二级模块**，或只跑**某个二级模块**（`TEST_MODULE_PATH` 可选）。

### 执行测试（推荐：跨平台脚本）

`run.mjs` 会屏蔽 Windows / Bash 设置中文环境变量的差异：

```powershell
cd d:\AIauto\Tests\ui

# 跑一级模块下全部二级模块
node run.mjs --domain CONFIG-配置中心

# 只跑某个二级模块
node run.mjs --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置

# 只跑单个 spec 文件（-- 之后为透传给 playwright 的参数）
node run.mjs --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置 -- specs/ATS-CONFIG-BILLCFG-LIST-001.spec.ts

# 仅列出用例（discovery）
node run.mjs --domain CONFIG-配置中心 --list
node run.mjs --domain CONFIG-配置中心 --module BILLCFG-商业化计费配置 --list
```

### 执行测试（原生 playwright 命令）

**PowerShell：**

```powershell
$env:TEST_DOMAIN_PATH = 'CONFIG-配置中心'
$env:TEST_MODULE_PATH = 'BILLCFG-商业化计费配置'
npx playwright test --config=playwright.config.ts
```

**Bash / Git Bash：**

```bash
TEST_DOMAIN_PATH=CONFIG-配置中心 TEST_MODULE_PATH=BILLCFG-商业化计费配置 npx playwright test --config=playwright.config.ts
```

### 查看报告

```powershell
# 单二级模块运行报告
npx playwright show-report d:\AIauto\Tests\ui\test-reports\CONFIG-配置中心\BILLCFG-商业化计费配置\html

# 一级模块全量运行报告
npx playwright show-report d:\AIauto\Tests\ui\test-reports\CONFIG-配置中心\all-modules\html
```

## 定位与等待策略

| 优先级 | 方式                  | 示例                                         |
| ------ | --------------------- | -------------------------------------------- |
| 1      | `getByTestId`（首选） | `page.getByTestId('billing-search-status')`  |
| 2      | `getByRole + name`    | `page.getByRole('button', { name: '查询' })` |
| 3      | 稳定属性              | `.el-tag--success`、`.el-table__row`         |
| 4      | 脆弱 CSS（最后）      | 仅用于无 `data-testid` 的辅助元素            |

关键等待策略：

- 弹窗打开：`editDialog` 可见 + `.el-loading-mask` 计数为 0
- 级联选择：`el-cascader-menu:visible` 可见后点选项
- 提示消息：`.el-message:visible` 含文案
- 网络等待：`waitForLoadState('networkidle')`

## 已知限制与 TODO

| 项                 | 说明                                                   | 关联用例       |
| ------------------ | ------------------------------------------------------ | -------------- |
| `Promise.all` 耦合 | `onMounted` 任一选项接口失败导致主表不加载             | `ET-011`       |
| 汇总计算口径冲突   | 详设按 `lines[]` 聚合 vs 需求按用量明细求和，未解决    | `DETAIL-004`   |
| 只读态数据缺失     | 需准备 `hasConsumed=true` 合同                         | `FORM-007/015` |
| 术语变更未同步     | `合同编号`→`合同编码` 在 `01-需求文档.md` 中未全量统一 | 全模块         |

## 报告字段（执行后回填）

| 字段     | 值                           |
| -------- | ---------------------------- |
| 报告版本 | V1.6.1-R1                    |
| 测试环境 | 见 `Tests/ui/.env` 中 `TEST_BASE_URL` |
| 用例总数 | 42（39 FT + 3 PT）           |
| 通过数   | {}                           |
| 失败数   | {}                           |
| 阻塞数   | {}                           |
| 风险结论 | {}                           |

## 注意事项

1. 测试前需确认 `Tests/ui/.env` 中 `TEST_BASE_URL` 指向的目标环境可访问。
2. 多选查询字段（`instCode`、`projectCode`、`productNo`）以逗号分隔字符串传递；`displayStatus` 为下拉单选，直接传递单值。
3. 元素选择器基于 Element Plus 组件库，若 UI 框架定制需调整 `pages/billing.page.ts`。
4. `FORM-007/015/DETAIL-002/003` 等用例依赖特定数据，缺失时以 `test.skip` 跳过。
5. 网络较慢时可适当调整 `Tests/ui/playwright.config.ts` 中的 `timeout` 值。
6. 结果回填至 `Prds/V1.6.1/04-测试执行记录.md` 与模块级 `TRACE.yaml`。
