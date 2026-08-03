# BILLCFG-商业化计费配置 自动化测试

> 配置中心 / 商业化计费配置 模块的 UI 自动化测试套件（基于 `@playwright/test`）。
>
> 覆盖 `Prds/V1.6.1/03-测试用例文档.md` 中的 48 条功能用例（LIST 18 + FORM 20 + DETAIL 10）。

## 1. 目录结构

```
BILLCFG-商业化计费配置/
├── data/
│   ├── billing.data.ts        # 测试数据（默认值、合同编号生成、API 模式、EXISTING_DATA 待回填）
│   ├── billing-texts.ts       # 文案常量（状态文案、校验提示、toast、按钮文案，精确匹配）
│   └── billing-mock.ts        # ET 用例 mock 响应体
├── fixtures/
│   └── billing.fixture.ts     # 模块夹具：组合 3 个 Page Object + 写操作数据清理上下文
├── pages/
│   ├── billing-list.page.ts   # 列表页面对象（查询区、主表、分页、行操作、展开区）
│   ├── billing-form.page.ts   # 新增/编辑弹窗页面对象（基础信息、配额行、提交）
│   └── billing-detail.page.ts # 明细抽屉页面对象（汇总区、用量表、历史表、分页）
├── specs/
│   ├── ATS-CONFIG-BILLCFG-LIST-001.spec.ts   # 3.1 列表查询与默认加载（12 条）
│   ├── ATS-CONFIG-BILLCFG-LIST-005.spec.ts   # 3.2 列表展示与展开明细（3 条）
│   ├── ATS-CONFIG-BILLCFG-LIST-008.spec.ts   # 3.3 状态展示与启停控制（3 条）
│   ├── ATS-CONFIG-BILLCFG-FORM-001.spec.ts   # 3.4 新增合同配置（15 条）
│   ├── ATS-CONFIG-BILLCFG-FORM-006.spec.ts   # 3.5 编辑合同配置（5 条）
│   └── ATS-CONFIG-BILLCFG-DETAIL-001.spec.ts # 3.6 明细抽屉查看（10 条）
└── snapshots/
    └── data-testid.snapshot.json  # 页面 data-testid 快照（设计意图 vs 页面实际 + 兜底定位）
```

## 2. 运行方式

### 2.1 前置准备

1. 安装依赖（在 `Tests/` 目录）：

   ```powershell
   npm install
   ```

2. 安装 Playwright 浏览器二进制（首次或换机必做，漏装会导致 `auth:capture` / 测试执行报 `Executable doesn't exist`）：

   ```powershell
   npx playwright install
   # 或指定 Edge 通道：npx playwright install msedge
   ```

3. 捕获登录态（首次或 token 过期时，需手动过滑块验证码）：

   ```powershell
   npm run auth:capture
   ```

   > 该命令会打开可见 Edge 浏览器，预填账号 `admin_shl`，用户手动完成登录与验证码后关闭浏览器，
   > storageState 保存到 `Tests/shared/.auth/CONFIG-配置中心/state.json`。

4. 确认 `Tests/.env` 包含：

   ```env
   TEST_BASE_URL=http://localhost:7001
   TEST_USERNAME=admin_shl
   TEST_PASSWORD=admin_shl@123
   ```

### 2.2 执行测试

```powershell
# 在 Tests/ 目录执行全部 UI 用例
npm run test:ui

# 仅执行计费配置模块（指定路径）
npx playwright test --config=ui-automation/playwright.config.ts --grep "BILLCFG"

# 生成 HTML + JUnit 报告
npm run test:report
```

报告输出至 `Tests/ui-automation/test-reports/`。

## 3. 数据回填说明（⚠️ 重要）

`data/billing.data.ts` 中的 `EXISTING_DATA` 标注了「⚠️ 待回填」字段。本套件采用**数据自适应策略**减少硬编码依赖：

| 用例类型                                | 自适应策略                                                           | 仍需回填的场景 |
| --------------------------------------- | -------------------------------------------------------------------- | -------------- |
| 状态相关（LIST-008/013/014、启停）      | `findRowByStatus` / `findRowByToggleText` 扫描当前页定位             | 无             |
| 可编辑/只读（FORM-006/007/008/015/016） | `findEditableRow` / `findReadonlyRow` 打开编辑弹窗按确定按钮状态判定 | 无             |
| 重复合同编号（FORM-016）                | 读取其他行合同编号作为重复值                                         | 无             |
| 空状态（LIST-007、DETAIL-002）          | 扫描各行展开区/明细查找空数据                                        | 无             |

> 自适应定位失败时用例自动 `test.skip` 并标注原因，不会误报失败。

## 4. 架构设计

### 4.1 Page Object Model

- **BillingListPage**：封装列表查询区、主表读取、分页、行操作、展开区，含数据自适应行查找。
- **BillingFormPage**：封装新增/编辑弹窗的基础信息字段、配额行操作、提交/取消、只读态判定。
- **BillingDetailPage**：封装明细抽屉的汇总区读取、用量/历史表、分页、关闭操作。

### 4.2 Fixture 层级

```
base.fixture (authedPage: 已登录 Page)
  └─ billing.fixture (billingList + billingForm + billingDetail + billingContext)
```

- `authedPage`：消费 storageState 创建已登录上下文（viewport 1440×900，zh-CN）。
- `billingContext.createdContractNos`：记录新增的合同编号，供测试后清理。

### 4.3 复用层（helpers/）

| 文件              | 作用                                                       | 沉淀的经验                                              |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| `element-plus.ts` | el-select/el-cascader/el-date-range-picker/MessageBox 交互 | §1.2 placeholder 拦截、§1.3 日历定位、§2.1 级联残留菜单 |
| `errors.ts`       | 错误消息收集（toast + 行内双查）                           | §1.1 配额行校验错误出现在 toast                         |
| `network.ts`      | API 等待/mock/调用计数                                     | ET 用例接口 mock、断言未调用接口                        |
| `visibility.ts`   | 可见性判断/残留清理/列偏移修正                             | §6.1 isVisible、§4.4 残留遮罩、§5.2 展开列偏移          |

## 5. 自检清单

- [x] 登录态：persistent profile / storageState 管理，不每用例重登
- [x] 表单字段完整性：probe-form-fields.js 探测无 testid 必填字段
- [x] 网络监控：waitForApi / createCallCounter 验证接口调用
- [x] 截图绝对路径：playwright.config screenshot only-on-failure
- [x] 临时脚本清理：固化脚本在 persistent-profile/，本套件无临时脚本残留
- [x] 错误双查：collectErrors 同时检查 toast 和行内错误
- [x] 抽屉可见性：用 isVisible()，禁止 getComputedStyle
- [x] 列偏移修正：getCellText 自动加展开列偏移

## 6. 用例覆盖矩阵

| spec 文件                             | 用例数 | 覆盖用例                                                                   |
| ------------------------------------- | ------ | -------------------------------------------------------------------------- |
| ATS-CONFIG-BILLCFG-LIST-001.spec.ts   | 12     | LIST-001/002/003/004/011/012/013/014/015/016 + ET-LIST-001/011             |
| ATS-CONFIG-BILLCFG-LIST-005.spec.ts   | 3      | LIST-005/006/007                                                           |
| ATS-CONFIG-BILLCFG-LIST-008.spec.ts   | 3      | LIST-008/009/010                                                           |
| ATS-CONFIG-BILLCFG-FORM-001.spec.ts   | 15     | FORM-001/002/003/004/005/009/010/011/012/013/014/018 + ET-FORM-003/004/012 |
| ATS-CONFIG-BILLCFG-FORM-006.spec.ts   | 5      | FORM-006/007/008/015/016                                                   |
| ATS-CONFIG-BILLCFG-DETAIL-001.spec.ts | 10     | DETAIL-001/002/003/004/005/006 + ET-DETAIL-009/X-010/013/014               |
| **合计**                              | **48** |                                                                            |

## 7. 已知限制

1. **新增数据清理**：当前无删除合同接口（`terminate` 未纳入前端），新增合同仅记录到 `billingContext`。
   建议测试后用 `cleanup-disable.js`（persistent-profile）禁用本次新增合同，或人工清理。
2. **展开区无 testid**：展开明细区依赖 `.el-table__expand-icon` 与子表格 class 兜底，若前端 DOM 结构变更需同步更新。
3. **明细抽屉汇总区读取**：顶部汇总区字段无 testid，按标签文案定位相邻数值，依赖标签文案稳定性。
4. **级联组件多行定位**：配额行级联无 testid，按弹窗内 nth 索引兜底，行数较多时存在脆弱性。
