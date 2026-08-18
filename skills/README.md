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

### 3.2 testcase-generation

- 输入：`01 + 02`
- 输出：`03-测试用例文档.md` 结构建议、`FT/IT`、UI/API/手工覆盖建议

### 3.3 ui-automation-bootstrap

- 输入：`03`、可选 `01c`
- 输出：UI 自动化目录结构、README 要点、spec/page/fixture/data 骨架建议
- 边界：只负责骨架、拆分、命名、优先级与可测性建议，不负责完整 Playwright 脚本实现

### 3.4 playwright-test-implementation

- 输入：`03`、相关前端代码、既有 `Tests/ui/...` 目录、失败工件（如 `junit.xml` / `error-context.md` / `trace.zip`）
- 输出：真实可执行的 Playwright 脚本代码、版本迭代修改方案、失败修复约束与回归建议
- 边界：负责具体 `spec/page/fixture/data/config` 实现与维护；涉及新模块时通常在 `ui-automation-bootstrap` 之后使用

### 3.5 api-automation-bootstrap

- 输入：`02/03`、接口信息
- 输出：API 自动化目录结构、README 要点、spec/client/fixture/data/schema 骨架建议

### 3.7 prd-git-commit

- 输入：自然语言指令（如"提交需求""更新PRD""更新文档"）+ `Prds/` 目录下的文档变更
- 输出：Git 暂存-提交-推送结果；涉及 `01-需求文档` 变更时自动更新 `05-变更记录.md` 并通过钉钉 Webhook 通知开发与测试同事
- 规则：按文件精确暂存（禁止 `git add .`）；变更记录只追加不修改；`REQ` 编号不自造；Webhook 配置从 `.env` 读取（参考 `.env.example`）

### 3.7 detail-design-bootstrap

- 输入：`01-需求文档.md` + `02b-后台文档.md` + 前端模块代码路径（或前端 spec，暂留作占位）
- 输出：`02-详细设计文档.md` + `02-详细设计文档.证据表.md`（含 REQ 来源映射、需求↔代码偏差清单、`[DESIGN-SUPPLEMENT]` 补充清单、附录 A 自检报告）
- 边界：仅生成 02 详设与证据表；不修改 `01`/`02b`/前端代码；不替代 `testcase-generation`；仅在用户显式触发时覆盖既有 `02`，覆盖前自动备份到 `.bak.{timestamp}`
- 核心约束：需求优先（代码偏差入证据表，正文写需求版本）；需求未提及时沿用代码实际逻辑；禁止凭空臆测，仅当需求 + 代码均无时才允许补充并显式标注 `[DESIGN-SUPPLEMENT]`

### 3.9 version-archive

- 输入：版本号（如 V1.6.1）、`Prds/V1.6.1/` 目录、`Prds/CHANGELOG.md`、可选 `--full` 参数
- 输出：模块基线目录下的 `01/02/03`（带版本标记头）、`INDEX.md`、更新后的 `CHANGELOG.md`、归档报告
- 边界：仅回写正式交付物 01/02/03；不回写 01b/01c/02b/04/04b/05；不创建 Git commit 或 Tag；不自动创建模块目录；支持多模块拆分回写；一致性校验严格阻断
- 规则：由版本负责人 / PM 角色在版本测试结束后触发；按模块分别判断首次沉淀（全量覆盖）或增量合并（按 REQ 区块合并），`--full` 强制全量覆盖；从 01 已有「需求类型」列识别新增/修改/删除操作；增量合并非 REQ 区块的不确定项交用户确认；REQ 编号 + 测试编号一致性校验通过后才回写；归档完成后提示可执行封版

### 3.9 version-release

- 输入：版本号（如 V1.6.1）、`Prds/V1.6.1/` 目录、`Prds/CHANGELOG.md`、当前治理仓 Git 状态；恢复入口需额外提供 `--resume` 和完整 commit hash
- 输出：收敛后的 `Prds/CHANGELOG.md`（唯一封版记录）、单一封版 commit、annotated `Tag-Vx.y.z`、分支和 Tag 推送结果、封版报告
- 边界：不替代日常需求提交（由 `prd-git-commit` 负责）；不覆盖已存在的 Tag；不跨仓库操作；不使用 `git add .` 或 `git add -A`；不调用 `prd-git-commit`，不追加 `05-变更记录.md`，不发送钉钉通知；不将需求变更过程复制到 CHANGELOG
- 规则：校验归档已完成（归档门禁）→ 收敛 CHANGELOG 过程行为唯一封版记录 → 精确暂存版本文件 → 创建单一封版 commit → 创建 annotated Tag → 先推分支再推 Tag；支持 `--resume` 恢复中断的推送；纯治理类版本可跳过归档门禁

## 4. 当前边界

第一批最小闭环 skills 为 3.1~3.5。`prd-git-commit`（3.6）为面向产品角色的 Git 文档管理补充技能，服务于需求变更后的提交、留痕与通知一体化流程。`detail-design-bootstrap`（3.7）为面向项目开发管理人的详设生成技能，服务于需求 → 详设 → 测试用例的中间环节自动化。`version-archive`（3.8）和 `version-release`（3.9）为版本收尾技能，归档在前、封版在后，通过归档门禁串联。

本批次中，UI 自动化拆分为两层：

- `ui-automation-bootstrap`：负责骨架、目录、README、命名与优先级建议
- `playwright-test-implementation`：负责真实脚本生成、版本迭代修改、失败修复与回归约束

本批次不补：

- `prototype-to-testpoint`
- `requirement-to-task`
- `ui-failure-analysis`
- `traceability-audit`

说明：`requirement-doc-bootstrap` 负责把原始需求整理成可进入 `01-需求文档.md` 的输入。

这些能力可在第二批再补。
