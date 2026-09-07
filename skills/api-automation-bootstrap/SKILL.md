---
name: api-automation-bootstrap
description: 基于需求、详细设计、后端接口契约与前端实际请求实现，生成或维护独立的 Playwright API 自动化骨架、初始用例和运行说明。
allowed-tools: Read Glob Grep Edit Write Bash AskUserQuestion
---

# api-automation-bootstrap

## 1. 目标

围绕一个业务模块建立**独立、可执行、可验证**的 Playwright API 自动化套件。技能不只输出目录名，而是根据真实接口契约和前端请求实现，完成以下工作：

- 识别适合 API 自动化的 `IT-*` 用例，并保持 `REQ -> IT -> ATS` 追踪链；
- 生成 `Tests/api-automation/` 下的配置、client、fixture、schema、data、spec 和 README；
- 记录需求、后端契约与前端当前实现之间的偏差，不把契约要求误写成已实现行为；
- 优先落地只读接口、成功契约、业务错误码、分页和动态外键发现；
- 对新增、编辑、启停等写操作实施显式数据隔离和执行保护；
- 在不具备真实 API 地址或 token 时仍完成类型检查和用例发现，但不得伪造接口通过。

默认目标是生成**最小可运行骨架**。如果用户明确要求“只出方案/目录”，只输出设计，不写测试代码；如果用户要求“写接口测试脚本”，则继续生成初始 `.api.spec.ts` 并执行静态验证。

## 2. 触发条件与边界

### 2.1 适合触发

- “使用 `api-automation-bootstrap` 建立某模块接口自动化”；
- “根据 01/02/后台接口文档写 API 测试脚本”；
- “把 03 中的 IT 用例转成 Playwright API 用例”；
- “补齐已有 API 自动化目录的 client、fixture、schema 或初始 spec”。

### 2.2 不负责

- 不把 UI page object、浏览器 `storageState`、UI mock 或前端 toast 测试搬入 API 套件；
- 不修改后端接口、前端业务代码或需求文档来“适配”测试；
- 不把真实 API 的 5xx、超时、loading、旧数据保留等 UI/故障注入场景伪造为 API 通过；
- 不在没有删除能力时承诺自动清理新增数据；
- 不默认提交、推送或修改共享环境数据；
- 不为了 API 套件重构无关的 UI 自动化目录。

## 3. 输入与真源优先级

### 3.1 输入清单

| 输入 | 必需性 | 用途 |
| --- | --- | --- |
| `01-需求文档.md` | 必需 | REQ 范围、业务字段、验收口径和不测边界 |
| `02-详细设计文档.md` | 推荐 | 接口调用时机、前端字段映射、状态流和业务文案 |
| `02b-后台接口文档.md` / 接口契约 | 必需 | 路径、方法、请求参数、响应结构、错误码和 `retInfo` |
| `03-测试用例文档.md` | 必需 | `IT-*` 编号、优先级、边界和追踪关系 |
| 前端 API 封装代码 | 强烈推荐 | 实际 URL、HTTP 方法、请求字段、分页值、鉴权头 |
| 前端业务调用代码 | 按需 | 真实调用时机、动态参数和字段转换 |
| 现有 `Tests/` 配置 | 必需 | package scripts、tsconfig、ignore、UI/API 套件隔离方式 |
| 环境说明 / CI 变量 | 可选 | API 根地址、token、专用写测试数据和权限矩阵 |

### 3.2 冲突裁决

- **功能范围**：以 `01` 为基准；未在 `01` 定义的功能不得仅因代码存在就新增为需求测试；
- **接口契约**：以 `02b` 或明确的后端接口契约为技术断言真源；
- **当前请求形态**：以可读取的前端 API 封装和调用代码为现状真源；
- **交互语义**：以 `02` 补充调用时机和前端字段映射；
- **发生冲突时**：保留契约测试，同时在 spec 标题、README 或测试数据中标注“当前实现偏差/联调确认项”；不得修改前端代码或把偏差默认为需求已实现；
- **无法确认时**：停止臆测。对 API 根地址、鉴权方式、写测试机构、响应 envelope 等真正影响实现的事项使用 `AskUserQuestion`，其他非关键数据条件使用运行时动态发现和 `test.skip(reason)`。

## 4. 前置检查

开始创建或修改文件前，依次确认：

1. 当前任务是“方案输出”“新套件起步”还是“已有套件迭代”；
2. `Tests/api-automation/` 是否已存在，是否有独立 config、fixture、client 和报告目录；
3. UI 套件是否使用 `Tests/ui-automation/playwright.config.ts`、global setup 或 `storageState`；API 套件不得直接复用这些运行时依赖；
4. `Tests/package.json`、`Tests/tsconfig.json`、`Tests/.gitignore` 是否需要增量修改；
5. `03` 第 4 章的接口、IT 编号和适用版本是否能映射到真实路径；
6. 前端代码中的 URL 是否含 `/api` 前缀，API 根地址是否已经明确；不得从 UI `TEST_BASE_URL` 猜测 API 地址；
7. 鉴权头名称、语言头、token 注入方式是否已确认；不得默认使用 `Authorization: Bearer`；
8. 测试数据是否需要动态发现，哪些用例必须依赖专用租户、已有合同、用量、存储记录或历史记录；
9. 是否存在写接口的回收能力。没有删除接口时，必须明确新增数据残留策略；
10. 现有工作区是否有用户未提交修改。只编辑目标 API 文件和必要的 `Tests/` 配置，不覆盖无关修改。

## 5. 输出契约

### 5.1 目录约定

API 套件与 UI 套件平级，默认使用：

```text
Tests/
├── api-automation/
│   ├── playwright.api.config.ts
│   ├── clients/
│   ├── fixtures/
│   ├── shared/
│   ├── schemas/
│   ├── <一级模块>/<二级模块>/
│   │   ├── data/
│   │   ├── specs/
│   │   └── README.md
│   └── README.md
├── package.json
├── tsconfig.json
└── .gitignore
```

目录名必须与实际配置一致：如果 spec 放在 `specs/`，config 的 `testMatch` 必须匹配 `**/specs/**/*.api.spec.ts`，不得一边使用 `api-specs/` 一边创建 `specs/`。

### 5.2 文件清单

按实际需要创建，不为单个函数提前抽象：

| 文件 | 职责 |
| --- | --- |
| `playwright.api.config.ts` | 独立 `APIRequestContext` 测试配置、spec 范围和 API 报告目录 |
| `clients/<module>.client.ts` | 一个业务域的 HTTP 方法和 endpoint 常量，不放业务断言 |
| `fixtures/api.fixture.ts` | API 地址、token、请求头、context 生命周期和 client 注入 |
| `shared/api-assertions.ts` | 统一响应 envelope、成功/业务失败/分页断言 |
| `schemas/<module>.schema.ts` | 领域最小类型、关键字段守卫和 ID 读取辅助函数 |
| `<module>/data/<module>.api-data.ts` | 分页常量、请求体构造、动态数据发现、日期和写开关 |
| `<module>/specs/ATS-*.api.spec.ts` | 按功能域承载 `IT-*` 测试；测试标题保留原始编号 |
| `README.md` | 环境变量、运行方式、数据前置、写操作限制和已知偏差 |

必要时同步修改：

- `Tests/package.json`：增加 `test:api` 和模块级 `test:api:*`，不改既有 UI scripts；
- `Tests/tsconfig.json`：加入 `api-automation/**/*.ts`；
- `Tests/.gitignore`：忽略 `api-automation/test-reports/`、token、`.env` 和临时认证态。

### 5.3 spec 命名与 IT 映射

spec 使用：

```text
ATS-{一级模块}-{二级模块}-{功能域}-{起始用例号}.api.spec.ts
```

例如：

```text
ATS-CONFIG-BILLCFG-OPTIONS-001.api.spec.ts
ATS-CONFIG-BILLCFG-CONTRACT-001.api.spec.ts
ATS-CONFIG-BILLCFG-DETAIL-001.api.spec.ts
```

- 一个 spec 可以包含同一功能域的多条 `IT-*`；
- 每条测试标题必须保留完整 `IT-*` 编号；
- 不新增独立的测试映射 JSON/YAML，直接沿用 `REQ -> IT -> ATS`；
- 不把同一接口的成功、分页、错误码场景随意拆到多个无业务边界的文件；
- 生成后必须统计 `03` 中目标 IT 编号与脚本标题，报告缺失、重复和超范围编号。

## 6. 实现流程

### Step 1：抽取接口和用例

从 `03` 建立内存中的工作表，至少包含：

```text
IT 编号 -> REQ -> HTTP 方法 -> 路径 -> 请求字段/分页 -> 成功断言 -> 失败断言 -> 数据前置 -> 优先级
```

只选择 `03` 已定义且接口存在于 `02b`/契约的场景。优先顺序：

1. P0 成功契约和核心查询；
2. 统一 envelope、错误码、空结果和分页边界；
3. 动态外键、跨接口口径校验；
4. 写操作和强数据依赖场景；
5. 真实 5xx/超时场景交给服务端故障注入或独立环境。

### Step 2：核对前端实际请求

读取前端 API 封装和调用处，记录：

- URL 是否已经带 `/api`；
- HTTP 方法和 path 参数编码；
- 实际 body 字段、空值处理和分页初始值；
- 鉴权 header 与语言 header；
- 前端发送的字段与契约字段差异；
- 契约要求但前端未发送的字段。

测试脚本可以同时验证“当前前端请求现状”和“契约要求”，但必须在名称或 README 中明确区分，禁止静默替换请求体。

### Step 3：建立独立运行层

- 使用 Playwright `APIRequestContext`，不创建 browser/page；
- API config 不引用 UI global setup、`storageState` 或 UI `TEST_BASE_URL`；
- `TEST_API_BASE_URL` 由环境变量提供，脚本不自动追加 `/api`；
- `TEST_API_TOKEN` 只从环境变量或 CI Secret 读取；
- context 在 fixture 结束时销毁；
- report 写入 `Tests/api-automation/test-reports/`，不得写入 token。

推荐环境变量：

```text
TEST_API_BASE_URL=<实际请求 /base/... 时使用的 API 根地址>
TEST_API_TOKEN=<omics-vtk token>
TEST_API_LANG=zh_CN
TEST_API_IGNORE_HTTPS_ERRORS=false
TEST_API_WRITE_ENABLED=false
TEST_API_WRITE_INST_CODE=<专用写测试机构编码>
```

若缺少必需环境变量，真实运行应给出明确配置阻塞；`--list` 和 `typecheck` 不应依赖真实 token。

### Step 4：实现 client 和统一断言

Client 只负责请求：

```ts
export const ENDPOINTS = {
  page: '/base/example/page',
  detail: '/base/example'
} as const
```

动态 path 参数必须使用 `encodeURIComponent`。所有成功接口至少验证：

- HTTP 状态为 2xx；
- 响应可解析为对象；
- `requestId` 类型正确（契约要求时）；
- `retCode` 归一化后为 `0`，兼容数字 `0` 与字符串 `"0"`；
- `result` 不为 `null`；
- 分页接口含数组 `records`、非负 `total`，且记录数不超过请求 `pageSize`；
- 业务字段、类型、允许枚举和跨接口关联符合契约。

失败接口同时区分：

- HTTP 4xx/5xx；
- HTTP 200 但 `retCode != 0`；
- 错误码；
- `retInfo` 原文或明确的关键动态片段。

禁止只断言 HTTP 200、只断言“响应不为空”或只断言 `code=0`。

### Step 5：实现动态数据和前置条件

- 机构、项目、产品、套餐、租户、合同、行 ID 优先从接口动态发现；
- 不复制 UI 行号、固定合同 ID、固定 `lineId` 或未经确认的机构编码；
- 通过真实关联关系筛选启用项目和产品，不把任意两个选项拼成合法外键；
- 需要特定存量数据时先请求并验证字段，再决定是否 `test.skip(true, 'BLOCKED: ...')`；
- skip 原因必须描述实际数据缺口，不得用静态假设跳过所有测试；
- 不把空结果当失败：契约允许空分页时验证 `records=[]`、`total=0`；
- 不把“当前没有数据”伪造成“接口成功返回了目标业务数据”。

### Step 6：实现写操作保护

新增、编辑、启停测试必须同时满足：

```text
TEST_API_WRITE_ENABLED=true
TEST_API_WRITE_INST_CODE=<专用机构>
```

否则明确 skip 或配置阻塞，不接触共享租户。写场景要求：

- 合同编号、文件名等可识别字段使用唯一值；
- 编辑前读取真实详情，使用真实 `contractId`/`lineId`；
- 编辑目标值必须与原值不同；
- 能恢复的授权状态使用 `try/finally` 恢复；
- 负向写请求必须验证原数据未改变；
- 新增成功后只记录返回 ID 和残留风险；
- 只有存在可靠删除/回收能力时才声明清理完成；
- 不调用旧接口冒充删除，也不为了清理执行未经授权的删除。

纯存储、周期重叠、重复套餐、重复合同号等场景必须使用真实前置数据或专用造数环境。没有满足条件的数据时 skip，并在 README 说明如何准备。

### Step 7：生成 README

根 README 至少说明：

1. API 套件与 UI 套件的隔离；
2. 必需/可选环境变量及 token 安全要求；
3. API 根地址不会自动追加 `/api`；
4. `npm run test:api -- --list`、模块级运行和 grep 示例；
5. 动态数据发现和数据缺失时的 skip 规则；
6. 写操作开关、专用机构和清理限制；
7. 15 个接口/目标 IT 覆盖统计（按实际模块填写）；
8. 当前实现偏差、联调确认项和未执行的故障注入场景。

模块 README 还应列出 spec 分组、分页值、读写范围、已知响应字段差异和真实环境前置。

## 7. API 测试与 UI 测试的边界

| 场景 | API 自动化 | UI 自动化/故障注入 |
| --- | --- | --- |
| HTTP 方法、路径、请求参数 | ✅ | 可由网络监听辅助验证 |
| envelope、错误码、字段类型 | ✅ | 不作为 UI 唯一断言 |
| 分页、空结果、动态外键 | ✅ | 可补充页面展示 |
| toast、弹窗关闭、loading | ❌ | ✅ |
| 5xx 后旧页面数据保留 | ❌ 真实 API 不伪造 | ✅ mock/故障注入 |
| 超时、重试、网络断开 | 仅在专门故障环境 | ✅/故障注入 |
| 页面列名、状态标签、可见性 | ❌ | ✅ |
| 写接口数据落库 | ✅ 专用环境 | ✅ 页面反馈 + 数据回显 |

## 8. 版本迭代规则

- 优先修改既有 `client/fixture/schema/data/spec`，不要为同一接口复制第二套实现；
- 保留既有 `IT-*` 标题和 spec 主线，新增场景使用同功能域编号；
- 接口契约变更时先更新请求构造和断言，再更新 README 的覆盖与偏差；
- 当前前端实现变化但契约未变时，保留契约断言并记录现状变化；
- 移除已废弃接口或 IT 用例前，确认 `03` 已同步移除或标记历史迁移；
- 只改目标模块和必要的 Tests 配置，不顺手重构 UI 套件。

## 9. 验证门禁

脚本生成或修改后必须执行：

```powershell
npm --prefix Tests run typecheck
npm --prefix Tests run test:api -- --list
git diff --check
```

必须确认：

- TypeScript 编译通过；
- API config 能发现目标 spec，且不触发 UI global setup；
- 发现的 IT 编号与 `03` 目标清单一致，无重复、遗漏或超范围；
- 相对 import 从实际目录层级计算正确；
- package script、config 的 `testDir/testMatch` 和真实目录一致；
- 报告目录已忽略，token、`.env`、storageState 未进入源码或报告；
- 未配置 API 地址/token 时没有声称真实接口通过；
- 若配置了真实只读环境，先执行 P0 只读场景，再执行写场景；
- 写场景执行后检查恢复结果和新增数据残留，不以“请求发出”代替业务成功。

有真实环境时建议按顺序执行：

```powershell
# 先确认发现，不发送 API 请求
npm --prefix Tests run test:api -- --list

# 先跑只读范围
npm --prefix Tests run test:api:billing -- --grep "IT-BILLCFG-ORG|IT-BILLCFG-TENANT-PAGE|IT-BILLCFG-CONTRACT-PAGE"

# 最后才显式开启专用写测试
$env:TEST_API_WRITE_ENABLED='true'
$env:TEST_API_WRITE_INST_CODE='<专用机构>'
npm --prefix Tests run test:api:billing -- --grep "@write"
```

命令中的模块名、grep 和专用机构必须替换为当前项目实际值；不得猜测 API URL 或 token。

## 10. 推荐输出格式

执行结束时向用户报告：

```markdown
## 已生成
- 目录与配置：...
- Client/Fixture/Schema/Data：...
- Spec：...（N 个 IT 用例）
- README 与运行脚本：...

## 覆盖与偏差
- 已覆盖接口/IT：...
- 当前实现偏差/联调确认项：...
- 数据依赖和写操作限制：...

## 验证结果
- typecheck：通过/失败（原因）
- test --list：发现 N 条
- 真实 API 执行：已执行/未执行；若未执行说明缺少的环境变量
- 未提交、未推送：除非用户明确要求
```

## 11. 禁止事项速查

- 禁止把 UI 的 `TEST_BASE_URL`、global setup、browser context 或 storageState 当作 API 鉴权方案；
- 禁止默认发送 `Authorization: Bearer`，除非契约明确如此；
- 禁止硬编码 token、密码、机构编码、合同 ID、行 ID 或真实业务数据；
- 禁止自动给 `TEST_API_BASE_URL` 追加 `/api`；
- 禁止只断言 HTTP 200、`retCode=0` 或“有响应”；
- 禁止把 HTTP 200 的业务错误误判为成功；
- 禁止用 UI route mock 伪造真实 API 5xx/超时测试通过；
- 禁止在共享租户执行未经开关保护的新增、编辑和启停；
- 禁止使用不存在的删除接口或旧版接口清理新增合同；
- 禁止没有实际数据检查就批量 `test.skip`；
- 禁止 spec 目录、config `testMatch` 和运行 script 使用不同命名；
- 禁止为同一个模块维护额外的 IT 映射文件；
- 禁止未完成 typecheck 和 `--list` 就宣称脚本可用；
- 禁止修改与本次 API 自动化无关的文件。

## 12. 完成边界

本技能完成后，目标是得到一套**可被 Playwright 发现、可通过 TypeScript 检查、配置真实环境后可执行**的 API 自动化起步套件。真实接口是否可用、数据是否满足强前置、后端是否实现契约，必须以实际运行结果为准，不由脚本生成过程推断。
