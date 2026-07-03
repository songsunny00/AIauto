# Incremental Requirements Template Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `01a-增量需求文档` template and integrate it into the existing framework so incremental requirements can be merged back into the full `01` baseline without breaking the current `03 → 04 → 06` downstream flow.

**Architecture:** Keep `01-需求文档.md` as the only full baseline. Introduce `01a-增量需求文档.md` as a delta input and merge-back source, then update `README`, `01`, `03`, and `04` templates/prompts so incremental work flows through updated `01` while `01a` remains a scoped diff-audit artifact. Preserve the existing framework principle of heavy templates and light prompts.

**Tech Stack:** Markdown templates, Markdown prompt files, framework README, Python one-off verification scripts, ripgrep-based consistency checks.

> This workspace is not currently a git repository. In the steps below, every “Commit” step means “create a named local checkpoint after the verification command passes.” If this directory is later put under git, replace each checkpoint with a normal commit.

---

## Chunk 1: File map and implementation boundaries

### Files to create

- `framework/templates/01a-增量需求文档.md` — new incremental requirements template with change-oriented structure, merge-back rules, and consistency checklist.
- `framework/prompts/01a-增量需求文档.prompt.md` — lightweight generation prompt for the new template.

### Files to modify

- `framework/README.md` — add `01a` to the framework overview, document the incremental chain, and keep `01` as the baseline.
- `framework/templates/01-需求文档.md` — add merge-back guidance for incremental updates and checklist rules for version/status/traceability updates.
- `framework/prompts/01-需求文档.prompt.md` — clarify that incremental updates to full `01` must use “existing full 01 + approved 01a”.
- `framework/templates/03-原型文档.md` — add incremental-input guidance: main upstream is merged `01`, `01a` is optional diff-audit support, `02` remains optional.
- `framework/prompts/03-原型文档.prompt.md` — mirror the template’s upstream priority and incremental scope without duplicating structure.
- `framework/templates/04-详细设计文档.md` — add incremental-input guidance: main upstream is merged `01`, `01a` is optional diff-audit support, `02` remains optional.
- `framework/prompts/04-详细设计文档.prompt.md` — mirror the template’s upstream priority and incremental scope without duplicating structure.

### Files intentionally not touched

- `framework/templates/02-数据流转设计.md` and `framework/prompts/02-数据流转设计.prompt.md` — no new structure needed; only remain optional in chain language.
- `framework/templates/04b-后台文档.md`, `framework/templates/04c-前端文档.md`, `framework/templates/06-测试用例文档.md` and matching prompts — no direct structural change required for this feature.

---

## Chunk 2: Add the new 01a template and prompt

### Task 1: Create `01a-增量需求文档` assets

**Files:**
- Create: `framework/templates/01a-增量需求文档.md`
- Create: `framework/prompts/01a-增量需求文档.prompt.md`
- Test: in-place Python verification script run from workspace root

- [ ] **Step 1: Write the failing verification script for missing 01a assets**

Use this exact command script content:

```bash
python - <<'PY'
from pathlib import Path
checks = {
    Path('framework/templates/01a-增量需求文档.md'): [
        '## 0. 使用说明',
        '## 1. 变更概述',
        '## 2. 本次范围与边界',
        '## 3. 变更清单',
        '## 4. 逐功能点增量说明',
        '## 5. 回写全量 01 说明',
        '## 6. 增量验收标准',
        '## 附录 A. 回写任务清单',
        '## 附录 B. 一致性检查清单',
        '需求标题',
        '所属版本',
        '变更背景',
        '影响模块',
        '本次包含',
        '本次不包含',
        '容易被误解但明确不在范围内的边界',
        '变更类型',
        '引入版本',
        '最近变更版本',
        '当前状态',
        '关联验收编号',
    ],
    Path('framework/prompts/01a-增量需求文档.prompt.md'): [
        '## 角色',
        '## 输入',
        '## 任务',
        '## 约束',
        '## 输出',
        '回写全量 01',
    ],
}
for path, needles in checks.items():
    assert path.exists(), f'missing file: {path}'
    text = path.read_text(encoding='utf-8')
    for needle in needles:
        assert needle in text, f'missing {needle} in {path}'
print('01a assets verified')
PY
```

- [ ] **Step 2: Run the script to verify it fails before implementation**

Run:

```bash
python - <<'PY'
from pathlib import Path
checks = {
    Path('framework/templates/01a-增量需求文档.md'): [
        '## 0. 使用说明',
        '## 1. 变更概述',
        '## 2. 本次范围与边界',
        '## 3. 变更清单',
        '## 4. 逐功能点增量说明',
        '## 5. 回写全量 01 说明',
        '## 6. 增量验收标准',
        '## 附录 A. 回写任务清单',
        '## 附录 B. 一致性检查清单',
        '需求标题',
        '所属版本',
        '变更背景',
        '影响模块',
        '本次包含',
        '本次不包含',
        '容易被误解但明确不在范围内的边界',
        '变更类型',
        '引入版本',
        '最近变更版本',
        '当前状态',
        '关联验收编号',
    ],
    Path('framework/prompts/01a-增量需求文档.prompt.md'): [
        '## 角色',
        '## 输入',
        '## 任务',
        '## 约束',
        '## 输出',
        '回写全量 01',
    ],
}
for path, needles in checks.items():
    assert path.exists(), f'missing file: {path}'
    text = path.read_text(encoding='utf-8')
    for needle in needles:
        assert needle in text, f'missing {needle} in {path}'
print('01a assets verified')
PY
```

Expected: FAIL with `missing file: framework/templates/01a-增量需求文档.md`.

- [ ] **Step 3: Write the new template with the exact section skeleton and key tables**

Create `framework/templates/01a-增量需求文档.md` with these required sections and anchors:

```markdown
# 增量需求文档模板

## 0. 使用说明
- **上游输入**：用户原始变更诉求、当前全量 `docs/01-需求文档.md`、必要时已有 `docs/03-原型文档.md` / `docs/04-详细设计文档.md`
- **下游消费者**：全量 `01` 回写、`03` 原型、`04` 详细设计、开发、测试
- **产出原则**：只描述本次变化，不重写无关基线；功能点编号、角色编码、权限编码、字段口径必须沿用现有全量 `01`
- **命名约定**：输出到 `docs/01a-增量需求文档.md`

---

## 1. 变更概述
### 1.1 基本信息
| 项 | 内容 |
|---|---|
| 需求标题 | {} |
| 所属版本 | {} |
| 变更背景 | {} |
| 影响模块 | [] |

### 1.2 变更目标
### 1.3 影响范围判断

| 项 | 内容 |
|---|---|
| 是否影响数据流 | 是/否 |
| 是否影响业务状态 | 是/否 |
| 是否影响权限/数据范围 | 是/否 |
| 是否需要补充 02 | 是/否 |
| 是否需要补充 04b | 是/否 |
| 是否需要补充 04c | 是/否 |
| 03 需要覆盖的页面/交互范围 | {} |

## 2. 本次范围与边界
- 本次包含：{}
- 本次不包含：{}
- 容易被误解但明确不在范围内的边界：{}

## 3. 变更清单
| 变更操作 | 功能点编号 | 菜单名 | 一级页面 | 二级页面/区域 | 功能名称 | 变更摘要 | 变更原因 | 影响角色 | 影响验收编号 | 是否影响详设 | 是否影响测试用例 | 是否影响前端路由 | 是否影响后端接口 | 是否影响字段契约 | 是否影响权限/数据范围 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

## 4. 逐功能点增量说明
#### REQ-{MODULE}-{PAGE}-001 {功能名称}
##### 版本与状态
| 项 | 内容 |
|---|---|
| 变更类型 | 新增 / 修改 / 删除 / 废弃 |
| 引入版本 | {Vx.y.z} |
| 最近变更版本 | {Vx.y.z} |
| 当前状态 | 草稿 / 已确认 / 已实现 / 已废弃 |
| 关联验收编号 | {Axx} |

##### 变更前
##### 变更后
##### 不变部分
##### 业务规则变化
##### 交互变化
##### 业务字段变化
##### 业务状态变化
##### 权限变化
##### 对历史数据影响
##### 对路由/接口/呈现形式的影响

## 5. 回写全量 01 说明
### 5.1 回写规则
### 5.2 回写任务清单

## 6. 增量验收标准
| 验收编号 | 关联需求编号 | 验收条件 | 度量方式 |
|---|---|---|---|

## 附录 A. 回写任务清单
## 附录 B. 一致性检查清单
```

Also include explicit rule text for:
- `新增` create new ID.
- `修改/删除/废弃` reuse existing ID.
- delete semantics = `需求类型=删除` and `当前状态=已废弃`.
- merge-back updates to full `01` appendix A traceability matrix are mandatory whenever affected requirement points change.

- [ ] **Step 4: Write the new lightweight prompt**

Create `framework/prompts/01a-增量需求文档.prompt.md` with this structure:

```markdown
# 增量需求文档 生成 Prompt

## 角色
你是一名熟悉前后端业务系统的产品经理。

## 输入
- 必读模板：framework/templates/01a-增量需求文档.md
- 上游文档：
  - 用户原始变更诉求（由调用者提供）
  - 当前全量需求文档：docs/01-需求文档.md
  - 可选参考：docs/03-原型文档.md、docs/04-详细设计文档.md

## 任务
按模板章节顺序逐节填写，输出到 docs/01a-增量需求文档.md。

## 约束
- 必须复用现有功能点编号规则，不新造编号体系。
- 只写本次变化，不重写无关基线事实。
- 必须产出“回写全量 01 说明”和“回写任务清单”。
- 修改/删除/废弃功能必须沿用原编号；新增功能才可创建新编号。
- 完成后执行模板附录 B 一致性检查清单，未通过项必须修正。

## 输出
单个文件，路径：docs/01a-增量需求文档.md。
```

- [ ] **Step 5: Run the same verification script and verify it passes**

Run the script from Step 1 again.

Expected: PASS with `01a assets verified`.

- [ ] **Step 6: Create a local checkpoint**

Checkpoint note:

```text
checkpoint: added 01a incremental requirements template and prompt
```

---

## Chunk 3: Update README and the full 01 baseline rules

### Task 2: Integrate 01a into README and full 01 assets

**Files:**
- Modify: `framework/README.md`
- Modify: `framework/templates/01-需求文档.md`
- Modify: `framework/prompts/01-需求文档.prompt.md`
- Test: in-place Python verification script run from workspace root

- [ ] **Step 1: Write the failing verification script for README/01 integration**

```bash
python - <<'PY'
from pathlib import Path
checks = {
    Path('framework/README.md'): [
        '01a',
        '增量需求链路',
        '01a → 回写 01 → 02（必要时）→ 03 → 04 → 06',
        '01 仍是全量基线',
    ],
    Path('framework/templates/01-需求文档.md'): [
        '已批准的 01a',
        '增量需求',
        '附录 A. 需求功能点追踪矩阵',
    ],
    Path('framework/prompts/01-需求文档.prompt.md'): [
        '现有全量 01 + 已批准的 01a',
        '不能直接根据原始变更诉求重写全量 01',
    ],
}
for path, needles in checks.items():
    text = path.read_text(encoding='utf-8')
    for needle in needles:
        assert needle in text, f'missing {needle} in {path}'
print('README and 01 integration verified')
PY
```

- [ ] **Step 2: Run the script to verify it fails before modification**

Run the script from Step 1.

Expected: FAIL on missing `01a`-related strings.

- [ ] **Step 3: Update `framework/README.md`**

Make these concrete changes:
- Add `01a-增量需求文档` to the template/prompt overview table.
- Add an explicit “增量需求链路” description using this exact chain:

```text
01a → 回写 01 → 02（必要时）→ 03 → 04 → 06
```

- Add wording that `01` remains the full baseline and `01a` is the delta input / merge-back source.
- Keep `02` optional and `04b/04c` optional downstream docs.

- [ ] **Step 4: Update `framework/templates/01-需求文档.md`**

Add explicit incremental merge-back guidance in the template’s usage guidance and consistency checklist. The template must say, in substance:

```markdown
- 增量需求更新全量 01 时，输入应为“现有全量需求文档 + 已批准的 01a-增量需求文档”，禁止直接根据原始变更诉求重写全量 01。
- 任何增量需求回写后，必须同步校验：需求类型、引入版本、最近变更版本、当前状态、关联验收编号、附录 A 需求功能点追踪矩阵。
```

Do not redesign the full template. Add only the merge-back rules and matching checklist items.

- [ ] **Step 5: Update `framework/prompts/01-需求文档.prompt.md`**

Add lightweight prompt constraints only. Do not duplicate full template sections. Add these exact ideas:
- For incremental scenarios, inputs are the existing full `01` plus approved `01a`.
- The job is to update the full baseline.
- The prompt must not rebuild full `01` directly from raw change notes.

- [ ] **Step 6: Run the same verification script and verify it passes**

Run the script from Step 1 again.

Expected: PASS with `README and 01 integration verified`.

- [ ] **Step 7: Create a local checkpoint**

Checkpoint note:

```text
checkpoint: integrated 01a into README and full 01 baseline rules
```

---

## Chunk 4: Update 03 and 04 to consume merged 01 correctly

### Task 3: Align prototype and detailed-design upstream rules

**Files:**
- Modify: `framework/templates/03-原型文档.md`
- Modify: `framework/prompts/03-原型文档.prompt.md`
- Modify: `framework/templates/04-详细设计文档.md`
- Modify: `framework/prompts/04-详细设计文档.prompt.md`
- Test: in-place Python verification script run from workspace root

- [ ] **Step 1: Write the failing verification script for 03/04 incremental upstream rules**

```bash
python - <<'PY'
from pathlib import Path
checks = {
    Path('framework/templates/03-原型文档.md'): [
        '已回写全量 01',
        '01a',
        '02（如已产出）',
    ],
    Path('framework/prompts/03-原型文档.prompt.md'): [
        '已回写后的 docs/01-需求文档.md',
        'docs/01a-增量需求文档.md',
    ],
    Path('framework/templates/04-详细设计文档.md'): [
        '已回写全量 01',
        '01a',
        '02（如已产出）',
    ],
    Path('framework/prompts/04-详细设计文档.prompt.md'): [
        '已回写后的 docs/01-需求文档.md',
        'docs/01a-增量需求文档.md',
    ],
}
for path, needles in checks.items():
    text = path.read_text(encoding='utf-8')
    for needle in needles:
        assert needle in text, f'missing {needle} in {path}'
print('03/04 incremental upstream rules verified')
PY
```

- [ ] **Step 2: Run the script to verify it fails before modification**

Run the script from Step 1.

Expected: FAIL on at least one missing merged-`01` or `01a` string.

- [ ] **Step 3: Update `framework/templates/03-原型文档.md`**

Add incremental guidance to the existing usage section. The template must state:

```markdown
- 增量场景下，主要输入为已回写后的 `docs/01-需求文档.md`。
- `docs/01a-增量需求文档.md` 仅作为本次差异范围与受影响页面/交互的辅助参考，不替代全量 `01`。
- `docs/02-数据流转设计.md` 仅在本次变更影响数据流、状态机、权限过滤等复杂关系时作为可选输入。
- 原型只覆盖本次受影响页面、弹窗、抽屉、Tab 和关键交互，不按全量需求重写全部原型。
```

- [ ] **Step 4: Update `framework/prompts/03-原型文档.prompt.md`**

Keep the prompt light. Only update input priority and constraints so it matches the template and does not duplicate template structure.

- [ ] **Step 5: Update `framework/templates/04-详细设计文档.md`**

Add incremental guidance to the usage section. The template must state:

```markdown
- 增量场景下，主要输入为已回写后的 `docs/01-需求文档.md`。
- `docs/01a-增量需求文档.md` 仅作为本次差异审计和受影响功能点识别的辅助参考。
- `docs/02-数据流转设计.md` 仅在本次变更影响数据流、状态机、权限过滤等复杂关系时作为可选输入。
- `04b-后台文档.md` 与 `04c-前端文档.md` 的定位不变，仍是 `04` 之后的可选实现阶段文档。
```

Do not alter the existing 04 contract structure beyond this upstream-language change.

- [ ] **Step 6: Update `framework/prompts/04-详细设计文档.prompt.md`**

Keep the prompt light. Only add the merged-`01` input priority and `01a` diff-audit wording; do not repeat the template’s chapter structure.

- [ ] **Step 7: Run the same verification script and verify it passes**

Run the script from Step 1 again.

Expected: PASS with `03/04 incremental upstream rules verified`.

- [ ] **Step 8: Create a local checkpoint**

Checkpoint note:

```text
checkpoint: aligned 03 and 04 incremental upstream rules
```

---

## Chunk 5: Cross-file consistency proof

### Task 4: Verify the framework as a whole

**Files:**
- Modify if needed: any file from Tasks 1-3
- Test: cross-file Python verification script and ripgrep consistency sweep

- [ ] **Step 1: Write the final cross-file verification script**

```bash
python - <<'PY'
from pathlib import Path
files = {
    'framework/README.md': ['01a', '01 仍是全量基线', '01a → 回写 01 → 02（必要时）→ 03 → 04 → 06'],
    'framework/templates/01a-增量需求文档.md': ['## 1. 变更概述', '## 2. 本次范围与边界', '## 3. 变更清单', '## 5. 回写全量 01 说明', '## 附录 B. 一致性检查清单'],
    'framework/prompts/01a-增量需求文档.prompt.md': ['## 角色', '## 输入', '## 任务', '## 约束', '## 输出', '回写全量 01'],
    'framework/templates/01-需求文档.md': ['已批准的 01a', '附录 A. 需求功能点追踪矩阵'],
    'framework/prompts/01-需求文档.prompt.md': ['## 角色', '## 输入', '## 任务', '## 约束', '## 输出', '现有全量 01 + 已批准的 01a'],
    'framework/templates/03-原型文档.md': ['已回写后的 `docs/01-需求文档.md`', '01a'],
    'framework/prompts/03-原型文档.prompt.md': ['## 角色', '## 输入', '## 任务', '## 约束', '## 输出', 'docs/01a-增量需求文档.md'],
    'framework/templates/04-详细设计文档.md': ['已回写后的 `docs/01-需求文档.md`', '01a'],
    'framework/prompts/04-详细设计文档.prompt.md': ['## 角色', '## 输入', '## 任务', '## 约束', '## 输出', 'docs/01a-增量需求文档.md'],
}
for file, needles in files.items():
    text = Path(file).read_text(encoding='utf-8')
    for needle in needles:
        assert needle in text, f'missing {needle} in {file}'
    if file.startswith('framework/prompts/'):
        assert '## 1.' not in text, f'prompt became too heavy: {file}'
        assert '附录' not in text, f'prompt duplicated template appendix: {file}'
print('cross-file incremental framework verification passed')
PY
```

- [ ] **Step 2: Run a ripgrep sweep for contradictory chain wording**

Run:

```bash
rg -n "01a|回写 01|增量需求链路|已回写后的 docs/01-需求文档.md|01 仍是全量基线" framework/
```

Expected: matches in the newly updated files only, with no contradictory text claiming `01a` replaces full `01`.

- [ ] **Step 3: Fix any remaining drift found by the script or rg sweep**

Only edit files already listed in this plan. Do not broaden scope into `04b/04c/06` unless the verification output proves an actual contradiction.

- [ ] **Step 4: Re-run the final verification script and confirm it passes**

Run the script from Step 1 again.

Expected: PASS with `cross-file incremental framework verification passed`.

- [ ] **Step 5: Create a final local checkpoint**

Checkpoint note:

```text
checkpoint: completed incremental requirements framework integration
```

---

## Chunk 6: Execution notes

### Task 5: Implementation handoff constraints

**Files:**
- No file change required unless review finds issues

- [ ] **Step 1: Use @superpowers:subagent-driven-development for execution**

Follow the plan task-by-task. Do not batch-edit all files at once.

- [ ] **Step 2: Keep changes scoped to the files named in this plan**

Do not touch `02`, `04b`, `04c`, or `06` unless a verification command from this plan proves a contradiction.

- [ ] **Step 3: After each task, run that task’s verification command before moving on**

No completion claim without fresh verification output.

- [ ] **Step 4: After Task 4 passes, do one final read-through of the changed Markdown**

Confirm the framework still reads naturally in Chinese and that prompts remain lighter than templates.

---
