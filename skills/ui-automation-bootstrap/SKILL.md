---
name: ui-automation-bootstrap
description: 基于测试用例与页面信息生成 UI 自动化目录结构、README 要点和脚本骨架建议。
allowed-tools: Read Glob Grep Edit Write
---

# ui-automation-bootstrap

## 1. 目标

围绕目标模块输出一套可直接起步的 UI 自动化骨架方案，服务 `Tests/ui/...` 目录建设和 Playwright 脚本起步。

## 2. 适用输入

- `03-测试用例文档.md`
- `01-需求文档.md`
- `01c-原型文档.md`（如有）
- 页面路径 / 路由信息
- 相关前端代码（如可读）

## 3. 期望输出

至少输出：

1. 目标 UI 自动化目录结构
2. 建议创建的 `specs/pages/fixtures/data` 文件清单
3. `README.md` 需要说明的要点
4. 每个 `FT-*` 对应的初始脚本命名建议
5. 定位方式与等待策略建议
6. 哪些场景先做、哪些场景后做

## 4. 使用步骤

1. 从 `03` 中找出适合 UI 自动化的 `FT-*`。
2. 结合页面结构与原型说明，建议脚本拆分方式。
3. 输出 `ATS-*.spec.ts` 命名建议。
4. 输出页面对象、夹具、数据文件的最小清单。
5. 标记对前端可测性要求，如 `data-testid`。

## 5. 输出格式建议

```markdown
## 目录结构建议
- Tests/ui/.../

## 文件建议
- specs/ATS-....spec.ts
- pages/...page.ts
- fixtures/...fixture.ts
- data/...data.ts
- README.md

## 场景优先级
- 先做：
- 后做：

## 定位与等待建议
- 
```

## 6. 约束

- 不把 Browser Use 这类探索式能力当作正式回归脚本主引擎。
- 脚本命名必须保留功能点编号主线。
- 优先用稳定定位点，再考虑脆弱选择器。
- UI 自动化骨架可前置，但完整主场景脚本应在页面结构和定位点基本稳定后补齐。
