# Enum Probing Strategy

How to discover and fetch real enum values from the system during Phase 3.

## Discovery Priority (high to low)

1. **Read 02-Detailed Design Doc / 02b-Backend Doc** — Most reliable source. Docs usually contain:
   - Interface paths for dictionary/enum APIs
   - Enum value definitions (e.g., `sample_type: ["外周血", "干血片", "全血", ...]`)
   - Field validation rules

2. **Read frontend code** — Grep for API calls:
   ```
   grep -r "api.*套餐\|api.*hospital\|api.*dict\|api.*enum\|api.*sample" frontend/src/
   ```
   Extract interface paths and response structures.

3. **Capture network requests** — Use playwright-cli to open add form, capture dropdown-loading requests:
   ```javascript
   // Open add form → click product package dropdown → read captured API response
   ```

4. **UI dropdown probing** — Last resort, read dropdown option text directly:
   ```javascript
   const opts = await page.locator(".el-select-dropdown__item").allTextContents();
   ```

## Probing Targets

| Enum Category | Probing Method (by priority) | Output |
|---|---|---|
| Product packages | 02 doc interface > frontend code > network capture > UI dropdown | Per form type: `[{编号, 名称}, ...]` |
| Hospitals | 02 doc > frontend code > network capture > UI dropdown | `[{名称, 状态}, ...]` |
| Sample types | 02 doc > field rules table > UI dropdown | Per form type: `[value, ...]` |
| Gender / report mode / etc. | 02 doc > field rules table > UI dropdown | `[value, ...]` |
| Disabled hospitals | Interface status field > 02 doc > **ask user** | Disabled hospital name |
| Non-existent hospitals | **Cannot probe, must ask user** | `[需用户提供]` |
| Existing ID format | Read list page first 3 rows | Format rule (e.g., `AutoTestXXXXXX`) |

## Probing Script Output Format

`scripts/probe_enums.js` outputs JSON for `gen_test_data.py` to consume:

```json
{
  "product_packages": {
    "携带者": [{"编号": "DX1412", "名称": "..."}],
    "新生儿": [...]
  },
  "hospitals": [{"名称": "华大", "status": "启用"}],
  "sample_types": {"携带者": ["外周血", "DNA"]},
  "sample_number_format": "AutoTest + 8 digits",
  "disabled_hospital": "天津市一中心医院",
  "non_existent_hospital": "华大test"
}
```

## Failure Handling

If probing fails for a field:
1. Mark as `[待探测]` in checklist
2. Annotate probing suggestions (interface path or UI steps)
3. Do NOT fabricate a value
4. Ask user if probing is blocked
