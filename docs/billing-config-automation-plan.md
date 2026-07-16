# 商业化计费配置 - UI 自动化与接口自动化测试方案（完整版）

## 1. 文档定位

本文档是 `配置中心 / 商业化计费配置` 模块（版本 `V1.6.1`）的自动化测试专项完整方案，把该模块的 UI 自动化与接口自动化收敛为一份可落地、可汇报、可实施的模块级方案。

本文档是 [ai-playwright-automation-plan-full.md](ai-playwright-automation-plan-full.md) 在 `BILLCFG` 模块上的具体化落地，口径与总方案保持一致，重点解决四类问题：

1. `BILLCFG` 模块的 UI 自动化和接口自动化如何放到同一条 `REQ-CONFIG-BILLCFG-*` 主线里。
2. 自动化资产如何和 `FT-BILLCFG-*` / `IT-BILLCFG-*` / `ATS-CONFIG-BILLCFG-*` 编号、测试执行记录、缺陷修复记录形成闭环。
3. 一期为什么在该模块推荐 `Playwright(UI) + Playwright(API) + skill + AI`，二期又如何演进。
4. 需求、开发、测试三类角色如何围绕同一套文档、目录、脚本和结果回填方式协同。

说明：

- 本文档默认关联 `Prds/V1.6.1/01-需求文档.md`、`Prds/V1.6.1/02-详细设计文档.md`、`Prds/V1.6.1/02b-后台文档.md`、`Prds/V1.6.1/03-测试用例文档.md`。
- 本文档默认测试关联关系直接通过 `REQ-CONFIG-BILLCFG-*` / `FT-BILLCFG-*` / `IT-BILLCFG-*` / `ATS-CONFIG-BILLCFG-*` 编号主线回溯。
- 前端代码仅为参考，自动化口径以需求文档为准；详设与需求冲突时以 `01-需求文档.md` 为准。

---

## 2. 目标与约束

### 2.1 总体目标

围绕 `REQ-CONFIG-BILLCFG-*` 建立一套从需求到回归验证的自动化闭环，让该模块的查询、配置、启停、明细查看能力可以稳定回归。

本期目标：

1. 覆盖 `03-测试用例文档.md` 中全部 39 个 `FT-BILLCFG-*` 功能测试点。
2. 覆盖 `02b-后台文档.md` 纳入本轮范围的 10 类接口的 `IT-BILLCFG-*` 测试点。
3. 覆盖 5 个 `PT-BILLCFG-*` 权限测试点与 14 个 `ET-BILLCFG-*` 异常测试点。
4. 沉淀 26 个 `data-testid` 稳定定位资产，支撑后续版本回归。
5. 建立模块级 `04-测试执行记录.md` 与 `TRACE.yaml` 回填方式。

### 2.2 约束与前提

1. 测试环境为 `test / 联调环境`（`http://10.17.227.10:30080`），前后端指向同一套联调数据。
2. 测试账号为 `shl / @admin123`（`admin` 角色，菜单权限包含 `menuId=11013`）。
3. UI 自动化依赖前端 `data-testid` 规范，命名遵循 `billing-{区域}-{元素}-{序号}`。
4. 多选查询字段（`instCode`、`projectCode`、`productNo`）以逗号分隔字符串传递，如 `'DX0006,DX0007'`；`displayStatus` 为下拉单选，直接传递单值。
5. 已消耗合同（`hasConsumed=true`）退化为只读，相关编辑场景需提前准备数据。
6. 当前前端 `onMounted` 使用 `Promise.all` 并发加载查询区选项，任一接口失败会导致主表不加载（见 `ET-BILLCFG-011`）。
7. AI 只负责提效，不替代测试判断、需求判断和最终审核。

---

## 3. 四条核心原则

### 3.1 一个 `REQ-CONFIG-BILLCFG-*` 贯穿到底

同一个 `REQ` 是贯穿需求、开发、测试、缺陷修复、回归验证的统一主键。本模块共 6 个 `REQ`：

| 需求编号                        | 功能名称               |
| ------------------------------- | ---------------------- |
| `REQ-CONFIG-BILLCFG-LIST-001`   | 列表查询与默认加载     |
| `REQ-CONFIG-BILLCFG-LIST-002`   | 合同列表展示与展开明细 |
| `REQ-CONFIG-BILLCFG-LIST-003`   | 合同状态展示与启停控制 |
| `REQ-CONFIG-BILLCFG-FORM-001`   | 新增合同配置           |
| `REQ-CONFIG-BILLCFG-FORM-002`   | 编辑合同配置           |
| `REQ-CONFIG-BILLCFG-DETAIL-001` | 明细抽屉查看           |

每个 `REQ` 至少贯穿到：`01-需求文档.md` → `02-详细设计文档.md` → `03-测试用例文档.md` → `FT-BILLCFG-*` / `IT-BILLCFG-*` → `ATS-CONFIG-BILLCFG-*.spec.ts` → `04-测试执行记录.md` → `TRACE.yaml`。

### 3.2 自动化执行必须确定性

- UI 自动化执行主引擎是 Playwright 确定性脚本。
- 接口自动化执行主引擎是一套确定性 API 脚本。
- 不把正式回归执行交给 AI 自主操作。
- AI 只参与：需求解析、测试点整理、脚本骨架生成、失败归因、回填建议。

### 3.3 先统一治理，再分化专业能力

一期优先：`Playwright(UI) + Playwright(API) + skill + AI`。二期在接口规模、数据复杂度明显增加后再演进 API 侧到 Pytest。

### 3.4 测试关联关系直接走编号主线

`FT` / `IT` 编号由 `REQ` 派生；UI / API 自动化脚本沿用同一功能点编号主线；关联关系通过 `03-测试用例文档.md`、脚本命名、`04-测试执行记录.md`、`TRACE.yaml` 回溯。

---

## 4. 总体方案架构

自动化专项分成四层：

### 4.1 治理层

负责统一规则，不直接负责执行。本模块治理层资产：

- `Prds/V1.6.1/01-需求文档.md`
- `Prds/V1.6.1/02-详细设计文档.md`
- `Prds/V1.6.1/02b-后台文档.md`
- `Prds/V1.6.1/03-测试用例文档.md`
- `Prds/V1.6.1/04-测试执行记录.md`
- `Prds/V1.6.1/05-变更记录.md`
- 模块级 `TRACE.yaml`

### 4.2 设计层

负责把需求点转换成测试设计和自动化资产：

- 从 `01` / `02` 中抽取 6 个 `REQ-CONFIG-BILLCFG-*`
- 在 `03` 中形成 `FT-BILLCFG-*` / `IT-BILLCFG-*` / `PT-BILLCFG-*` / `ET-BILLCFG-*`
- 识别哪些测试点适合 UI 自动化、哪些适合接口自动化、哪些只能手工验证
- 生成 Playwright 脚本骨架和目录骨架

### 4.3 执行层

负责真正运行 UI / API 自动化：

- `Tests/ui/CONFIG-配置中心/BILLCFG-商业化计费配置/`
- `Tests/api/CONFIG-配置中心/BILLCFG-商业化计费配置/`
- fixtures / data / pages / clients / schemas / reports
- Playwright 报告、日志、截图、trace

### 4.4 反馈层

负责结果归因、缺陷闭环、回写与版本结论：

- 失败分类（`ENV` / `AUTH` / `DATA` / `SCRIPT` / `DEFECT` / `CHANGE`）
- 提交缺陷并挂接同一 `REQ-CONFIG-BILLCFG-*`
- 修复后回归验证
- 回填 `04`、按需回写 `05`、更新 `TRACE.yaml`

---

## 5. UI 自动化与接口自动化的关系定位

### 5.1 UI 自动化负责什么

本模块 UI 自动化优先承担：

- 列表查询主路径回归（默认加载、组合筛选、重置、分页、空结果）
- 展开明细与缓存复用验证
- 状态标签颜色与启停控制闭环
- 新增/编辑弹窗表单校验、配额行增删、总次数自动汇总
- 明细抽屉汇总区、用量明细表、历史变更表展示
- 权限显隐与登录态拦截
- 发布前 smoke / 回归验证

### 5.2 接口自动化负责什么

本模块接口自动化优先承担：

- 10 类接口正确性验证（机构/项目/产品/合同分页/合同详情/新增/编辑/启停/用量明细/历史变更）
- 多选参数 CSV 解析、非法状态值、必填缺失、边界条件验证
- 造数、清数、前后置准备
- UI 难以稳定覆盖但接口容易验证的业务规则（如 `sampleQuota < usedCount` 拒绝、合同编号重复、合同日期非法）

### 5.3 二者如何协同

| `REQ`        | `FT-*`（UI）                               | `IT-*`（API）                      | 协同关系                                      |
| ------------ | ------------------------------------------ | ---------------------------------- | --------------------------------------------- |
| `LIST-001`   | 16 个查询/分页/空结果场景                  | `PAGE-001~004` 分页主接口          | UI 验证交互闭环，API 验证参数解析与边界       |
| `LIST-002`   | 展开明细、缓存复用、空配额行               | `DETAIL-001` 合同详情接口          | UI 验证展开缓存，API 验证 `lines[]` 结构      |
| `LIST-003`   | 状态标签颜色、启停双向可逆、终止合同置灰   | `TOGGLE-001~004` 启停接口          | UI 验证视觉与交互，API 验证非法状态与终态合同 |
| `FORM-001`   | 19 个新增表单场景                          | `ADD-001~005` 新增接口             | UI 验证前端校验，API 验证后端校验与边界       |
| `FORM-002`   | 6 个编辑场景（含只读态、增删行、重复编号） | `EDIT-001~004` 编辑接口            | UI 验证只读门禁，API 验证整表覆盖与行配额约束 |
| `DETAIL-001` | 6 个抽屉场景（汇总、空用量、分页、销毁）   | `USAGE-001~002`、`HISTORY-001~003` | UI 验证抽屉展示，API 验证分页与快照结构       |

---

## 6. 技术选型对比与结论

### 6.1 本模块技术选型结论

本模块沿用总方案第一阶段结论：

> **Playwright(UI) + Playwright(API) + skill + AI**

原因：

1. UI 与 API 同栈，便于统一执行入口、目录结构、报告方式。
2. 团队已有 `report-type-config` 模块的 Playwright 实践经验可直接复用。
3. 更容易统一 `REQ-CONFIG-BILLCFG-*` → `FT/IT-BILLCFG-*` → `ATS-CONFIG-BILLCFG-*` → 结果的治理链路。
4. `skills/ui-automation-bootstrap` 可直接支撑骨架生成。

### 6.2 复用既有资产

| 资产              | 来源                                         | 复用方式                                                      |
| ----------------- | -------------------------------------------- | ------------------------------------------------------------- |
| 登录 fixture 模式 | `report-type-config/fixtures/auth.ts`        | 复用 `login()`、`warmProjectCodeList()`、`authedPage` fixture |
| Page Object 模式  | `report-type-config/helpers/page-objects.ts` | 复用分层结构与命名约定                                        |
| Playwright 配置   | `Tests/ui/playwright.config.ts`             | 共享层统一入口，当前先服务 `billing-config` 模块                |
| 测试账号          | `shl / @admin123`                            | 同一账号，菜单权限需含 `menuId=11013`                         |

---

## 7. 目录结构与仓库映射

### 7.1 模块级目录骨架（需求侧）

```text
Prds/V1.6.1/
├─ 01-需求文档.md
├─ 02-详细设计文档.md
├─ 02b-后台文档.md
├─ 03-测试用例文档.md
├─ 04-测试执行记录.md
└─ 05-变更记录.md
```

### 7.2 UI 自动化目录结构（测试侧）

本节对齐总方案 `ai-playwright-automation-plan-full.md` 第 9.2 节目录建议，落地为 `BILLCFG` 模块的“共享运行层 + 一级模块 + 二级模块”结构。**当前已实施**：

```text
Tests/ui/
├─ package.json
├─ playwright.config.ts
├─ global-setup.ts
├─ .env
├─ .env.example
├─ .auth/
├─ test-reports/
└─ CONFIG-配置中心/
   └─ BILLCFG-商业化计费配置/
      ├─ specs/
      │  ├─ ATS-CONFIG-BILLCFG-LIST-001.spec.ts
      │  ├─ ATS-CONFIG-BILLCFG-LIST-002.spec.ts
      │  ├─ ATS-CONFIG-BILLCFG-LIST-003.spec.ts
      │  ├─ ATS-CONFIG-BILLCFG-FORM-001.spec.ts
      │  ├─ ATS-CONFIG-BILLCFG-FORM-002.spec.ts
      │  └─ ATS-CONFIG-BILLCFG-DETAIL-001.spec.ts
      ├─ fixtures/
      │  └─ billing.fixture.ts
      ├─ data/
      │  └─ billing.data.ts
      ├─ pages/
      │  └─ billing.page.ts
      ├─ snapshots/
      └─ README.md
```

说明：

- `Tests/ui/` 作为共享运行层，统一承载依赖、环境变量、登录态、Playwright 配置与报告输出。
- 目录层级 `CONFIG-配置中心 / BILLCFG-商业化计费配置` 与 `REQ-CONFIG-BILLCFG-*` 编号主线一一对应。
- `specs/` 按 `REQ` 的 `L3` 功能组拆分（`LIST` / `FORM` / `DETAIL`），每个 `REQ` 至少一个脚本文件。
- `pages/` 封装 `BillingConfigPage` 页面对象，承接全部 26 个 `data-testid` 定位。
- `fixtures/` 复用 `report-type-config` 登录态模式，封装 `authedPage` 与前后置数据装配。
- `data/` 集中管理合法/非法输入、配额行、状态枚举、默认弹窗值、超时配置。
- `snapshots/` 可选，用于页面结构快照与调试辅助。

### 7.3 接口自动化目录结构（测试侧）

```text
Tests/api/
└─ CONFIG-配置中心/
   └─ BILLCFG-商业化计费配置/
      ├─ specs/
      │  ├─ ATS-CONFIG-BILLCFG-PAGE-001.api.spec.ts
      │  ├─ ATS-CONFIG-BILLCFG-ADD-001.api.spec.ts
      │  ├─ ATS-CONFIG-BILLCFG-EDIT-001.api.spec.ts
      │  ├─ ATS-CONFIG-BILLCFG-TOGGLE-001.api.spec.ts
      │  ├─ ATS-CONFIG-BILLCFG-USAGE-001.api.spec.ts
      │  └─ ATS-CONFIG-BILLCFG-HISTORY-001.api.spec.ts
      ├─ clients/
      │  └─ billing.client.ts
      ├─ fixtures/
      │  └─ auth.fixture.ts
      ├─ data/
      │  └─ billing.api.data.ts
      ├─ schemas/
      │  └─ billing.schema.ts
      └─ README.md
```

### 7.4 物理落地状态

UI 自动化目录已按 §7.2 目标结构实施完成，物理路径与目标结构完全一致：

| 目标文件                                      | 物理路径                                                                                    | 状态      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- | --------- |
| `specs/ATS-CONFIG-BILLCFG-LIST-001.spec.ts`   | `Tests/ui/CONFIG-配置中心/BILLCFG-商业化计费配置/specs/ATS-CONFIG-BILLCFG-LIST-001.spec.ts` | ✅ 已实施 |
| `specs/ATS-CONFIG-BILLCFG-LIST-002.spec.ts`   | 同上目录                                                                                    | ✅ 已实施 |
| `specs/ATS-CONFIG-BILLCFG-LIST-003.spec.ts`   | 同上目录                                                                                    | ✅ 已实施 |
| `specs/ATS-CONFIG-BILLCFG-FORM-001.spec.ts`   | 同上目录                                                                                    | ✅ 已实施 |
| `specs/ATS-CONFIG-BILLCFG-FORM-002.spec.ts`   | 同上目录                                                                                    | ✅ 已实施 |
| `specs/ATS-CONFIG-BILLCFG-DETAIL-001.spec.ts` | 同上目录                                                                                    | ✅ 已实施 |
| `pages/billing.page.ts`                       | `.../pages/billing.page.ts`                                                                 | ✅ 已实施 |
| `fixtures/billing.fixture.ts`                 | `.../fixtures/billing.fixture.ts`                                                           | ✅ 已实施 |
| `data/billing.data.ts`                        | `.../data/billing.data.ts`                                                                  | ✅ 已实施 |
| `Tests/ui/playwright.config.ts`               | `Tests/ui/playwright.config.ts`                                                             | ✅ 已实施 |
| `Tests/ui/global-setup.ts`                    | `Tests/ui/global-setup.ts`                                                                  | ✅ 已实施 |
| `README.md`                                   | `.../README.md`                                                                             | ✅ 已实施 |

> 原 `Tests/test-script/billing-config/` 扁平结构已迁移至目标结构，旧目录已清理。

---

## 8. 编号与追踪规则

### 8.1 编号规则

| 资产           | 编号规则                               | 说明                                         |
| -------------- | -------------------------------------- | -------------------------------------------- |
| 需求功能点     | `REQ-CONFIG-BILLCFG-{NNN}`             | 需求主键，`NNN` 为 `LIST/FORM/DETAIL` 功能组 |
| UI/功能测试点  | `FT-BILLCFG-{NNN}`                     | 来源于 `03-测试用例文档.md`                  |
| 接口测试点     | `IT-BILLCFG-{NNN}`                     | 来源于 `03-测试用例文档.md`                  |
| 权限测试点     | `PT-BILLCFG-{NNN}`                     | 来源于 `03-测试用例文档.md` §5               |
| 异常测试点     | `ET-BILLCFG-{NNN}`                     | 来源于 `03-测试用例文档.md` §6               |
| UI 自动化脚本  | `ATS-CONFIG-BILLCFG-{NNN}.spec.ts`     | UI 自动化脚本                                |
| API 自动化脚本 | `ATS-CONFIG-BILLCFG-{NNN}.api.spec.ts` | 接口自动化脚本                               |

示例：

- `REQ-CONFIG-BILLCFG-LIST-001`
- `FT-BILLCFG-LIST-002`
- `IT-BILLCFG-PAGE-004`
- `ATS-CONFIG-BILLCFG-FORM-001.spec.ts`
- `ATS-CONFIG-BILLCFG-ADD-001.api.spec.ts`

### 8.2 追踪规则

```text
REQ-CONFIG-BILLCFG-{NNN}
 ├─ FT-BILLCFG-{NNN}  → ATS-CONFIG-BILLCFG-{NNN}.spec.ts     → UI 执行结果
 ├─ IT-BILLCFG-{NNN}  → ATS-CONFIG-BILLCFG-{NNN}.api.spec.ts → API 执行结果
 ├─ PR / commit / tag
 ├─ 缺陷单
 └─ 04 / 05 / TRACE 回填状态
```

### 8.3 用例覆盖清单

| 文件                                    | 覆盖用例                                                  | 优先级   |
| --------------------------------------- | --------------------------------------------------------- | -------- |
| `ATS-CONFIG-BILLCFG-LIST-001.spec.ts`   | `PT-BILLCFG-001~003`；`FT-BILLCFG-LIST-001~004, 011, 016` | P0/P1    |
| `ATS-CONFIG-BILLCFG-LIST-002.spec.ts`   | `FT-BILLCFG-LIST-005~007, 012, 015`                       | P0/P1    |
| `ATS-CONFIG-BILLCFG-LIST-003.spec.ts`   | `FT-BILLCFG-LIST-008~010, 013, 014`                       | P0/P1    |
| `ATS-CONFIG-BILLCFG-FORM-001.spec.ts`   | `FT-BILLCFG-FORM-001~005, 009~014, 018`                   | P0/P1    |
| `ATS-CONFIG-BILLCFG-FORM-002.spec.ts`   | `FT-BILLCFG-FORM-006~008, 015, 016`                       | P0/P1    |
| `ATS-CONFIG-BILLCFG-DETAIL-001.spec.ts` | `FT-BILLCFG-DETAIL-001~006`                               | P0/P1/P2 |

**总用例数：39 个 `FT` + 3 个 `PT`（其余 PT/ET 需接口或手工补充）**

---

## 9. UI 自动化详细方案

### 9.1 UI 自动化适用范围

本模块优先纳入：

1. P0 / P1 主业务路径（列表查询、新增、编辑、明细、启停）。
2. 页面结构稳定、定位稳定的场景（26 个 `data-testid` 已就位）。
3. 断言口径清晰的场景（状态标签颜色、必填提示、总次数汇总）。
4. 数据可回收、可重复执行的场景。

首批覆盖（冒烟集）：

- `FT-BILLCFG-LIST-001` 页面默认加载
- `FT-BILLCFG-LIST-002` 组合筛选查询
- `FT-BILLCFG-LIST-006` 展开明细
- `FT-BILLCFG-LIST-009/010` 启停合同
- `FT-BILLCFG-FORM-004` 新增合同
- `FT-BILLCFG-FORM-006/007` 编辑合同（含只读门禁）
- `FT-BILLCFG-DETAIL-001` 明细抽屉

### 9.2 UI 脚本分层建议

| 层           | 作用               | 本模块落地                                                           |
| ------------ | ------------------ | -------------------------------------------------------------------- |
| `specs/`     | 场景脚本           | 按 `REQ` 的 `L3` 功能组拆分 6 个文件                                 |
| `fixtures/`  | 登录态、前后置动作 | `authedPage` fixture + `warmProjectCodeList`                         |
| `data/`      | 输入参数、断言数据 | `VALID_CONTRACT`、`QUOTA_ROWS`、`CONTRACT_STATUS`、`STATUS_TAG_TYPE` |
| `pages/`     | 页面对象封装       | `BillingConfigPage` 含 26 个 `data-testid` 定位与操作方法            |
| `snapshots/` | 页面结构快照       | 可选，用于 `destroy-on-close` 等场景调试                             |

### 9.3 UI 定位规范

定位优先级：

1. `getByTestId`（首选，本模块已有 26 个稳定标识）
2. `getByRole + name`
3. `locator` + 稳定属性（如 `.el-tag--success`）
4. 最后才用脆弱 CSS 路径

`data-testid` 命名规范：`billing-{区域}-{元素}-{序号}`

| 区域          | 命名前缀                                                               | 数量 | 示例                                                 |
| ------------- | ---------------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| 查询区        | `billing-search-*`                                                     | 5    | `billing-search-inst-code`、`billing-search-status`  |
| 主列表操作    | `billing-add-tenant-btn`、`billing-row-*-btn-{i}`                      | 4    | `billing-row-edit-btn-0`                             |
| 展开明细      | `billing-expand-table`                                                 | 1    | `billing-expand-table`                               |
| 新增/编辑弹窗 | `billing-edit-dialog`、`billing-*-input/select`、`billing-quota-*-{i}` | 14   | `billing-contract-no-input`、`billing-quota-input-0` |
| 明细抽屉      | `billing-detail-drawer`、`billing-detail-close-btn`                    | 2    | `billing-detail-drawer`                              |

### 9.4 页面探索方式建议

本模块已完成两轮探索：

1. **前端代码探索**：确认路由 `/config/billingConfig`、4 个组件文件（`index.vue`、`expandTable.vue`、`editDialog.vue`、`detailDrawer.vue`）、接口依赖、26 个 `data-testid` 设计意图。
2. **运行态校验**：用 `browser_snapshot` 校验实际可见元素、弹窗层级、权限显隐结果。

结论：先看前端代码定范围和定位策略，再用 `browser_snapshot` 校验运行态结构，最后写脚本。

### 9.5 UI 编写与执行流程

1. 读取 `Prds/V1.6.1/01-需求文档.md`、`Prds/V1.6.1/03-测试用例文档.md`。
2. 锁定目标 `REQ-CONFIG-BILLCFG-*` / `FT-BILLCFG-*`。
3. 页面观察与 `data-testid` 定位点确认（参考 `02-详细设计文档.md` §7）。
4. 生成 Playwright 脚本骨架（`skills/ui-automation-bootstrap`）。
5. 人工补齐等待、断言、前后置处理。
6. 本地执行并修正。
7. 输出报告与失败归因。
8. 回填 `04-测试执行记录.md` 与 `TRACE.yaml`。

### 9.6 关键等待与断言策略

| 场景         | 等待策略                                              | 断言点                                     |
| ------------ | ----------------------------------------------------- | ------------------------------------------ |
| 页面默认加载 | `waitForLoadState('networkidle')` + `searchArea` 可见 | 查询区 5 个字段可见、主表有数据            |
| 弹窗打开     | `editDialog` 可见 + `.el-loading-mask` 计数为 0       | 默认值 `storageDays=90`、`downloadTimes=2` |
| 级联选择     | `el-cascader-menu:visible` 可见后点选项               | `collapse-tags` 折叠展示                   |
| 启停确认框   | `.el-message-box` 可见                                | 提示文案 + 状态标签颜色                    |
| 抽屉打开     | `detailDrawer` 可见 + loading 消失                    | 汇总区数值 + 用量/历史表                   |
| 提示消息     | `.el-message:visible` 含文案                          | `新增成功`、`保存成功`、`合同编号已存在`   |

---

## 10. 接口自动化详细方案

### 10.1 一期方案：Playwright API

本模块一期使用 Playwright API，与 UI 自动化同栈。

适用场景：

- 10 类接口回归
- 登录态串联
- UI 前后置造数与校验
- 多选参数 CSV 解析、非法状态值、必填缺失验证

### 10.2 接口清单与覆盖

| 接口                                                | 方法 | 关联 `IT`         | 覆盖场景                               |
| --------------------------------------------------- | ---- | ----------------- | -------------------------------------- |
| `/base/authInstitution/pageInstitutions`            | POST | `ORG-001`         | 机构选项加载                           |
| `/base/projects/page`                               | POST | `PROJECT-001`     | 检测项目选项加载                       |
| `/base/products/page`                               | POST | `PRODUCT-001`     | 产品套餐选项加载                       |
| `/base/quota/contract/page`                         | POST | `PAGE-001~004`    | 合同分页（含多选 CSV、非法状态）       |
| `/base/quota/contract/{contractId}`                 | GET  | `DETAIL-001/002`  | 合同详情（含不存在）                   |
| `/base/quota/contract/add`                          | POST | `ADD-001~005`     | 新增（含重复编号、日期非法、配额超限） |
| `/base/quota/contract/edit`                         | POST | `EDIT-001~004`    | 编辑（含行配额约束、整表覆盖）         |
| `/base/quota/contract/toggle/{contractId}/{status}` | POST | `TOGGLE-001~004`  | 启停（含非法状态、终态合同）           |
| `/base/quota/usage/detail`                          | POST | `USAGE-001/002`   | 用量明细（含空用量）                   |
| `/base/quota/usage/history`                         | POST | `HISTORY-001~003` | 历史变更（含必填缺失、操作类型筛选）   |

### 10.3 接口自动化分层建议

| 层          | 作用               | 本模块落地                                             |
| ----------- | ------------------ | ------------------------------------------------------ |
| `specs/`    | 接口场景脚本       | 按 10 类接口拆分 6 个文件                              |
| `clients/`  | 接口访问封装       | `billing.client.ts` 统一请求入口                       |
| `fixtures/` | 鉴权、前置数据     | 复用 `auth.fixture.ts`                                 |
| `data/`     | 请求参数与断言数据 | `billing.api.data.ts`                                  |
| `schemas/`  | 结构校验           | `billing.schema.ts` 校验 `ContractRecordResponse[]` 等 |

### 10.4 环境、鉴权、数据、断言规范

#### 环境分层

- `local` / `test` / `staging`
- 抽离 `baseURL`、登录地址、账号密码来源、数据清理开关

#### 鉴权分层

1. 账号层：`shl / @admin123`（`admin` 角色）
2. 登录层：token 获取与刷新
3. 调用层：业务接口自动附带鉴权头

#### 数据分层

| 数据类型     | 说明           | 本模块建议                                                                  |
| ------------ | -------------- | --------------------------------------------------------------------------- |
| 固定基线数据 | 长期复用       | 4 种状态合同（`NORMAL/EXPIRING_SOON/EXPIRED/DISABLED`）、机构/项目/产品候选 |
| 临时造数     | 执行前动态创建 | 新增合同 `HT-UI-AUTO-*`，由 fixture 创建和清理                              |
| 受限共享数据 | 并发风险高     | `hasConsumed=true` 合同需明确隔离规则                                       |

#### 断言分层

接口断言至少包含四层：

1. 状态码断言（HTTP 200）
2. 业务码断言（`retCode=0` 或 `retCode=10022003` 等）
3. 结构断言（`result.records[]` 字段完整）
4. 业务断言（多选 CSV 正确解析、行配额约束生效）

### 10.5 关键边界值与异常码

| 场景           | 请求参数                                 | 预期异常码 | 预期提示                              |
| -------------- | ---------------------------------------- | ---------- | ------------------------------------- |
| 非法状态值     | `displayStatus=ABC`                      | `10022003` | `合同展示状态不合法: ABC`             |
| 重复合同编号   | 同机构已存在 `contractNo`                | `10022003` | `合同编号已存在: <contractNo>`        |
| 合同日期非法   | `startDate > endDate`                    | `10022007` | `合同日期非法`                        |
| 配额超限       | `Σ lines.sampleQuota > sampleTotalQuota` | `10022003` | 含 `各行配额之和` 与 `超过合同总配额` |
| 行配额低于已用 | `sampleQuota < usedCount`                | `10022003` | `行配额(<x>)不能小于已用次数(<y>)`    |
| 合同不存在     | 不存在的 `contractId`                    | `10022004` | `合同不存在`                          |
| 终态合同启停   | 已终止合同 + toggle                      | `10022009` | `已终止的合同不能启用/停用`           |
| 非法目标状态   | `{status:'TERMINATED'}`                  | `10022003` | `目标状态只能为 ENABLED/DISABLED`     |

---

## 11. AI / skill / agent 协同方案

### 11.1 本模块协同定位

| 能力  | 主要职责                           | 本模块应用                                  |
| ----- | ---------------------------------- | ------------------------------------------- |
| skill | 固定流程触发、目录脚手架、命名校验 | `skills/ui-automation-bootstrap` 生成骨架   |
| agent | 读取需求/详设/用例并整理场景       | 整理 39 个 `FT` 与 26 个 `data-testid` 映射 |
| AI    | 生成脚本初稿、补齐断言、分析失败   | 生成 Page Object、spec 骨架、失败归因       |
| 人    | 审核需求口径、确认场景边界         | 确认设计-需求冲突处理、只读态数据准备       |

### 11.2 推荐链路

```text
Prds/V1.6.1/01 + 02 + 02b + 03
    ↓
skill：识别目标 REQ-CONFIG-BILLCFG-* 与 FT/IT-BILLCFG-*
    ↓
agent：整理页面/接口/断言点（26 个 data-testid、10 类接口）
    ↓
AI：生成 UI/API 脚本骨架（Page Object + 6 个 spec + 数据文件）
    ↓
人工补齐与审核（等待策略、断言、只读态数据）
    ↓
Playwright 执行
    ↓
AI 辅助失败分析
    ↓
回填 04 / 05 / TRACE
```

### 11.3 已识别的设计-实现差异

以下差异已通过人工审核确认，AI 不得擅自修改脚本绕过：

| 差异                   | 设计口径              | 实现现状                                            | 处理方式                              |
| ---------------------- | --------------------- | --------------------------------------------------- | ------------------------------------- |
| 选项加载与主表加载耦合 | 详设描述并发加载      | `onMounted` 的 `Promise.all` 任一失败导致主表不加载 | `ET-011` 标注为潜在解耦项，不阻塞本期 |
| 汇总计算口径           | 详设按 `lines[]` 聚合 | 需求文档按用量明细求和                              | 冲突未解决，AI 不得自增断言           |

---

## 12. 执行闭环与缺陷修复机制

### 12.1 流程主线

```text
需求确认
  ↓
形成 01-需求文档.md 与 REQ-CONFIG-BILLCFG-* 编号
  ↓
完成 02-详细设计文档.md / 02b-后台文档.md
  ↓
完成 03-测试用例文档.md，形成 FT/IT/PT/ET-BILLCFG-*
  ↓
生成 UI / API 自动化脚本骨架
  ↓
手工测试 + UI 自动化 + API 自动化执行
  ↓
是否发现问题？
  ├─ 是 → 提交缺陷并挂接同一 REQ → 开发修复 → 测试回归验证
  └─ 否 → 回填测试结果
  ↓
更新 04-测试执行记录.md / TRACE.yaml
  ↓
按需更新 05-变更记录.md
  ↓
版本关闭
```

### 12.2 失败分类建议

| 分类     | 说明                 | 本模块典型场景                                      |
| -------- | -------------------- | --------------------------------------------------- |
| `ENV`    | 环境不可用、服务异常 | `10.17.227.10:30080` 不可达                         |
| `AUTH`   | token、权限、登录态  | 菜单权限不含 `menuId=11013`                         |
| `DATA`   | 测试数据不成立       | 缺 `hasConsumed=true` 合同、缺 `EXPIRING_SOON` 合同 |
| `SCRIPT` | 脚本本身问题         | 级联选择器定位不准、等待不足                        |
| `DEFECT` | 产品真实缺陷         | `Promise.all` 耦合导致主表不加载                    |
| `CHANGE` | 变更未同步           | `合同编号`→`合同编码` 术语变更未全量同步            |

### 12.3 缺陷闭环要求

1. 缺陷单必须挂接 `REQ-CONFIG-BILLCFG-*`。
2. 修复 PR / commit 继续挂接同一 `REQ`。
3. 回归验证继续围绕同一 `REQ`。
4. `04-测试执行记录.md` 中记录修复前后结果变化。
5. 若属于版本正式变化，按需更新 `05-变更记录.md`（三表结构：概要、明细、影响）。

---

## 13. 报告与结果回填规范

### 13.1 最低回填要求

每次批量执行后，至少回填：

1. `Prds/V1.6.1/04-测试执行记录.md`
2. 模块级 `TRACE.yaml`
3. 若测试点口径变化，则回写 `03-测试用例文档.md`
4. 若版本正式变化，则更新 `Prds/V1.6.1/05-变更记录.md`

### 13.2 `04-测试执行记录.md` 需要能回答什么

- 本轮测了哪些 `REQ-CONFIG-BILLCFG-*`
- 对应哪些 `FT` / `IT` / `PT` / `ET`
- 对应哪些脚本（`ATS-CONFIG-BILLCFG-*.spec.ts`）
- 结果是 `PASS` / `FAIL` / `BLOCKED` / `NOT RUN`
- 失败是脚本问题还是产品缺陷
- 是否影响发布结论

### 13.3 `05-变更记录.md` 什么时候更新

- 本版形成正式发布说明
- 页面或接口调整导致脚本、测试点、执行口径变化（如 `displayStatus` 多选改单选）
- 术语变更（如 `合同编号`→`合同编码` 需全量同步）

### 13.4 `TRACE.yaml` 需要更新什么

- 当前状态
- 关联代码路径（`src/views/Config/billingConfig/`）
- 关联测试路径（`Tests/ui/CONFIG-配置中心/BILLCFG-商业化计费配置/`）
- 回写记录
- 版本增量记录

---

## 14. 分阶段实施建议

### 14.1 阶段一：基础治理与最小闭环

目标：跑通 `BILLCFG` 模块真实闭环。

建议交付：

1. 6 个 `REQ-CONFIG-BILLCFG-*` 编号落地。
2. `03-测试用例文档.md` 中形成 39 个 `FT` + 10 类 `IT` + 5 个 `PT` + 14 个 `ET`。
3. `Tests/ui/CONFIG-配置中心/BILLCFG-商业化计费配置/` 目录骨架（6 个 spec + Page Object + fixture + data）。✅ 已完成
4. Playwright UI 最小执行框架（含 `billing-config` 专用配置）。✅ 已完成
5. 26 个 `data-testid` 稳定定位资产。✅ 已完成
6. 首批 9 个 P0 冒烟场景可执行。
7. `04`、`05`、`TRACE` 回填方式落地。

### 14.2 阶段二：接口自动化与 AI 深度接入

目标：补齐接口自动化，让 AI 生成与失败分析提效。

建议交付：

1. `Tests/api/CONFIG-配置中心/BILLCFG-商业化计费配置/` 目录骨架（6 个 api.spec + client + schema）。
2. 10 类接口的 `IT-BILLCFG-*` 全量覆盖。
3. 失败分类与回填建议能力。
4. 页面探索与接口分析能力。

### 14.3 阶段三：规模化与持续回归

目标：形成稳定平台能力。

建议交付：

1. CI 执行入口。
2. P0/P1 回归集（冒烟集 9 个 + 全量 39 个）。
3. 失败趋势分析。
4. 公共 fixture / data / auth / utils 沉淀。
5. 接口侧按需要演进到 Pytest。

---

## 15. 度量指标建议

### 15.1 覆盖指标

| 指标                         | 目标  | 本模块基线        |
| ---------------------------- | ----- | ----------------- |
| 功能用例覆盖度（按需求条目） | 100%  | 6 个 `REQ` 全覆盖 |
| `data-testid` 覆盖度         | 100%  | 26 个全覆盖       |
| P0 自动化覆盖率              | 100%  | 冒烟集 9 个       |
| P1 自动化覆盖率              | ≥ 95% | 33 个             |

### 15.2 质量指标

- 自动化通过率
- Flaky 率（重点关注级联选择器、网络等待场景）
- 缺陷发现率
- 需求点级闭环率

### 15.3 效率指标

- 脚本编写效率（AI 骨架生成可用率）
- 失败定位效率
- 回归执行时长
- 人工复核耗时

### 15.4 AI 效能指标

- 骨架生成可用率（Page Object + 6 个 spec 一次可用率）
- 一次修改后通过率
- 失败分析命中率
- 回填建议采纳率

---

## 16. 风险与边界

### 16.1 主要风险

| 风险                             | 影响                                       | 缓解方式                                         |
| -------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| `Promise.all` 选项加载与主表耦合 | 任一选项接口失败导致主表不加载（`ET-011`） | 标注为潜在缺陷，建议评估解耦；脚本中标注预期行为 |
| 缺 `hasConsumed=true` 合同数据   | `FORM-007/015` 只读态场景无法执行          | 提前在 `§2.3 数据初始化要求` 中准备              |
| 汇总计算口径冲突未解决           | `DETAIL-004` 断言口径不明确                | 冲突记录在案，AI 不得自增断言                    |
| 术语变更未全量同步               | `合同编号`/`合同编码` 混用导致歧义         | 按 `project_memory` 约束全量统一后再提交         |
| 级联选择器定位不稳               | `FORM-004/012` 多选套餐场景 Flaky          | 用 `el-cascader-menu:visible` 等待 + 重试        |
| 多选参数格式不一致               | 接口解析失败                               | 统一 CSV 字符串格式（`'DX0006,DX0007'`）         |

### 16.2 不建议的做法

- 一开始就追求全量自动化覆盖（先跑通冒烟集）。
- UI 与 API 各自独立建设、编号脱节。
- 只保留测试报告，不回填版本文档与追踪文件。
- 把 AI 当成正式执行引擎。
- 绕过需求文档以前端实现为准。

---

## 17. 一期最小落地清单

建议一期至少落地以下内容：

1. 6 个 `REQ-CONFIG-BILLCFG-*` 编号落地。✅
2. `03-测试用例文档.md` 中形成 `FT/IT/PT/ET-BILLCFG-*`。✅
3. `Tests/ui/CONFIG-配置中心/BILLCFG-商业化计费配置/` 目录骨架。✅
4. Playwright UI 最小执行框架（含 `billing-config` 专用配置）。✅
5. 26 个 `data-testid` 稳定定位资产（`BillingConfigPage`）。✅
6. 登录态 / 鉴权 fixture（复用 `report-type-config` 模式）。✅
7. 首批 9 个 P0 冒烟场景可执行（`LIST-001/002/006/009/010`、`FORM-004/006/007`、`DETAIL-001`）。
8. `04-测试执行记录.md` 回填规范。
9. `TRACE.yaml` 状态更新规范。
10. 缺陷单挂接 `REQ` 的闭环要求。
11. AI 参与脚本骨架生成与失败分析的最小流程。
12. `06-detail-drawer.spec.ts` 与模块 `README.md` 收尾。✅

---

## 18. 结论

本方案把 `配置中心 / 商业化计费配置` 模块的需求、开发、UI 自动化、接口自动化、缺陷修复、回归验证放进同一套 `REQ-CONFIG-BILLCFG-*` 编号与追踪体系中。

当前阶段最推荐的落地路线是：

> **Playwright(UI) + Playwright(API) + skill + AI**

它最适合当前目标：

- 先统一栈（复用 `report-type-config` 经验）。
- 先统一治理（6 个 `REQ` 贯穿到底）。
- 先统一执行入口（Playwright UI + API 同栈）。
- 先统一结果回填方式（`04` / `05` / `TRACE`）。
- 先把 9 个 P0 冒烟场景跑通，再补齐全量 39 个 `FT`。

在这条主线稳定之后，再把接口自动化逐步演进到更专业的 Python 生态，就能兼顾当前落地速度和后续规模化能力。
