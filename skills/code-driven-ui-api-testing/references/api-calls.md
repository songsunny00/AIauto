# 接口调用与验证模板（本项目：omics-web / billingConfig）

数据准备（造数）与接口验证共用同一调用。鉴权头为 `omics-vtk`，baseURL 需带 `/api` 前缀。

## 0.5 Windows / PowerShell 实际可用调用方式（已实测验证）

> ⚠️ 在 PowerShell 下 `curl.exe -d '{...}'` 会把 JSON 的双引号吞掉，导致后端报 `JSON parse error: Unexpected character ('p' ...)`。**不要用 curl -d**。改用 PowerShell 原生的 `Invoke-RestMethod` + `ConvertTo-Json`，可靠且免引号烦恼。

```powershell
# token 仅放环境变量，绝不写进脚本/仓库
$env:TEST_TOKEN = "<用户提供的 token>"
$B = "http://ack.omicsone.com/api"
$h = @{"omics-vtk" = $env:TEST_TOKEN; "lang" = "zh_CN"}

# 读接口（验证 token + 造数前取真实枚举）
$body = @{pageNum=1; pageSize=10} | ConvertTo-Json -Compress
$r = Invoke-RestMethod -Uri "$B/base/quota/contract/page" -Method Post -Headers $h -ContentType "application/json" -Body $body
$r.retCode   # 期望 0

# 写接口：新增（造数 + 验证合一）
$add = @{
  contractNo="HT-T-DEMO-001"; contractName="自动化测试合同-HT-T-DEMO-001";
  instCode="INST00001"; instName="华大基因";
  startDate="2026-07-21 00:00:00"; endDate="2026-08-21 00:00:00";
  sampleTotalQuota=10; storageDays=90; downloadLimit=2;
  remark="code-driven-ui-api-testing";
  lines=@(@{coverages=@(@{productNo="THAL001"; projectCode="THACARE"}); sampleQuota=10})
} | ConvertTo-Json -Depth 10 -Compress
$a = Invoke-RestMethod -Uri "$B/base/quota/contract/add" -Method Post -Headers $h -ContentType "application/json" -Body $add
$a.retCode          # 期望 0
$cid = $a.result    # 返回字符串型 contractId，记到数据清单

# 编辑复用同一条（约束3）：先 GET 取 lineId，再 edit
$d = Invoke-RestMethod -Uri "$B/base/quota/contract/$cid" -Method Get -Headers $h
$lid = $d.result.lines[0].lineId
$edit = @{contractId=$cid; contractNo="HT-T-DEMO-001"; contractName="自动化测试合同-HT-T-DEMO-001-edit"; instCode="INST00001"; instName="华大基因"; startDate="2026-07-21 00:00:00"; endDate="2026-08-21 00:00:00"; sampleTotalQuota=20; storageDays=90; downloadLimit=2; remark="code-driven-ui-api-testing-edited"; lines=@(@{lineId=$lid; coverages=@(@{productNo="THAL001"; projectCode="THACARE"}); sampleQuota=20})} | ConvertTo-Json -Depth 10 -Compress
$e = Invoke-RestMethod -Uri "$B/base/quota/contract/edit" -Method Post -Headers $h -ContentType "application/json" -Body $edit
$e.retCode          # 期望 0

# 软清理（约束4）：本模块无删除接口，改用禁用
$t = Invoke-RestMethod -Uri "$B/base/quota/contract/toggle/$cid/DISABLED" -Method Post -Headers $h
$t.retCode          # 期望 0
```

### 实测事实（2026-07-21 billingConfig 模块）
- 接口全部可达，`retCode===0` 即成功；`retCode===201` 表示 token 失效。
- `contract/page`：`pageSize` 默认 10，当前共 47 条 / 5 页 → **翻页（LIST-011）用存量数据即可测，非百条级**，不要误判为"数据不足"。
- 本模块**只有启停（`toggle`）、无删除接口**；新增数据清理走"禁用软清理"。**约束4 当前无删除操作可触发**；若未来接入删除接口，必须仅删本次新增数据。
- `add` 返回的 `result` 是字符串型 `contractId`（`lines[].lineId` 同样是字符串）。
- 真实枚举：`instCode=INST00001`(华大基因)、`projectCode=THACARE`/`productNo=THAL001`。

## 0. 准备 token（环境变量，禁止写进脚本/仓库）

```bash
# 方式 A：从已登录浏览器上下文读取（推荐，不落地）
TOKEN=$(playwright-cli --raw localstorage-get token)   # 取不到时试 cookie
export TEST_TOKEN="$TOKEN"

# 方式 B：用户直接提供
export TEST_TOKEN="<用户提供的 token>"
```
验证 token 有效（读接口，无写入）：
```bash
curl -s -X POST "http://ack.omicsone.com/api/base/quota/contract/page" \
  -H "omics-vtk: $TEST_TOKEN" -H "Content-Type: application/json" \
  -d '{"pageNum":1,"pageSize":10}' | jq '{retCode, total: .result.total}'
```

## 1. 取真实枚举（造数前必做，只读）
```bash
INST=$(curl -s -X POST "http://ack.omicsone.com/api/base/authInstitution/pageInstitutions" \
  -H "omics-vtk: $TEST_TOKEN" -H "Content-Type: application/json" -d '{"pageNum":1,"pageSize":1000}' \
  | jq -r '.result.records[0].instCode')
PROJ=$(curl -s -X POST "http://ack.omicsone.com/api/base/projects/page" \
  -H "omics-vtk: $TEST_TOKEN" -H "Content-Type: application/json" -d '{"pageNum":1,"pageSize":1000}' \
  | jq -r '.result.records[0].projectCode')
PROD=$(curl -s -X POST "http://ack.omicsone.com/api/base/products/page" \
  -H "omics-vtk: $TEST_TOKEN" -H "Content-Type: application/json" -d '{"pageNum":1,"pageSize":1000}' \
  | jq -r '.result.records[] | select(.projectCode=="'$PROJ'") | .productNo' | head -1)
```

## 2. 写接口：新增合同（造数 + 验证合一）
```bash
RESP=$(curl -s -X POST "http://ack.omicsone.com/api/base/quota/contract/add" \
  -H "omics-vtk: $TEST_TOKEN" -H "Content-Type: application/json" \
  -d "{
    \"contractNo\": \"HT-T-001\",
    \"instCode\": \"$INST\",
    \"startDate\": \"2026-07-01 00:00:00\",
    \"endDate\": \"2026-12-31 23:59:59\",
    \"sampleTotalQuota\": 100,
    \"storageDays\": 90,
    \"downloadLimit\": 2,
    \"lines\": [{\"coverages\": [{\"productNo\": \"$PROD\", \"projectCode\": \"$PROJ\"}], \"sampleQuota\": 100}]
  }")
echo "$RESP" | jq '{retCode, contractId: .result}'
```
断言：`retCode==='0'` 且 `result` 含新 `contractId` → 造数成功 + add 接口验证通过。记录 `contractId` 到数据清单。

## 3. 编辑复用（同一条数据）
```bash
curl -s -X POST "http://ack.omicsone.com/api/base/quota/contract/edit" \
  -H "omics-vtk: $TEST_TOKEN" -H "Content-Type: application/json" \
  -d "{
    \"contractId\": <NEW_ID>,
    \"contractNo\": \"HT-T-001\",
    \"instCode\": \"$INST\",
    \"startDate\": \"2026-07-01 00:00:00\",
    \"endDate\": \"2026-12-31 23:59:59\",
    \"sampleTotalQuota\": 120,
    \"storageDays\": 120,
    \"lines\": [{\"coverages\": [{\"productNo\": \"$PROD\", \"projectCode\": \"$PROJ\"}], \"sampleQuota\": 120}]
  }" | jq '{retCode, result}'
```
断言：`retCode==='0'`、`result=true` → 编辑接口验证通过，且复用同一条数据（约束3）。

## 4. 软清理（本模块无删除接口）
```bash
curl -s -X POST "http://ack.omicsone.com/api/base/quota/contract/toggle/<NEW_ID>/DISABLED" \
  -H "omics-vtk: $TEST_TOKEN" | jq '{retCode, result}'
```
说明：本模块只有启停、无删除，新增数据清理走"禁用软清理"或保留（≤5 条）。**若未来接入删除接口，必须仅删本次新增数据**（约束4）。

## 5. 注意事项
- 单次运行新增 ≤ 10 条（约束1）。
- 入参枚举（instCode/productNo/projectCode）必须从步骤1取真实值，禁止编造。
- 调用结果（retCode/错误码/返回字段）必须进入报告接口验证明细。
- toast 文案从 i18n 取真实值：新增成功=`新增成功`，编辑成功=`保存成功！`；Oracle 仍以测试用例文档为准。
