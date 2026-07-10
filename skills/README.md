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

### 3.5 api-automation-bootstrap

- 输入：`02/03`、接口信息
- 输出：API 自动化目录结构、README 要点、spec/client/fixture/data/schema 骨架建议

### 3.6 prd-git-commit

- 输入：自然语言指令（如"提交需求""更新PRD""更新文档"）+ `Prds/` 目录下的文档变更
- 输出：Git 暂存-提交-推送结果；涉及 `01-需求文档` 变更时自动更新 `05-变更记录.md` 并通过钉钉 Webhook 通知开发与测试同事
- 规则：按文件精确暂存（禁止 `git add .`）；变更记录只追加不修改；`REQ` 编号不自造；Webhook 配置从 `.env` 读取（参考 `.env.example`）

## 4. 当前边界

第一批最小闭环 skills 为 3.1~3.5。`prd-git-commit`（3.6）为面向产品角色的 Git 文档管理补充技能，服务于需求变更后的提交、留痕与通知一体化流程。

本批次不补：

- `prototype-to-testpoint`
- `requirement-to-task`
- `ui-failure-analysis`
- `traceability-audit`

说明：`requirement-doc-bootstrap` 负责把原始需求整理成可进入 `01-需求文档.md` 的输入；`requirement-analysis` 则更多用于在已有 `01/01b/01c/02` 基础上继续抽取结构化信息。

这些能力可在第二批再补。
