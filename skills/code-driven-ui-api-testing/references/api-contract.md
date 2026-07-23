# 接口契约清单（模块：商业化计费配置 billingConfig）

> 从 `D:\Codes\omics-web\src\api\config\billingConfig.ts` 与 `src/utils/axios.ts` 提取的真实契约。
> 鉴权头：**`omics-vtk`**（axios 拦截器注入 `config.headers['omics-vtk'] = userInfo.value.token`），非 `Authorization: Bearer`。
> baseURL：开发态为 `/api`，故完整路径为 `{BASEURL}/api/base/quota/contract/...`（BASEURL=http://ack.omicsone.com）。
> 响应统一结构：`{ retCode, retInfo, result }`，成功 `retCode==='0'`，业务数据在 `result`。

## C1 合同分页查询（列表）
- method: POST
- path: `/api/base/quota/contract/page`
- 入参（normalizeBillingListParams）：`{ instCode, projectCode, productNo, keyword, pageNum, pageSize, sortName, sortOrder, displayStatus }`（多选值以逗号分隔字符串传递）
- 返回：`result.records[]`（含 contractId/instName/sampleTotalQuota/downloadLimit/startDate/endDate/status/displayStatus/lines）、`result.total`
- 用途：列表加载验证 + 造数前探测现有数据

## C2 合同明细（单条）
- method: GET
- path: `/api/base/quota/contract/{contractId}`
- 返回：`result` = 单条记录（含 lines[]）
- 用途：编辑弹窗回填；无消耗判定（hasConsumed）

## C3 合同新增（造数 + 接口验证）
- method: POST
- path: `/api/base/quota/contract/add`
- 入参（ContractSavePayload，必填项）：
  - `contractNo: string`（必填，规则 `^[0-9a-zA-Z_-]+$`，≤50 字符）
  - `instCode: string`（必填，机构编码，从 C5 取真实值）
  - `startDate: string`、`endDate: string`（必填，YYYY-MM-DD HH:mm:ss；endDate>startDate）
  - `sampleTotalQuota: number`（必填，必须等于 Σ lines.sampleQuota）
  - `storageDays?: number`（默认 90）
  - `downloadLimit?: number`（默认 2，前端置灰）
  - `lines: [{ coverages: [{ productNo, projectCode }], sampleQuota: number, lineId? }]`（至少 1 行）
  - `status?: 'ENABLED'`（默认 ENABLED）
- 成功返回：`retCode=0`，`result` 含新 `contractId`
- 已知错误码：10022003（合同编号已存在 / 各行配额之和超过合同总配额）、10022007（合同日期非法）
- 用途：数据准备（造数）+ 写接口验证（FORM-004 接口层）

## C4 合同编辑（复用造数）
- method: POST
- path: `/api/base/quota/contract/edit`
- 入参：同 C3，但带 `contractId`；已有行带 `lineId`，新增行不带 `lineId`（后端整表覆盖旧行）
- 成功返回：`retCode=0`，`result=true`
- 用途：复用 C3 新增数据做编辑验证（FORM-006/008）

## C5 机构/项目/产品选项（取真实枚举）
- `POST /api/base/authInstitution/pageInstitutions` → `result.records[].{instCode, instName}`
- `POST /api/base/projects/page` → `result.records[].{projectCode, projectName}`
- `POST /api/base/products/page` → `result.records[].{productNo, productName, projectCode}`
- 用途：新增/编辑前取真实 instCode / projectCode / productNo（禁止编造）

## C6 启停切换（软清理）
- method: POST
- path: `/api/base/quota/contract/toggle/{contractId}/{status}`
- status ∈ `ENABLED` | `DISABLED`（TERMINATED 不被允许）
- 成功返回：`retCode=0`，`result=true`
- 用途：本模块**无删除接口**，新增数据清理走"禁用软清理"或保留（≤5 条）

## 关键文案（从 i18n 提取，代码即真实值）
- 新增成功：`新增成功`
- 编辑成功：`保存成功！`
- 合同编号格式非法：`合同编号仅支持字母、数字、-或_`
- 必填机构：`请选择机构名称`；必填合同编号：`请输入合同编号`；必填周期：`请选择合同周期`
- 行必填：`第 {0} 行检测项目及产品套餐必填` / `第 {0} 行样本分析次数配额必填` / `第 {0} 行样本分析次数配额仅支持整数`
- ⚠️ Oracle 仍以 `03-测试用例文档.md` 为准；代码文案与用例一致即 PASS，不一致即缺陷（但应先核对是否报告转述差异）。
