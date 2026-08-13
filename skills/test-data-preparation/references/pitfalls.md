# Test Data Pitfall Prevention Rules

Concrete pitfalls encountered during test data preparation, with prevention measures. Each rule is mandatory.

## Rule 1: Enum Values Must Be Fetched From System, Never Fabricated

**Pitfall experience**:
- Fabricated "DX0001" as product package code → import reported "产品套餐: 格式不正确" (format incorrect)
- Changed to "0001" → still format incorrect (missing DX prefix)
- Changed to "DX0001" → format correct but doesn't exist in system
- Finally resolved by reading the add form dropdown to get real value "DX1412 单基因遗传病扩展性携带者筛查10种"

**Prevention measures**:
- Phase 3 (enum probing) is a **mandatory phase, cannot be skipped**
- Checklist enum value column must contain either real value or `[需从接口获取]` / `[待探测]` placeholder
- **Never fabricate specific values** for enum fields
- If probing fails, annotate `[待探测]` with probing suggestions (interface path or UI steps)

**Applies to**: product package codes, hospital names, sample types, gender, report modes, transport conditions, tube types — any field with predefined options.

---

## Rule 2: Import Template Header Structure Must Be Preserved

**Pitfall experience**:
- Used `openpyxl.Workbook()` to create new xlsx, only copied header text → import reported "excel表头列数错误" (header column count error)
- Root cause: templates have merged cells, data validations, number formats, column widths — all lost when creating new workbook
- Fixed by: `shutil.copy2(template_path, output_path)` to copy template, then only fill data rows

**Prevention measures**:
- Stage 2 data generation must use template as base: `shutil.copy2(template, output)` then fill rows
- **Never use `openpyxl.Workbook()` to create new files** for import test data
- Checklist Section 7 (file directory structure) must annotate "以系统模板为底本填数据，不可新建"
- List template file paths in checklist for Stage 2 to reference

**Applies to**: all import test data xlsx files.

---

## Rule 3: Sample Numbers and Business IDs Must Follow System Format

**Pitfall experience**:
- "TEST-CAR-001" → reported "样本编号: 格式不正确" (format incorrect)
- "AUTO-CAR-331014" → still format incorrect
- "AutoTestCAR86331086" → accepted (system existing data uses `AutoTest` prefix)

**Prevention measures**:
- Phase 3 enum probing must additionally read list page first 3 rows' sample numbers as format reference
- Checklist Section 6 (ID format rules) must list each ID field's format rule and reference data
- Stage 2 data generation must use format-compliant IDs (e.g., `AutoTest` + timestamp suffix)
- Never use arbitrary formats like `TEST-XXX-001`

**Applies to**: sample numbers, hospital sample numbers, family IDs — any business-generated identifier.

---

## Rule 4: Disabled/Non-Existent Hospitals Must Be User-Provided

**Pitfall experience**:
- Fabricated "深圳北大医院" → reported "送检医院[深圳北大医院]不存在" (hospital doesn't exist)
- Fabricated "已禁用医院" → not specific enough
- User provided "天津市一中心医院" (disabled) and "华大test" (non-existent) → worked

**Prevention measures**:
- Phase 3 enum probing: hospital interface may return enabled status, but **disabled hospitals and non-existent hospitals must be asked from user**
- Checklist Section 5 (special data requiring user input) must list these explicitly
- Never fabricate hospital names for disabled/non-existent scenarios
- If user hasn't provided yet, use placeholder `[需用户提供禁用医院名称]`

**Applies to**: disabled hospitals, non-existent hospitals, any data that cannot be probed from system.

---

## Rule 5: Same Sample Number Cannot Be Reused Across Test Rounds

**Pitfall experience**:
- B1 abnormal data import succeeded, B2 normal data used same sample number → reported "样本编号: 样本编号已存在" (already exists)
- Root cause: abnormal file rows used same sample number as normal file

**Prevention measures**:
- Checklist must annotate "每次测试用不同编号（建议用时间戳后缀）"
- Duplicate-number scenarios listed separately with note "需先添加样本再导入同编号"
- Stage 2 data generation must use unique numbers per file (e.g., timestamp-based)

**Applies to**: any scenario involving sample number uniqueness.

---

## Rule 6: Conditional-Required Field Logic

**Pitfall experience**:
- Single-molecule thalassemia: "has_blood_transfusion=no" → "transfusion_date" correctly left empty, but "all-fields" scenario with "no" meant transfusion_date couldn't be filled
- CNV-seq: "is_family_recorded=no" → proband ID correctly left empty, but "all-fields" scenario should select "yes" and fill all sub-fields

**Prevention measures**:
- Phase 2 template analysis must identify conditional-required rules, annotate in field spec table
- Checklist "all-fields" scenarios must annotate "应选触发条件（如输血=是）以填全子字段"
- For conditional-required fields, field spec table must have a "conditional-required rule" column

**Applies to**: any field whose required-ness depends on another field's value.

---

## Rule 7: Multi-Form-Type Field Differences Must Not Cross-Contaminate

**Pitfall experience**:
- During batch replacement of product package codes, carrier file was incorrectly filled with NIFTY's package "WD2471"
- Root cause: replacement logic used `for type, pkg in pkg_map.items()` without matching file type first

**Prevention measures**:
- Phase 2 template analysis: each form type has independent field list, never mix
- Checklist enum values grouped by form type, annotated "只适用于X类型"
- Stage 2 data generation: determine form type by filename prefix, only replace within that type's files
- Never run cross-form-type batch replacements

**Applies to**: any operation involving multiple form types (carrier/newborn/NIFTY/CNV-seq/XOME/thalassemia/non-invasive).
