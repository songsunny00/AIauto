# Commercial Billing List Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `MySpace/V1.6.1.需求.md` 中“2.2 配置中心新增【商业化计费配置】页面”的“列表页”章节改写为结构化分段版，补齐与原型一致的展示和交互说明。

**Architecture:** 保留现有章节层级，仅替换“### 列表页”下的零散条目，改为页面目标、查询区、主列表区、展开明细区、操作规则、状态规则、分页与空态、边界说明等固定小节。内容以原型可见信息为主，补充必要业务规则，不提前扩展到新增、编辑、明细页。

**Tech Stack:** Markdown

---

## Chunk 1: 列表页章节改写

### Task 1: 明确改写范围与保留结构

**Files:**
- Modify: `MySpace/V1.6.1.需求.md`
- Reference: `MySpace/OmicsOne-Core-V1.6.2（仅适用于云方案版本）/OmicsOne-Core-V1.6.2（仅适用于云方案版本）.md`

- [ ] **Step 1: 确认仅改写列表页章节**

Check: 仅处理 `### 列表页`，不扩展到新增、编辑、明细页。

- [ ] **Step 2: 确认结构化分段版小节**

Sections:
- 页面目标
- 查询区
- 主列表区
- 展开明细区
- 操作规则
- 状态规则
- 分页与空态
- 边界说明

- [ ] **Step 3: 标记与原型冲突的旧描述**

Rule: 删除或修正“批量操作”等原型未体现内容。

### Task 2: 写入结构化内容

**Files:**
- Modify: `MySpace/V1.6.1.需求.md`

- [ ] **Step 1: 重写查询区说明**

Include: 查询项、控件类型、查询/重置/新增按钮、默认加载规则。

- [ ] **Step 2: 重写主列表区说明**

Include: 主表字段、主记录含义、状态字段和操作列。

- [ ] **Step 3: 新增展开明细区说明**

Include: 展开/收起交互、子表字段、数据归属。

- [ ] **Step 4: 补充操作规则与状态规则**

Include: 编辑、明细、启用/禁用、状态判定优先级。

- [ ] **Step 5: 补充分页与边界说明**

Include: 总条数、每页条数、页码切换、空态、查询无结果态。

### Task 3: 自检一致性

**Files:**
- Modify: `MySpace/V1.6.1.需求.md`

- [ ] **Step 1: 对照原型检查字段和交互**

Expected: 不新增原型未体现的页面元素，不遗漏展开明细区。

- [ ] **Step 2: 对照现有需求检查术语一致性**

Expected: 使用“机构名称/检测项目/产品套餐/合同状态”等现有术语。

- [ ] **Step 3: 保持改动范围收敛**

Expected: 仅修改列表页相关内容，不重写相邻章节。
