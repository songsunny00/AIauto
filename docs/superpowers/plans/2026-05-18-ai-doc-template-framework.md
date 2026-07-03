# AI 文档模板体系实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按照 [设计文档](../specs/2026-05-18-ai-doc-template-framework-design.md) 在 `d:\AIauto\` 建立 `framework/` 文档模板体系（9 份模板 + 9 份 Prompt + 示例文档迁移 + README）。

**Architecture:** 纯文件交付，无代码、无构建、无测试框架。每个文件按 spec 第 5、6、7、8、9 节定义的骨架写作。验收通过 spec 9.2 的清单逐项打勾完成。

**Tech Stack:** Markdown。当前工作目录不是 git 仓库，所有"commit"步骤替换为"将当前任务在 todo 中标记完成 + 人工 review checkpoint"。

**适配说明：** 由于产物全部为文档，原 TDD 流程不适用；每个文件的"测试"等价于按 spec 6.2/7.2 列的最低内容要求 + 模板自检清单逐项校验。

---

## Chunk 1：目录结构与示例迁移

### Task 1.1：创建 framework 目录骨架

**Files:**
- Create: `framework/`、`framework/templates/`、`framework/prompts/`、`framework/examples/OmicsDB-V1.0.0/`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p framework/templates framework/prompts framework/examples/OmicsDB-V1.0.0
```

- [ ] **Step 2: 验证目录存在**

```bash
ls framework
```

期望输出包含：`README.md` 暂无，`templates`、`prompts`、`examples` 三个目录。

### Task 1.2：迁移 OmicsDB 示例文档

**Files:**
- Copy: `V1.0.0_PRD.md` → `framework/examples/OmicsDB-V1.0.0/01-需求文档.md`
- Copy: `V1.0.0_详细说明书.md` → `framework/examples/OmicsDB-V1.0.0/04-详细设计文档.md`
- Copy: `V1.0.0_API.md` → `framework/examples/OmicsDB-V1.0.0/04-接口文档-历史版本.md`
- Copy: `data_deliver_PRD.md` → `framework/examples/OmicsDB-V1.0.0/00-data-deliver-PRD-历史版本.md`

- [ ] **Step 1: 复制四份示例文档（不删除原文件）**

```bash
cp V1.0.0_PRD.md framework/examples/OmicsDB-V1.0.0/01-需求文档.md
cp V1.0.0_详细说明书.md framework/examples/OmicsDB-V1.0.0/04-详细设计文档.md
cp V1.0.0_API.md framework/examples/OmicsDB-V1.0.0/04-接口文档-历史版本.md
cp data_deliver_PRD.md framework/examples/OmicsDB-V1.0.0/00-data-deliver-PRD-历史版本.md
```

- [ ] **Step 2: 校验四份文件存在且字节数与源一致**

```bash
ls -la framework/examples/OmicsDB-V1.0.0/
```

- [ ] **Step 3: 复制成功后删除根目录原文件**

```bash
rm V1.0.0_PRD.md V1.0.0_详细说明书.md V1.0.0_API.md data_deliver_PRD.md
```

- [ ] **Step 4: 确认根目录干净**

```bash
ls *.md
```

期望仅剩 `AGENTS.md`。

### Task 1.3：处理旧 templates 目录

**Files:**
- Inspect: `templates/`

- [ ] **Step 1: 检查 templates/ 下每个文件是否为空或占位**

```bash
wc -l templates/*.md
```

- [ ] **Step 2: 如果全部为占位/空（≤1 行），直接删除**

```bash
rm -rf templates
```

- [ ] **Step 3: 如果发现非空文件，先迁入 examples/legacy-templates/ 再删除**

```bash
mkdir -p framework/examples/legacy-templates
mv templates/*.md framework/examples/legacy-templates/
rmdir templates
```

- [ ] **Step 4: 完成 Chunk 1，请求人工 checkpoint review**

---

## Chunk 2：framework/README.md

### Task 2.1：编写 README

**Files:**
- Create: `framework/README.md`

按 spec 4.1 列出的必填章节编写：

1. 框架目标和适用项目类型
2. 文档链路图（复用 spec 第 3 节链路图）
3. 每份模板的用途、输入、输出、下游消费者（一张表）
4. 推荐使用步骤（spec 第 10 节）
5. 文件命名规范（spec 5.2）
6. Prompt 使用方式（spec 第 7 节）
7. 示例文档说明（指向 examples/OmicsDB-V1.0.0/）
8. 质量门和自检方式（spec 9.1）
9. "不要把示例内容复制成新项目事实"的提醒

- [ ] **Step 1: 写入文件**
- [ ] **Step 2: 按 spec 4.1 的 9 项逐条勾选确认存在**
- [ ] **Step 3: 在 README 末尾附「自检清单已通过」标记**

---

## Chunk 3：模板文件（9 份）

每个模板必须按 spec 6 节骨架编写，包含：

- `## 0. 使用说明`（上游、下游、产出原则、命名约定）
- 正文章节（按 spec 第 8 节定义的内容边界）
- 每个正文章节的「填写指引/字段清单/示例片段/常见错误」四件套
- `## 附录 A. 与下游文档的字段映射`
- `## 附录 B. 一致性检查清单`

每个模板编写完成后必须执行 spec 6.2 的最低内容要求逐项核对。

### Task 3.1：01-需求文档模板

**Files:**
- Create: `framework/templates/01-需求文档.md`

正文章节（spec 8.1）：项目概述、项目目标、角色与权限、主业务流程、功能清单、模块详细需求、全局规则、非功能需求、外部系统依赖、验收标准。

- [ ] **Step 1: 写入文件骨架（0+10 正文+附录 A+附录 B）**
- [ ] **Step 2: 给每个正文章节填入四件套（指引/字段清单/示例片段/常见错误）**
- [ ] **Step 3: 示例片段从 `framework/examples/OmicsDB-V1.0.0/01-需求文档.md` 摘 1 段**
- [ ] **Step 4: 附录 A 至少声明 5 条关键字段映射（如 角色编码、状态、OA单号、任务单号、申请时间）**
- [ ] **Step 5: 附录 B 自检清单至少 8 条**
- [ ] **Step 6: 按 spec 8.1「不应包含」核对，无表结构/接口路径/前端组件细节**

### Task 3.2：02-数据流转设计模板

**Files:**
- Create: `framework/templates/02-数据流转设计.md`

正文（spec 8.2）：外部系统关系、核心数据实体、实体关系、主流程数据流、状态流转、权限过滤规则、异常流和补偿策略、数据一致性要求。

- [ ] **Step 1-5：同 Task 3.1 流程**
- [ ] **Step 6: 校验未涉及页面布局/完整接口定义**

### Task 3.3：03-原型文档模板

**Files:**
- Create: `framework/templates/03-原型文档.md`

正文（spec 8.3）：页面清单、路由建议、页面布局、表格列定义、表单字段定义、弹窗/抽屉/详情区定义、操作按钮与交互状态、错误提示和空状态、HTML 原型生成要求。

- [ ] **Step 1-5：同 Task 3.1 流程**
- [ ] **Step 6: 「HTML 原型生成要求」章节指向 `03-原型-HTML说明.md`**

### Task 3.4：03-原型-HTML 说明模板

**Files:**
- Create: `framework/templates/03-原型-HTML说明.md`

正文（spec 8.4）：HTML 文件组织方式、可复用组件模板来源、页面样式规范、交互模拟范围、静态数据约定、评审方式、不进入生产代码的声明。

- [ ] **Step 1-5：同 Task 3.1 流程**
- [ ] **Step 6: 明确输出路径 `docs/prototypes/html/`，入口 `index.html`**
- [ ] **Step 7: 明确组件模板来源 `product-design-system-main/product-design-system-main/product-context/组件模板/`**

### Task 3.5：04-详细设计文档模板

**Files:**
- Create: `framework/templates/04-详细设计文档.md`

正文（spec 8.5）：引言、系统概述、技术架构、功能结构、模块详细设计、接口设计、数据库设计、安全设计、缓存设计、日志设计、错误码定义、部署与配置说明。

- [ ] **Step 1-5：同 Task 3.1 流程**
- [ ] **Step 6: 「模块详细设计」每个功能小节强制「路由与接口映射」表（spec 8.5.1），表头：功能 / 前端路由 / 后端接口 / 权限编码**
- [ ] **Step 7: 「接口设计」章节注明它是接口的唯一事实源；下游派生 04a 与 OpenAPI**
- [ ] **Step 8: 示例摘自 `framework/examples/OmicsDB-V1.0.0/04-详细设计文档.md`**

### Task 3.6：04a-API 接口文档模板（派生）

**Files:**
- Create: `framework/templates/04a-API接口文档.md`

正文（spec 8.5.2）：通用规范（请求前缀、响应结构、分页、时间格式、认证、错误码索引）、接口分组、每个接口的方法/路径/权限/请求参数表/响应字段表/请求示例/响应示例/错误码。

- [ ] **Step 1-5：同 Task 3.1 流程**
- [ ] **Step 6: 顶部声明「本文档为 04-详细设计文档.md 接口章节的派生副本，禁止独立修改接口语义」**
- [ ] **Step 7: 输出路径声明为 `docs/04a-API接口文档.md`**
- [ ] **Step 8: 与详设冲突时的处理规则（以详设为准并重新生成）**

### Task 3.7：05-前端文档模板

**Files:**
- Create: `framework/templates/05-前端文档.md`

正文（spec 8.6）：前端技术栈、路由结构、页面结构、组件拆分、状态管理、API 调用关系、表单/表格配置、权限控制、交互细节、异常处理、前端验收清单。

- [ ] **Step 1-5：同 Task 3.1 流程**
- [ ] **Step 6: 「API 调用关系」章节字段清单与 04/04a 完全一致（路径、字段、错误码）**

### Task 3.8：06-测试用例文档模板

**Files:**
- Create: `framework/templates/06-测试用例文档.md`

正文（spec 8.7）：测试范围、测试环境、功能用例、接口用例、权限用例、异常用例、回归测试清单、测试报告字段要求。

- [ ] **Step 1-5：同 Task 3.1 流程**
- [ ] **Step 6: 功能用例字段：用例编号/前置条件/步骤/预期结果/优先级**
- [ ] **Step 7: 接口用例字段：接口/方法/请求参数/正常返回/异常返回/边界值/权限场景**

### Task 3.9：07-OpenAPI 规范说明模板

**Files:**
- Create: `framework/templates/07-OpenAPI规范说明.md`

正文（spec 8.8）：输出路径、OpenAPI 版本、来源原则、命名一致性、触发方式、不进入业务代码的声明、与详设冲突处理。

- [ ] **Step 1-5：同 Task 3.1 流程**
- [ ] **Step 6: 输出路径声明为 `docs/api/openapi.yaml`，OpenAPI 3.0+**

### Task 3.10：Chunk 3 整体校验

- [ ] **Step 1: 列出 `framework/templates/` 共 9 个文件**

```bash
ls framework/templates/
```

- [ ] **Step 2: 对每个模板核对 spec 6.2 的 8 项最低内容**
- [ ] **Step 3: 抽查字段命名是否符合 spec 5.3（API camelCase、DB snake_case、路径 kebab-case）**
- [ ] **Step 4: 抽查角色编码是否符合 spec 5.4（ADMIN/DELIVERY/SALES/CUSTOMER 大写）**
- [ ] **Step 5: 请求人工 checkpoint review Chunk 3**

---

## Chunk 4：Prompt 文件（9 份）

每个 Prompt 按 spec 7 节固定 5 段结构：角色 / 输入 / 任务 / 约束 / 输出。

每个 Prompt 必须：

- 指向唯一对应模板
- 列出必读上游文档（按 spec 7.1 表）
- 说明输出路径（按 spec 5.2 命名）
- 要求遵循模板填写指引
- 要求执行模板附录 B 自检清单
- 要求不要复制示例事实到新项目

### Task 4.1：01-需求文档 Prompt

**Files:**
- Create: `framework/prompts/01-需求文档.prompt.md`

- [ ] **Step 1: 写入 5 段结构**
- [ ] **Step 2: 角色：产品经理**
- [ ] **Step 3: 上游：用户原始需求、业务背景、访谈记录**
- [ ] **Step 4: 输出路径 `docs/01-需求文档.md`**
- [ ] **Step 5: 核对 spec 7.2 的 6 项最低要求**

### Task 4.2：02-数据流转设计 Prompt

**Files:**
- Create: `framework/prompts/02-数据流转设计.prompt.md`

- [ ] **Step 1-4：同 Task 4.1**（角色：系统分析师；上游：需求文档；输出 `docs/02-数据流转设计.md`）
- [ ] **Step 5: 核对最低要求**

### Task 4.3：03-原型文档 Prompt

**Files:**
- Create: `framework/prompts/03-原型文档.prompt.md`

- [ ] **Step 1-4**（角色：产品/交互设计师；上游：需求 + 数据流转；输出 `docs/03-原型文档.md`）
- [ ] **Step 5: 核对最低要求**

### Task 4.4：03-原型-HTML Prompt

**Files:**
- Create: `framework/prompts/03-原型-HTML.prompt.md`

- [ ] **Step 1-4**（角色：前端原型工程师；上游：03-原型文档 + HTML 组件模板；输出 `docs/prototypes/html/*.html`）
- [ ] **Step 5: 显式说明只生成静态 HTML，不进入 `src/`**

### Task 4.5：04-详细设计文档 Prompt

**Files:**
- Create: `framework/prompts/04-详细设计文档.prompt.md`

- [ ] **Step 1-4**（角色：架构师；上游：需求 + 数据流转 + 原型；输出 `docs/04-详细设计文档.md`）
- [ ] **Step 5: 显式要求每个功能小节填写「路由与接口映射」表**

### Task 4.6：04a-API 接口文档 Prompt

**Files:**
- Create: `framework/prompts/04a-API接口文档.prompt.md`

- [ ] **Step 1-4**（角色：后端工程师；上游：详细设计接口章节；输出 `docs/04a-API接口文档.md`）
- [ ] **Step 5: 显式禁止新增/修改接口语义，仅做格式化派生**

### Task 4.7：05-前端文档 Prompt

**Files:**
- Create: `framework/prompts/05-前端文档.prompt.md`

- [ ] **Step 1-4**（角色：前端工程师；上游：需求 + 数据流转 + 原型 + 详细设计；输出 `docs/05-前端文档.md`）
- [ ] **Step 5: 显式要求 API 调用关系与 04/04a 字段一致**

### Task 4.8：06-测试用例文档 Prompt

**Files:**
- Create: `framework/prompts/06-测试用例文档.prompt.md`

- [ ] **Step 1-4**（角色：测试工程师；上游：需求 + 数据流转 + 原型 + 详细设计 + 前端文档；输出 `docs/06-测试用例文档.md`）
- [ ] **Step 5: 显式要求功能用例 + 接口用例两层覆盖**

### Task 4.9：07-OpenAPI 规范 Prompt

**Files:**
- Create: `framework/prompts/07-OpenAPI规范.prompt.md`

- [ ] **Step 1-4**（角色：后端工程师；上游：详细设计接口章节；输出 `docs/api/openapi.yaml`）
- [ ] **Step 5: 显式说明 OpenAPI 3.0+，禁止偏离详细设计语义**

### Task 4.10：Chunk 4 整体校验

- [ ] **Step 1: 列出 `framework/prompts/` 共 9 个文件**

```bash
ls framework/prompts/
```

- [ ] **Step 2: 对每个 Prompt 核对 spec 7.2 的 6 项最低要求**
- [ ] **Step 3: 对照 spec 7.1 表逐行确认每个 Prompt 的上游依赖正确**
- [ ] **Step 4: 请求人工 checkpoint review Chunk 4**

---

## Chunk 5：最终验收

### Task 5.1：执行 spec 9.2 框架文件验收清单

- [ ] `framework/README.md` 存在并包含 4.1 所列 9 项内容
- [ ] `framework/templates/` 下 9 个模板文件全部存在
- [ ] `framework/prompts/` 下 9 个 Prompt 文件全部存在
- [ ] 每份模板包含 使用说明 + 字段映射附录 + 自检清单
- [ ] 每份 Prompt 指向唯一模板且列出上游
- [ ] 详细设计模板包含「路由与接口映射」表强制要求
- [ ] 04a 模板声明详设为唯一事实源，输出路径 `docs/04a-API接口文档.md`
- [ ] 07 模板声明输出 `docs/api/openapi.yaml`，详设为唯一事实源
- [ ] 示例文档迁移路径与 spec 4.2 一致（4 份示例文件存在于 `framework/examples/OmicsDB-V1.0.0/`）
- [ ] 旧 `templates/` 已按规则处理（非空内容未丢失）
- [ ] HTML 原型说明明确输出 `docs/prototypes/html/`，不进入生产代码

### Task 5.2：试跑验证（可选）

- [ ] 选一个小型功能（如「用户登录」），按 Prompt 链路：需求 → 数据流 → 原型 → 详设 → 04a + 05 + 06，跑一遍
- [ ] 记录跑通过程中暴露的模板/Prompt 缺陷
- [ ] 将缺陷回填到对应模板/Prompt 中

### Task 5.3：完成交付

- [ ] 在 `framework/README.md` 末尾添加 `## 变更记录` 段，写入首版日期 2026-05-18 与 spec 引用
- [ ] 通知用户：framework/ 已完成，可开始用于新项目

---

## 已知风险与缓解

| 风险 | 缓解 |
|---|---|
| 模板写得过于抽象，AI 仍不会填 | 每节强制示例片段，从 OmicsDB 示例摘真实段落 |
| 派生文档（04a / OpenAPI）与详设漂移 | Prompt 明确禁止独立修改语义，冲突时重生成 |
| 用户日后想加阶段（如运维文档） | 模板/Prompt 命名带阶段编号，加新文件即可，不破坏现有 |
| 当前不是 git 仓库，无法追踪变更 | 每个 Chunk 完成后人工 checkpoint review；建议用户后续将本目录改为 git 仓库 |
