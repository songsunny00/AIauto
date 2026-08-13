---
name: test-data-preparation
description: This skill should be used when preparing test data for functional testing (especially import/add/edit write operations). It outputs a test data preparation checklist (scenarios + field specs + enum placeholders) based on test case documents and system import templates. After user confirms the checklist, it generates data generation scripts and xlsx files. Core constraints: enum values must be fetched from the real system (never fabricated), and import template header structure must be preserved. Triggered after testcase-generation and before test-execution.
---

# Test Data Preparation Skill

## 1. Purpose & Positioning

Generate a test data preparation checklist for functional testing (especially import/add/edit write operations), then (after user confirmation) generate data generation scripts and xlsx data files.

**When to use**: After testcase-generation completes, when test cases contain N (untested) write-operation cases requiring data preparation.

**When NOT to use**: Pure read-only test cases (query/sort/pagination) need no data; existing data files only need test execution.

**Relationship with other skills**:
- Upstream: `testcase-generation` (provides test case docs, identifies which scenarios need data)
- Downstream: `playwright-cli-testing` / `code-driven-ui-api-testing` (executes tests using prepared data)
- Does NOT replace `code-driven-ui-api-testing`'s interface data creation (that's execution phase; this is preparation phase)

## 2. Input/Output

### Inputs

| Input | Required | Purpose |
|---|---|---|
| Test case document (containing FT-* cases) | Required | Phase 1: extract scenario classification |
| System import templates (xlsx files) | Required | Phase 2: extract field specs |
| Field rules table (xlsx, if available) | Optional | Phase 2: supplement format rules and conditional-required rules |
| System address + login state | Required | Phase 3: enum probing (interface/UI) |
| 02-Detailed Design Doc / 02b-Backend Doc | Optional | Phase 3: discover interface paths and enum definitions |

### Outputs

**Two-stage output**:

**Stage 1 output (default)**: `reports/测试数据准备清单.md`

Structure:
```
# {Module} Test Data Preparation Checklist
## 1. Data Requirements Overview (scenario classification table)
## 2. Scenario Classification (scenario name + case IDs + data requirements)
## 3. Field Specs per Scenario (one table per scenario: field/required/format/enum-value-or-placeholder/conditional-rule)
## 4. Enum Value List (by field: real values + source + whether user-provided)
## 5. Special Data Requiring User Input (disabled hospitals, non-existent hospitals, HIS environment)
## 6. ID Format Rules (sample number format + reference existing data)
## 7. File Directory Structure (test-data/imports/{type}-{scenario}.xlsx, "use system template as base, never create new")
## 8. Collaboration Requirements (dev/DBA/HIS lead)
```

**Stage 2 output (after user confirms checklist)**:
1. Enum probing script: `scripts/probe_enums.js` (playwright-cli, reads dropdowns/calls APIs, outputs JSON)
2. Data generation script: `scripts/gen_test_data.py` (uses template as base, fills enum values from probe JSON, never fabricates)
3. Test data files: `test-data/imports/{type}-{scenario}.xlsx`

**Flow constraint**: Stage 2 only starts after user explicitly confirms Stage 1 checklist is correct.

### What is NOT output (boundaries)

- Stage 1 does NOT generate xlsx files or scripts
- Stage 2 does NOT execute tests (test execution is downstream skill's job)
- Does NOT modify test case documents (read-only)

## 3. Four-Phase Pipeline

### Phase 1: Requirements Analysis

Read all test cases, classify by operation type (add/import/export/download-template/batch-edit/edit/delete/HIS), extract scenario list per type:

- Normal success (required fields filled + all fields filled)
- Required-empty (required fields left blank)
- Format error (invalid date format / non-numeric in numeric field / out-of-range)
- Illegal enum (non-existent enum value)
- Over-length (field value exceeds length limit)
- Duplicate ID (pre-existing sample number)
- Date logic error (sampling date > arrival date)
- Future date (date later than today)
- Conditional-required missing (e.g., blood_transfusion=yes but no transfusion_date)
- Family relation (proband/spouse/carrier/newborn with consistent family_id)
- Disabled hospital (system has disabled hospital)
- Unconfigured hospital (hospital not in system)
- Cross-form family (family relation belongs to different form type)

Output: scenario classification table (scenario name + case IDs + data requirements summary).

### Phase 2: Template Analysis

Read each import template's headers: field name, required marker (*), enum notes (in parentheses), format notes.

Merge with field rules table (if version differs, annotate source version).

Identify conditional-required fields (e.g., when "has_blood_transfusion=yes" then "transfusion_date" is required).

Output: field spec table per form type (field name / required / attribute / format / enum placeholder `[需从接口获取]` / conditional-required rule).

### Phase 3: Enum Probing

Discover interfaces and fetch real enum values. See `references/enum-probing-strategy.md` for detailed priority and methods.

### Phase 4: Checklist Generation

Combine Phase 1 scenarios + Phase 2 field specs + Phase 3 enum values into the final checklist document.

## 4. Core Constraints (Pitfall Prevention)

See `references/pitfalls.md` for the full list of 7 rules with concrete pitfall experiences and prevention measures. Summary:

1. **Enum values must be fetched from system, never fabricated** — Use Phase 3 probing; placeholders `[需从接口获取]` or `[待探测]` for unknown values; never guess specific values.
2. **Import template header structure must be preserved** — When generating xlsx files (Stage 2), use `shutil.copy2(template, output)` to copy template then fill data rows; never use `openpyxl.Workbook()` to create new.
3. **Sample numbers and business IDs must follow system format** — Read existing list page data to determine format (e.g., `AutoTestXXXXXX`); never use arbitrary formats.
4. **Disabled/non-existent hospitals must be user-provided** — Interface may return enabled status, but disabled/non-existent hospitals must be asked from user; never fabricate.
5. **Same sample number cannot be reused across test rounds** — Use timestamp suffix; duplicate-number scenarios require pre-adding then importing same number.
6. **Conditional-required field logic** — For "all-fields" scenarios, select the trigger condition (e.g., blood_transfusion=yes) to fill sub-fields; field spec table must annotate conditional rules.
7. **Multi-form-type field differences must not cross-contaminate** — Each form type has independent field list; enum values grouped by form type; never mix (e.g., carrier's package code filled into NIFTY file).

## 5. User Confirmation Gate

After Stage 1 checklist generation, explicitly ask user to confirm:
1. Are all scenarios covered?
2. Are field specs correct?
3. Are enum values complete (or marked as placeholder)?
4. Are special data items (disabled/non-existent hospitals) correctly listed as requiring user input?

Only after user confirms "无误" (no issues), proceed to Stage 2 (generate scripts + data files).

## 6. Execution Workflow

```
Phase 1 (Requirements Analysis)
  ↓ input: test case document
  ↓ output: scenario classification table

Phase 2 (Template Analysis)
  ↓ input: import templates + field rules table
  ↓ output: field spec table per form type

Phase 3 (Enum Probing)
  ↓ input: system address + login state + 02 docs
  ↓ output: enum value list (real values + source)
  ↓ priority: 02-Detailed Design Doc > frontend code > network requests > UI dropdown
  ↓ see: references/enum-probing-strategy.md

Phase 4 (Checklist Generation)
  ↓ input: Phase 1 + Phase 2 + Phase 3
  ↓ output: reports/测试数据准备清单.md

═══ USER CONFIRMATION GATE ═══
  ↓ user confirms checklist is correct

Stage 2 (Script + Data Generation)
  ↓ step 1: write probe_enums.js (if enum values not yet probed)
  ↓ step 2: execute probe, output enum JSON
  ↓ step 3: write gen_test_data.py (uses template as base, consumes enum JSON)
  ↓ step 4: execute gen_test_data.py, output xlsx files
  ↓ output: test-data/imports/{type}-{scenario}.xlsx
```
