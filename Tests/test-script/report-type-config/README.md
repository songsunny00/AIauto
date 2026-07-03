# 报告类别配置自动化测试

## 测试概览

| 字段 | 值 |
|------|-----|
| 测试版本 | V1.5.3.1-R1 |
| 测试环境 | test（http://10.17.227.10:30080） |
| 测试账号 | shl / @admin123（报告配置维护人员） |
| 测试工具 | Playwright |
| 覆盖模块 | 配置中心 / 报告配置 / 报告类别配置 |

## 用例覆盖清单

| 文件 | 覆盖用例 | 优先级 |
|------|---------|--------|
| `00-login-permission.spec.ts` | 登录验证、权限检查（PT-001, PT-006, PT-API-001/002） | P0 |
| `01-entry-display.spec.ts` | FT-001-001 ～ FT-001-005（入口展示与打开） | P0/P1 |
| `02-product-load.spec.ts` | FT-002-001 ～ FT-002-006（产品套餐加载与配置回填） | P0/P1 |
| `03-checkbox-selection.spec.ts` | FT-003-001 ～ FT-003-012（位点类型报告类别勾选） | P0/P1/P2 |
| `04-save-config.spec.ts` | FT-004-001 ～ FT-004-006（当前产品配置保存） | P0/P1 |

**总用例数：29 个**（含登录验证 2 个 + 权限 4 个 + 功能用例 23 个）

## 前置条件

确认以下测试数据已在环境中初始化：

- `XOME` 项目（展示名 `WGS/WES`）存在
- `XOME` 下有 ≥2 条 `status=1` 的产品套餐（`DX2489`、`DX2490`）
- `DX2489` 已保存配置：`ExonCNVAndSNV: ["Primary", "ACMG"]`
- 存在 ≥1 条 `status=0` 的禁用产品套餐
- 存在 ≥1 个非 `XOME` 项目

## 运行方式

### 安装依赖（首次）

```powershell
cd d:\Codes\omics-web\tests
npm install @playwright/test
npx playwright install chromium
```

### 执行测试

```powershell
# 运行全部用例
cd d:\Codes\omics-web\tests
npx playwright test --config=playwright.config.ts

# 只运行 P0 用例（功能入口 + 保存）
npx playwright test --config=playwright.config.ts 00-login-permission 01-entry-display 04-save-config

# 带 UI 模式（可视调试）
npx playwright test --config=playwright.config.ts --ui

# 指定单个文件
npx playwright test --config=playwright.config.ts report-type-config/01-entry-display.spec.ts
```

### 查看测试报告

```powershell
# 打开 HTML 报告
npx playwright show-report d:\Codes\omics-web\test-reports\report-type-config\html
```

## 报告字段说明

HTML 报告包含：
- 每个用例的通过/失败状态
- 失败用例的错误截图（位于 `test-reports/report-type-config/artifacts/`）
- 失败用例的视频录制
- Trace 文件（可用 `npx playwright show-trace` 分析）

## 测试报告（执行后回填）

| 字段 | 值 |
|------|-----|
| 报告版本 | V1.5.3.1-R1 |
| 测试环境 | test \| http://10.17.227.10:30080 |
| 用例总数 | 29 |
| 通过数 | {} |
| 失败数 | {} |
| 阻塞数 | {} |
| 风险结论 | {} |

## 覆盖率达成

| 维度 | 目标 | 实际 |
|------|------|------|
| 功能用例覆盖度 | ≥ 95% | {} |
| 接口覆盖度 | 100% | {} |
| 权限矩阵覆盖度 | 100% | {} |
| 异常分支覆盖度 | ≥ 90% | {} |

## 注意事项

1. 测试前需确认目标环境可访问（`http://10.17.227.10:30080`）
2. FT-002-004（无产品套餐时的状态）需手动在环境中调整数据后执行
3. 元素选择器基于 Element Plus 组件库编写，若 UI 框架有特殊定制需调整 `helpers/page-objects.ts`
4. 网络较慢时可适当调整 `playwright.config.ts` 中的 `timeout` 值
