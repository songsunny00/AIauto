# Data Scenario Classification Reference

Standard scenario types for test data preparation. Each scenario maps to test case IDs and has specific data requirements.

## Scenario Types

### 1. Normal Success (正常数据)
- **Data**: All required fields filled with valid values; some non-required fields filled.
- **Purpose**: Verify import/add succeeds with valid data.
- **Case IDs**: IMPORT-118/127 (required-only), IMPORT-121/130 (all-fields).

### 2. Required-Empty (必填空)
- **Data**: All required fields left blank.
- **Purpose**: Verify "不能为空" validation triggers.
- **Case IDs**: IMPORT-115/124, ADD-035/061.

### 3. Format Error (格式错误)
- **Data**: Required fields filled with invalid formats (wrong date, non-numeric).
- **Purpose**: Verify "格式不正确" validation.
- **Case IDs**: IMPORT-116~118/125~126, ADD-036~037.

### 4. Illegal Enum (非法枚举)
- **Data**: Enum fields with values not in enum list.
- **Purpose**: Verify enum validation.
- **Case IDs**: Same as format error in many cases.

### 5. Over-Length (超长)
- **Data**: Text fields exceeding length limit.
- **Purpose**: Verify "不能超过XX个字符" validation.
- **Case IDs**: IMPORT-123/132, ADD-044/070.

### 6. Duplicate ID (重复编号)
- **Data**: Sample number already existing in system.
- **Precondition**: Must pre-add sample with that number first.
- **Case IDs**: IMPORT-122/131, ADD-043/069/097.

### 7. Date Logic Error (日期逻辑错)
- **Data**: Sampling date > arrival date.
- **Purpose**: Verify "采样日期不能大于到样日期" validation.

### 8. Future Date (未来日期)
- **Data**: Date fields with future dates.
- **Purpose**: Verify "不能大于当前日期" validation.

### 9. Conditional-Required Missing (条件必填缺失)
- **Data**: Trigger condition met but dependent field empty (e.g., blood_transfusion=yes but no date).
- **Purpose**: Verify conditional-required validation.
- **Case IDs**: ADD-061 (thalassemia transfusion).

### 10. Family Relation (家系关系)
- **Data**: Complete family with proband + spouse + carrier + newborn, consistent family_id.
- **Purpose**: Verify family relation linking.
- **Case IDs**: ADD-098~108, IMPORT-154~168.

### 11. Disabled Hospital (禁用医院)
- **Data**: Hospital name disabled in system.
- **Source**: Must be user-provided (e.g., "天津市一中心医院").
- **Case IDs**: IMPORT-120/129.

### 12. Unconfigured Hospital (未配置医院)
- **Data**: Hospital name not in system.
- **Source**: Must be user-provided (e.g., "华大test").
- **Case IDs**: IMPORT-120/129.

### 13. Cross-Form Family (跨送检单家系)
- **Data**: Family relation where proband belongs to different form type.
- **Case IDs**: IMPORT-166.

### 14. Boundary Value (边界值)
- **Data**: Minimum/maximum length, today's date, boundary enum values.

## Scenario-to-File Mapping

```
{form-type}-正常数据.xlsx
{form-type}-必填空.xlsx
{form-type}-格式错误.xlsx
{form-type}-非法枚举.xlsx
{form-type}-超长.xlsx
{form-type}-重复编号.xlsx
{form-type}-日期逻辑错.xlsx
{form-type}-未来日期.xlsx
{form-type}-条件必填缺失.xlsx
{form-type}-家系关系.xlsx
{form-type}-禁用医院.xlsx
{form-type}-未配置医院.xlsx
{form-type}-边界值.xlsx
```

For 7 form types × 13 scenarios = 91 files max (some scenarios may not apply to all types).
