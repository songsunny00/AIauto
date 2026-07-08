# AIauto

## 1. 仓库定位

`AIauto/` 是这套“需求 → 开发 → 测试（UI 自动化 / 接口自动化）”一体化方案的系统治理仓。

它的重点不是承载前后端业务代码本体，而是承载：

- 需求与设计基线
- 测试基线与版本回填规则
- 模板与治理文件
- skills 与 agents
- 项目级总览与方法说明

## 2. 目录总览

```text
AIauto/
├─ Prds/        # 需求、增量、原型、详设、测试基线
├─ Codes/       # 逻辑代码映射入口（物理上可对应外部代码仓）
├─ Tests/       # 逻辑测试资产入口（物理上可对应外部测试仓）
├─ Templates/   # 正式模板与治理模板
├─ skills/      # 本地自定义流程 skills
├─ Agents/      # 角色型 agent 资产
└─ docs/        # 方案文档、专项说明、项目级总览
```

## 3. 推荐使用方式

- 需求、开发、测试统一在支持 AI 的 IDE 中打开该治理仓。
- `Codes/`、`Tests/` 继续作为逻辑视图理解需求、代码、测试关系。
- 物理落地时，可分别映射到外部仓，例如：
  - `repos/frontend-repo`
  - `repos/backend-repo`
  - `repos/test-repo`

## 4. 实施入口

### 4.1 需求资产入口

- [Prds/README.md](Prds/README.md)
- [需求开发测试一体化-落地蓝图版](docs/需求开发测试一体化-落地蓝图版.md)
- [需求开发测试一体化-领导汇报版](docs/需求开发测试一体化-领导汇报版.md)

### 4.2 模板入口

- [Templates/README.md](Templates/README.md)

### 4.3 skills 入口

- [skills/README.md](skills/README.md)

### 4.4 项目级总览入口

- [docs/traceability-matrix.md](docs/traceability-matrix.md)
- [docs/delivery-status-board.md](docs/delivery-status-board.md)

## 5. 当前说明

- 当前仓库中仍保留部分较早期的 `Prds/`、`Tests/` 示例资产。
- 第一批实施优先补齐模板、入口文档、skills 和总览资产，不在这一批中强制迁移旧示例目录。
- 目录与编号口径以蓝图文档为准。  
