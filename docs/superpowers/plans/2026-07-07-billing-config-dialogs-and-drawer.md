# Billing Config Dialogs And Drawer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 更新 `MySpace/V1.6.1.需求.md` 的 2.2 小节，补齐新增弹窗、编辑弹窗、明细抽屉说明，插入 3 张原型图，并修正列表页中与弹窗交互不一致的描述。

**Architecture:** 保持现有 Markdown 文档结构不变，在已有“列表页”后继续追加结构化小节。所有描述以现有 3 张原型图为准，统一使用“新增弹窗 / 编辑弹窗 / 明细抽屉”命名，不扩展到原型未体现的能力。

**Tech Stack:** Markdown、PNG 原型图引用

---

## Chunk 1: 更新 2.2 章节内容

### Task 1: 修正列表页中的编辑描述

**Files:**
- Modify: `MySpace/V1.6.1.需求.md:67-76`
- Reference: `MySpace/OmicsOne-Core-V1.6.2（仅适用于云方案版本）/img/列表页.png`
- Reference: `MySpace/OmicsOne-Core-V1.6.2（仅适用于云方案版本）/img/新增弹窗.png`

- [ ] **Step 1: 将“编辑页”统一改成“编辑弹窗”**
- [ ] **Step 2: 将“已产生分析消耗时”的描述改为“编辑弹窗全部字段置灰，确定按钮置灰不可点击”**
- [ ] **Step 3: 保持列表页其他规则不变**

### Task 2: 新增“新增弹窗”结构化说明

**Files:**
- Modify: `MySpace/V1.6.1.需求.md`
- Reference: `MySpace/OmicsOne-Core-V1.6.2（仅适用于云方案版本）/img/新增弹窗.png`

- [ ] **Step 1: 插入新增弹窗原型图链接**
- [ ] **Step 2: 补充弹窗目标、基础信息、付费信息说明**
- [ ] **Step 3: 补充检测项目配额区、按钮、校验与边界说明**

### Task 3: 新增“编辑弹窗”结构化说明

**Files:**
- Modify: `MySpace/V1.6.1.需求.md`
- Reference: `MySpace/OmicsOne-Core-V1.6.2（仅适用于云方案版本）/img/新增弹窗.png`

- [ ] **Step 1: 说明编辑弹窗与新增弹窗结构一致**
- [ ] **Step 2: 明确“未产生分析消耗 / 已产生分析消耗”两种状态**
- [ ] **Step 3: 补充按钮禁用规则与只读限制**

### Task 4: 新增“明细抽屉”结构化说明

**Files:**
- Modify: `MySpace/V1.6.1.需求.md`
- Reference: `MySpace/OmicsOne-Core-V1.6.2（仅适用于云方案版本）/img/明细抽屉.png`

- [ ] **Step 1: 插入明细抽屉原型图链接**
- [ ] **Step 2: 说明打开方式、宽度占比、顶部汇总区**
- [ ] **Step 3: 说明用量明细表、历史变更明细表、底部关闭按钮**

### Task 5: 文档一致性校验

**Files:**
- Modify: `MySpace/V1.6.1.需求.md`

- [ ] **Step 1: 检查全文是否仍有“新增页 / 编辑页”表述**
- [ ] **Step 2: 检查 3 张原型图引用路径是否正确**
- [ ] **Step 3: 检查“明细”是否统一描述为只读抽屉且底部仅保留“关闭”按钮**
- [ ] **Step 4: 读取最终文档并核对关键段落已写入**
