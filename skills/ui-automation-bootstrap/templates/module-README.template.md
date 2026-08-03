# {{模块名称}} UI 自动化测试

> 一级模块：`{{一级模块}}` ｜ 二级模块：`{{二级模块}}`

## 首次运行前置三步

> 漏任一步都会报错。务必在 `Tests/` 目录执行。

1. **安装依赖**：`npm install`
2. **安装浏览器二进制**：`npx playwright install chromium`
   - 漏装会导致 `auth:capture` 或测试执行报浏览器启动错误
3. **捕获登录态**：`npm run auth:capture`
   - 首次会唤起有头浏览器，人工过验证码；登录态写入 `Tests/shared/.auth/{{一级模块}}/domain-state.json`

## 运行测试

在 `Tests/` 目录执行：

```bash
# 跑本二级模块全部用例
npm test -- --domain {{一级模块}} --module {{二级模块}}

# 跑一级模块下全部二级模块
npm test -- --domain {{一级模块}}

# 仅列出用例（不执行）
npm run test:list -- --domain {{一级模块}} --module {{二级模块}}

# 一键执行测试 + 生成报告
npm run test:report -- --domain {{一级模块}} --module {{二级模块}}
```

过滤特定用例（用 `TEST_GREP` 环境变量，避免 Windows cmd 对 `|` 的管道解析；用 `FT-` 前缀排除 `ET-` 同号异常用例串误匹配）：

```powershell
$env:TEST_GREP="FT-{{MODULE}}-(FORM-004|LIST-009)"; npm test -- --domain {{一级模块}} --module {{二级模块}}
```

## 查看报告与失败详情

报告输出目录：`Tests/ui-automation/test-reports/{{一级模块}}/{{二级模块}}/`

| 产物 | 用途 |
| --- | --- |
| `TEST-REPORT.md` | AI 总结报告（用例明细 + 失败归因） |
| `junit.xml` | 结构化用例结果（含 failure/error 消息） |
| `html/index.html` | 交互式 HTML 报告（浏览器直接打开） |
| `execution-digest.json` | 结构化摘要（AI 生成报告的输入） |
| `artifacts/` | 失败用例工件（`trace.zip` / `test-failed-*.png` / `error-context.md`） |

深度排查单个失败（回放完整操作轨迹：DOM 快照/点击/输入/console/network）：

```bash
cd Tests
npx playwright show-trace "ui-automation\test-reports\{{一级模块}}\{{二级模块}}\artifacts\<失败用例子目录>\trace.zip"
```

## 前置条件

- 测试环境已启动（`TEST_BASE_URL` 可访问）
- 测试数据基于系统已有数据编写（机构名、项目名、状态值等），不凭空编造
- spec 命名遵循 `ATS-{{一级模块}}-{{二级模块}}-{功能域}-{起始用例号}.spec.ts`，禁止自由命名
