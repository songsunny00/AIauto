# 本地自定义 Skills 目录说明

## 1. 定位

`skills/` 用于沉淀本仓库自定义的流程型 skill，服务于“需求 → 开发 → 测试”一体化协作。

这类 skill 主要负责：

- 解析输入文档
- 生成结构化草稿
- 约束目录与命名规则
- 输出自动化骨架建议

## 2. 命名规则

- 目录名统一使用 kebab-case
- 每个 skill 一个独立目录
- 每个目录至少包含一个 `SKILL.md`
- 优先按“能力”命名，不按“阶段编号”命名

示例：

```text
skills/
├─ requirement-doc-bootstrap/
│  └─ SKILL.md
├─ requirement-analysis/
│  └─ SKILL.md
├─ testcase-generation/
│  └─ SKILL.md
├─ ui-automation-bootstrap/
│  └─ SKILL.md
├─ playwright-test-implementation/
│  └─ SKILL.md
├─ api-automation-bootstrap/
│  └─ SKILL.md
└─ prd-git-commit/
   └─ SKILL.md
```

## 3. 第一批 skills

### 3.1 requirement-doc-bootstrap

- 输入：原始需求文档、会议纪要、聊天记录、补充说明、现有 `Prds/` 路径
- 输出：需求澄清清单，或在确认完成后输出 `01-需求文档.md` 初稿建议
- 规则：若需求不清晰，先讨论和头脑风暴；若模块路径已存在则优先复用；若不存在则先给建议路径，最终由用户确认后再写

### 3.2 requirement-analysis

- 输入：`01/01b/01c/02`
- 输出：目标模块、`REQ` 清单、验收点、影响资产

### 3.3 testcase-generation

- 输入：`01 + 02`
- 输出：`03-测试用例文档.md` 结构建议、`FT/IT`、UI/API/手工覆盖建议

### 3.4 ui-automation-bootstrap

- 输入：`03`、可选 `01c`
- 输出：UI 自动化目录结构、README 要点、spec/page/fixture/data 骨架建议
- 边界：只负责骨架、拆分、命名、优先级与可测性建议，不负责完整 Playwright 脚本实现

### 3.5 playwright-test-implementation

- 输入：`03`、相关前端代码、既有 `Tests/ui/...` 目录、失败工件（如 `junit.xml` / `error-context.md` / `trace.zip`）
- 输出：真实可执行的 Playwright 脚本代码、版本迭代修改方案、失败修复约束与回归建议
- 边界：负责具体 `spec/page/fixture/data/config` 实现与维护；涉及新模块时通常在 `ui-automation-bootstrap` 之后使用

### 3.6 api-automation-bootstrap

- 输入：`02/03`、接口信息
- 输出：API 自动化目录结构、README 要点、spec/client/fixture/data/schema 骨架建议

### 3.7 prd-git-commit

- 输入：自然语言指令（如"提交需求""更新PRD""更新文档"）+ `Prds/` 目录下的文档变更
- 输出：Git 暂存-提交-推送结果；涉及 `01-需求文档` 变更时自动更新 `05-变更记录.md` 并通过钉钉 Webhook 通知开发与测试同事
- 规则：按文件精确暂存（禁止 `git add .`）；变更记录只追加不修改；`REQ` 编号不自造；Webhook 配置从 `.env` 读取（参考 `.env.example`）

### 3.8 detail-design-bootstrap

- 输入：`01-需求文档.md` + `02b-后台文档.md` + 前端模块代码路径（或前端 spec，暂留作占位）
- 输出：`02-详细设计文档.md` + `02-详细设计文档.证据表.md`（含 REQ 来源映射、需求↔代码偏差清单、`[DESIGN-SUPPLEMENT]` 补充清单、附录 A 自检报告）
- 边界：仅生成 02 详设与证据表；不修改 `01`/`02b`/前端代码；不替代 `requirement-analysis` / `testcase-generation`；仅在用户显式触发时覆盖既有 `02`，覆盖前自动备份到 `.bak.{timestamp}`
- 核心约束：需求优先（代码偏差入证据表，正文写需求版本）；需求未提及时沿用代码实际逻辑；禁止凭空臆测，仅当需求 + 代码均无时才允许补充并显式标注 `[DESIGN-SUPPLEMENT]`

## 4. 当前边界

第一批最小闭环 skills 为 3.1~3.6。`prd-git-commit`（3.7）为面向产品角色的 Git 文档管理补充技能，服务于需求变更后的提交、留痕与通知一体化流程。`detail-design-bootstrap`（3.8）为面向项目开发管理人的详设生成技能，服务于需求 → 详设 → 测试用例的中间环节自动化。

本批次中，UI 自动化拆分为两层：

- `ui-automation-bootstrap`：负责骨架、目录、README、命名与优先级建议
- `playwright-test-implementation`：负责真实脚本生成、版本迭代修改、失败修复与回归约束

本批次不补：

- `prototype-to-testpoint`
- `requirement-to-task`
- `ui-failure-analysis`
- `traceability-audit`

说明：`requirement-doc-bootstrap` 负责把原始需求整理成可进入 `01-需求文档.md` 的输入；`requirement-analysis` 则更多用于在已有 `01/01b/01c/02` 基础上继续抽取结构化信息。

这些能力可在第二批再补。
