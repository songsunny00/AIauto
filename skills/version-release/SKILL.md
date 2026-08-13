---
name: version-release
description: 版本封版与 Git 标记。当用户说"封版 V1.6.1""关闭版本 V1.6.1"等时触发，校验归档完成、收敛 CHANGELOG 为唯一封版记录、精确暂存版本文件、创建单一封版 commit 和 annotated Tag 并推送。支持 --resume 恢复中断的推送。
allowed-tools: Shell Read Edit Write Glob Grep AskUserQuestion
---

# version-release

## 1. 目标

版本测试结束并归档完成后，完成版本封版闭环：校验交付物和归档状态 → 收敛 `Prds/CHANGELOG.md` 为唯一封版记录 → 精确暂存版本相关文件 → 创建单一封版 commit → 创建 annotated Tag → 推送分支和 Tag。对无法归属的变更、Tag 冲突和远程操作失败进行安全拦截。

## 2. 触发条件

当用户指令包含以下意图时激活：

**普通封版**：
- `/version-release V1.6.1`
- `封版 V1.6.1`
- `关闭版本 V1.6.1`

**恢复入口**（仅用于推送中断后补推）：
- `/version-release --resume V1.6.1 --commit <完整 commit hash>`

缺少版本号、版本格式非法、普通入口与恢复参数混用时停止并要求用户明确指定。

纯治理/工具类版本（不涉及模块基线文档变更）可由用户在预览阶段声明"本版本无模块基线变更"，跳过归档门禁并记录跳过原因到 commit body。

## 3. 前置检查（阶段一）

只读检查，不修改任何文件。任一门禁不满足时停止。

### 3.1 Git 工作区检查

```bash
git rev-parse --is-inside-work-tree
git branch --show-current
git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'
git config user.name
git config user.email
git diff --cached --name-status
git status --porcelain=v1
git rev-parse HEAD
```

- 没有 upstream 时停止，不猜测推送远程。
- upstream 无法唯一解析到 remote 时停止。
- Git 索引必须为空（`git diff --cached --name-status` 无输出）。已有暂存变更必须由用户先处理。
- 记录完整初始基线：HEAD、index、工作区状态、upstream ref、目标 remote。

### 3.2 版本资产检查

定位 `Prds/{版本号}/` 目录，读取 `01`、`02`、`02b`、`03`、`04`、`04b`、`05`、`Prds/CHANGELOG.md`。

- `01-需求文档.md` 已完成最终回写；
- `04-测试报告文档.md` 存在明确版本结论；
- `04b-测试执行记录.md` 的逐项事实可追溯到 REQ/测试点，且与 `04` 一致；只有 `04b` 没有 `04` 时不能判定测试完成；
- `05-变更记录.md` 若存在则必须已完成（不存在不构成门禁）；
- 需求、设计、测试执行和变更记录的 REQ 关联可回溯。

### 3.3 归档门禁检查

采用与 `version-archive` 相同的模块识别规则（从 `01-需求文档.md` REQ 清单表的 REQ 编号提取 `{L1}-{L2}`，结合 `05-变更记录.md` 模块列交叉确认，映射到 `Prds/{L1编码}-{L1中文名}/{L2编码}-{L2中文名}/` 物理路径），逐模块读取基线目录下 `INDEX.md`，确认其存在且"最后回写版本"等于目标版本号。

任一模块不满足时停止并提示"请先执行版本归档：归档 {版本号}"。

### 3.4 Tag 冲突检查

```bash
git tag -l "Tag-{版本号}"
git ls-remote --tags <目标 remote> "Tag-{版本号}"
```

普通封版要求本地和目标远程均不存在同名 Tag。远程存在同名 Tag（即使对象相同）也必须停止普通封版；只有显式 `--resume` 恢复模式允许后续幂等处理。

## 4. 预览确认（阶段二）

向用户展示并请求一次明确确认，用户未确认前不修改任何文件。

### 4.1 预览内容

- 版本资产和门禁结果；
- `CHANGELOG` 过程行清理及最终行预览；
- 纳入提交的文件清单；
- 排除的文件清单和排除原因；
- 无法判断归属、需要用户处理的文件；
- commit subject/body；
- Tag 名、Tag message 和推送目标。

### 4.2 状态持久化

预览结果持久化到 `.claude/version-release/{版本号}.json`，纳入 `.gitignore`。文件至少记录：

- 版本号、原始 HEAD、当前分支、目标 remote、upstream ref；
- 预览文件清单及每个文件的 status/blob 摘要；
- 执行前工作区基线（index 摘要、`git status --porcelain=v1`、既有变更文件 blob 摘要、目标 remote 的分支/Tag 状态）；
- CHANGELOG 预览摘要和最终行摘要；
- 预期 commit subject、父提交 hash、Tag 名和 Tag message。

该文件只用于本地恢复校验，不纳入 index、不纳入 commit、不纳入 Tag 内容。如果无法写入该目录，停止跨会话恢复流程。

### 4.3 CHANGELOG 收敛规则

详细规则见 `references/changelog-rules.md`。核心要点：

- 固定表头，列名和顺序不得变更；
- 目标版本中 `发布状态 != 已封版` 的行视为过程行并删除；
- 目标版本中已有 `发布状态=已封版` 或带目标 Tag 的行时停止；
- 生成目标版本唯一一条最终封版记录；
- 其他版本行不迁移、不清理；
- 需求变更过程保留在版本目录下的 `05-变更记录.md`。

### 4.4 文件归属规则

详细规则见 `references/file-attribution-rules.md`。核心要点：

- 默认纳入：`Prds/{版本号}/**`、`Prds/CHANGELOG.md`、当前治理仓库内与目标 REQ/模块关联的 `Codes/**` 和 `Tests/**`、用户明确指定的治理文档；
- 纳入必须有可复核证据（版本目录路径、REQ 映射、模块引用、用户说明）；
- 禁止 `git add .` 和 `git add -A`；
- 外部 Codes/Tests 仓库只报告状态，不跨仓提交。

## 5. 执行（阶段三）

用户确认后按顺序执行。每一步失败时的处理见 `references/failure-recovery-rules.md`。

### 5.1 执行前并发变化复核

再次比对原始 HEAD、index、工作区、目标 remote、upstream 和远程 Tag。任一变化使预览失效时回到检查阶段，不使用过期清单。

### 5.2 更新 CHANGELOG

按预览规则更新 `Prds/CHANGELOG.md`。

### 5.3 精确暂存和 index 复核

按预览清单精确暂存版本相关文件。暂存后读取 index，确认只包含预览清单中的文件，不含敏感文件、其他版本文件、未归属文件和本地状态文件。发现异常时只取消本次新增暂存，保留检查前已有状态。

### 5.4 创建封版 commit

```text
release: 封版 V1.6.1
```

body 包含版本范围、测试结论、文档回写状态和 Tag 名。

### 5.5 创建 annotated Tag

```bash
git tag -a Tag-{版本号} <封版 commit hash> -m "封版 {版本号}"
git rev-parse 'Tag-{版本号}^{}'
```

只有解引用 hash 与封版 commit 完全一致才继续。

### 5.6 安全推送

推送顺序：先推送当前分支到预览记录的 upstream，再推送同一 remote 上的 Tag。

推送前重新检查目标 remote 的同名 Tag：普通封版必须仍不存在；只有显式 `--resume` 且远程对象与本地 Tag 解引用一致时允许幂等补推。

禁止 force push、覆盖 Tag、删除分支或破坏性回滚。

## 6. 恢复流程

仅允许通过显式恢复入口继续中断的推送：

```text
/version-release --resume V1.6.1 --commit <完整 commit hash>
```

恢复流程：

1. 读取 `.claude/version-release/{版本号}.json`；
2. 校验 commit subject、父提交、文件清单、CHANGELOG 最终内容、本地 Tag 指向、目标 remote 和 upstream 完全一致；
3. 根据远程实际状态补推尚未完成的分支或 Tag；
4. 不重新创建 commit，不覆盖已有 Tag。

任一校验不一致时停止并要求人工处理。普通封版遇到已封版状态直接停止，不自动转入恢复。

详细恢复规则见 `references/failure-recovery-rules.md`。

## 7. 验证

执行完成后验证：

```bash
git diff --check
git show --stat --oneline <封版 commit hash>
git rev-parse 'Tag-{版本号}^{}'
git status --short
git ls-remote --tags <目标 remote> "Tag-{版本号}"
```

确认：

- `git diff --check` 通过；
- 当前版本在 `Prds/CHANGELOG.md` 中只有一条最终记录；
- Tag 存在且解引用后的 commit 与封版 commit hash 完全一致；
- commit 文件列表不含敏感文件、其他版本文件和未归属变更；
- 本地分支、远程分支和远程 Tag 状态符合预期。

## 8. 结果报告

```
## 封版结果

[版本信息]
- 版本号：V1.6.1
- 封版 commit：{完整 hash}
- Tag：Tag-V1.6.1（{Tag hash}）

[CHANGELOG]
- 最终封版记录已写入
- 过程行已清理

[Git 状态]
- 分支推送：{成功/失败} → {remote/branch}
- Tag 推送：{成功/失败} → {remote}

[文件归属]
- 纳入提交：{N} 个文件
- 排除：{M} 个文件（{原因}）
- 待确认：{K} 个文件

[后续操作]
- 封版已完成
- 外部 Codes/Tests 仓库需分别执行封版（如适用）
```

## 9. 边界与非目标

- 不自动修复未完成的需求、设计、测试或代码；
- 不替代日常需求文档提交（由 `prd-git-commit` 负责）；
- 不自动推断当前版本；
- 不覆盖已存在的 Tag；
- 不清理与本次封版无关的工作区变更；
- 不将需求变更过程复制到系统级 `CHANGELOG.md`；
- 不调用 `prd-git-commit`，不追加或改写 `05-变更记录.md`，不发送钉钉通知；
- 不跨仓库操作（外部 Codes/Tests 仓库只报告状态）；
- 不使用 `git add .` 或 `git add -A`。

## 10. 与其他 skill 的关系

| skill | 关系 |
|---|---|
| `version-archive` | 归档是封版的前置门禁。封版阶段一检查归档是否完成，未完成时阻断。两个 skill 独立触发，不互相调用。 |
| `prd-git-commit` | 面向日常 `Prds/` 文档提交。封版不调用它，也不改变其行为。普通"提交需求""更新 PRD"继续由它处理。 |
