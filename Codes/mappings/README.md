# Codes/mappings/ — 需求→代码映射

## 文件说明

| 文件 | 提交仓库 | 用途 |
|---|---|---|
| `prd-to-code.yaml` | 是 | 需求模块与前端/后端仓的映射（repo_path、route、browse 等） |
| `local-override.yml` | 否（gitignored） | 本地 clone 路径覆盖，每人不同 |
| `local-override.yml.example` | 是 | 模板，供新人复制 |

## 首次使用

1. 复制 `local-override.yml.example` 为 `local-override.yml`
2. 填入你的本地 clone 路径：

```yaml
repos:
  "repos/frontend-repo": "D:/Codes/omics-web"
```

3. 确认 `local-override.yml` 已被 `.gitignore` 排除（不会提交你的本地路径）

## 路径解析

AI 读两个文件合并，定位到本地文件：

```
prd-to-code.yaml:  repo_path = "src/views/Config/billingConfig"
local-override.yml: repos["repos/frontend-repo"] = "D:/Codes/omics-web"
合并结果: D:/Codes/omics-web/src/views/Config/billingConfig
```

## 工作流：详设变动点 → 本地前端代码

AI 拿到详设变动点后的固定操作：

1. **合并路径**：读 prd-to-code.yaml + local-override.yml → 本地文件绝对路径
2. **读文件**：读详设变动点 + 读对应本地 .vue 文件 → 列出需要改的内容点
3. **提案**：展示文件路径 + 每个改动点的改前→改后代码 → 用户确认后 AI 执行编辑
4. **验证**：提示用户跑 lint / build / 自动化测试回归

## 新增模块

在 `prd-to-code.yaml` 的 `modules` 下复制一段 `- path_code` 并修改模块编码和路径即可。`local-override.yml` 无需改动（repo 别名不变）。
