---
name: prd-git-commit
description: 通过自然语言指令完成 PRD/需求文档的 Git 提交一体化流程。当用户说"提交需求""更新PRD""更新文档"等时触发，自动执行暂存-提交-推送，检测 01 需求变更时更新 05-变更记录并发送钉钉通知。
allowed-tools: Shell Read Edit Write Glob Grep AskUserQuestion
---

# prd-git-commit

## 1. 目标

让产品角色通过自然语言指令完成 Git 文档提交，降低 Git 操作门槛。提交涉及 `01-需求文档` 变更时，自动更新 `05-变更记录.md` 并通过钉钉 Webhook 通知相关开发与测试同事，确保文档变更可追溯、团队协作及时。

本 skill 遵循 `docs/需求开发测试一体化-落地蓝图版.md` 的目录体系、编号规则与变更记录约定。

## 2. 触发条件

当用户指令包含以下意图时激活本 skill：

- **提交需求 / 提交PRD / 更新PRD / 更新PRD文档**
- **更新文档 / 提交文档修改 / 提交文档**
- 发布需求变更 / 同步PRD给团队

也适用于用户描述了文档变更内容并希望提交到 Git 的场景。

## 3. 前置检查

执行任何操作前，先完成以下检查：

### 3.1 Git 环境检查

```powershell
git rev-parse --is-inside-work-tree
git branch --show-current
git config user.name
git config user.email
```

- 若不在 Git 仓库中：停止并提示用户。
- 若 `user.name` 或 `user.email` 为空：停止并提示用户先配置 `git config --global user.name` 和 `user.email`。
- 记录 `user.name` 作为后续变更记录的"变更人"。

### 3.2 工作区状态检查

```powershell
git status --porcelain
```

- 若工作区干净（无变更）：向用户确认是否仍有待提交内容，可能需要先保存文件。
- 若有变更：记录变更文件清单，用于后续意图解析。

### 3.3 钉钉 Webhook 配置检查

仅当判定为涉及 01 需求变更时（见 4.2 节）才需要此检查。

读取项目根目录 `.env` 文件，确认包含以下配置：

- `DINGTALK_WEBHOOK_URL`（必填）：Webhook 地址
- `DINGTALK_KEYWORD`（选填但强烈建议）：机器人自定义关键词，多个用逗号分隔

处理规则：

- 若 `.env` 不存在或缺少 `DINGTALK_WEBHOOK_URL`：提示用户参考 `.env.example` 创建配置，**但不阻塞** Git 提交流程，仅跳过钉钉通知。
- 若缺少 `DINGTALK_KEYWORD`：提示用户配置关键词，否则消息可能被钉钉拒绝（errcode 310000）。
- `.env` 已在 `.gitignore` 中排除，不会被提交。

## 4. 意图解析

### 4.1 提取关键信息

从用户自然语言指令和 `git status` 中提取：

| 信息项   | 说明                         | 示例                          |
| -------- | ---------------------------- | ----------------------------- |
| 变更文件 | 用户指定或从 git status 推断 | `Prds/V1.6.1/01-需求文档.md`  |
| 变更说明 | 用户口述的变更内容           | 新增合同启停状态展示需求      |
| 关联 REQ | 变更涉及的功能点编号         | `REQ-CONFIG-BILLCFG-LIST-003` |
| 变更类型 | 新增/修改/删除               | 修改                          |
| 影响对象 | 变更影响的角色或对象         | 运营/销售人员                 |

### 4.2 PRD 需求变更判定

当变更文件路径匹配以下任一模式时，判定为"涉及 01 需求变更"，触发第 6 节的变更处理机制：

- `Prds/**/01-需求文档.md`
- `Prds/**/01-需求文档*.md`（含 `01b-数据流转设计.md`、`01c-原型文档.md` 等）

### 4.3 信息不足时的澄清

若以下信息缺失，通过 AskUserQuestion 向用户确认：

- 无法从 git status 和用户指令中确定变更文件
- 变更说明不明确，无法生成提交信息
- 涉及 01 需求变更但未提及关联 REQ 编号（REQ 编号必须来自需求文档已有定义，不自造）

## 5. Git 提交流程

### 5.1 暂存（Stage）

**安全规则：禁止使用 `git add .` 或 `git add -A`，必须按文件路径精确暂存。**

```powershell
git add "Prds/V1.6.1/01-需求文档.md"
```

暂存后确认：

```powershell
git status --short
```

### 5.2 提交（Commit）

提交信息格式遵循 Conventional Commits：

- PRD 需求变更：`docs(prd): <变更摘要>`
- 通用文档变更：`docs: <变更摘要>`

提交信息 body 包含上下文说明，使用 HEREDOC 传递多行消息：

```powershell
git commit -m "docs(prd): 新增合同启停状态展示需求" -m "- 变更文件: Prds/V1.6.1/01-需求文档.md`n- 关联REQ: REQ-CONFIG-BILLCFG-LIST-003`n- 变更类型: 新增`n- 变更人: songhuanlian"
```

### 5.3 推送（Push）

```powershell
git push origin <当前分支>
```

推送失败时按 7.1 节处理错误。

## 6. PRD 变更处理机制

当第 4.2 节判定为涉及 01 需求变更时，在 Git 提交成功后执行以下后续操作。

### 6.1 更新 05-变更记录.md

#### 6.1.1 定位变更记录文件

按以下优先级查找 `05-变更记录.md`：

1. **版本目录下的变更文件**：若变更文件在版本目录下（如 `Prds/V1.6.1/01-需求文档.md`），使用同目录的 `Prds/V1.6.1/05-变更记录.md`。
2. **模块目录下的变更文件**：若变更文件在模块目录下（如 `Prds/LOGIN-登录/01-需求文档.md`），查找当前活跃版本目录下的 `05-变更记录.md`；若存在多个版本目录，通过 AskUserQuestion 让用户选择目标版本。
3. **未找到**：若找不到 `05-变更记录.md`，提示用户该版本尚未创建变更记录文件，询问是否新建。

#### 6.1.2 追加变更记录

读取目标 `05-变更记录.md`，向以下三个表格**追加行**（不修改已有行）：

**第 2 节「本版变更摘要」表追加行：**

| 变更日期       | 模块              | 变更摘要     | 影响对象          | 关联需求编号 | 备注                      |
| -------------- | ----------------- | ------------ | ----------------- | ------------ | ------------------------- |
| `{YYYY-MM-DD}` | `{模块编码/名称}` | `{变更说明}` | `{影响角色/对象}` | `{REQ-xxx}`  | `变更人: {git user.name}` |

**第 3 节「详细变更项」表追加行：**

| 变更日期       | 序号             | 所属模块          | 变更类型           | 变更说明     | 用户可见影响 | 关联需求编号 | 是否需同步脚本/用例 |
| -------------- | ---------------- | ----------------- | ------------------ | ------------ | ------------ | ------------ | ------------------- |
| `{YYYY-MM-DD}` | `{上一行序号+1}` | `{模块编码/名称}` | `{新增/修改/删除}` | `{变更说明}` | `{有/无}`    | `{REQ-xxx}`  | `{是/否}`           |

- 序号取该表当前最后一行的序号 +1。

**第 4 节「影响与注意事项」表追加行：**

| 变更日期       | 影响模块          | 使用注意         | 当前限制         |
| -------------- | ----------------- | ---------------- | ---------------- |
| `{YYYY-MM-DD}` | `{模块编码/名称}` | `{后续注意事项}` | `{当前限制说明}` |

- 若用户未提供"使用注意"或"当前限制"，填入"待补充"。

#### 6.1.3 提交变更记录更新

将 `05-变更记录.md` 的更新作为同一批次提交：

```powershell
git add "Prds/V1.6.1/05-变更记录.md"
git commit -m "docs(changelog): 更新 V1.6.1 变更记录 - {变更摘要}"
git push origin <当前分支>
```

### 6.2 发送钉钉通知

#### 6.2.1 构造通知内容

**关键词校验（关键步骤）**：从 `.env` 读取 `DINGTALK_KEYWORD`（逗号分隔），检查消息标题和正文是否已包含至少一个关键词。若未包含，将第一个关键词前缀到消息标题中（如"提交需求-PRD需求变更通知"），确保通过钉钉的关键词安全校验。**跳过此步骤会导致 errcode 310000 发送失败。**

**@ 通知校验（关键步骤）**：钉钉 markdown 消息要求 `at.atMobiles` 中的手机号**必须也出现在 `text` 正文末尾**（格式为 `@手机号`），否则被 @ 人不会收到 ding 提醒。构造消息时，将所有 `DINGTALK_AT_MOBILES` 中的手机号以 `@手机号` 格式追加到正文末尾。**仅在 atMobiles 中填手机号而 text 中不写 @手机号，@ 功能不会生效。**

使用 markdown 消息格式，内容包含变更说明、相关文档链接和处理建议：

```markdown
### PRD 需求变更通知

**变更摘要：** {变更说明}

**变更详情：**

- 变更文件：{文件路径}
- 关联需求：{REQ-xxx}
- 变更类型：{新增/修改/删除}
- 变更人：{git user.name}
- 变更时间：{YYYY-MM-DD HH:mm}

**相关文档：**

- 需求文档：Prds/.../01-需求文档.md
- 变更记录：Prds/.../05-变更记录.md
- 提交记录：{commit hash}（{commit message}）

**处理建议：**

- 开发同事：请关注关联 REQ 的实现影响
- 测试同事：请评估是否需要补充或调整测试用例

@{手机号1} @{手机号2}
```

#### 6.2.2 发送请求（PowerShell）

```powershell
# 读取 .env 配置
$envContent = Get-Content ".env" -ErrorAction Stop
$webhookUrl = ($envContent | Where-Object { $_ -match "^DINGTALK_WEBHOOK_URL=" }) -replace "^DINGTALK_WEBHOOK_URL=", ""
$secret = ($envContent | Where-Object { $_ -match "^DINGTALK_WEBHOOK_SECRET=" }) -replace "^DINGTALK_WEBHOOK_SECRET=", ""
$atMobilesRaw = ($envContent | Where-Object { $_ -match "^DINGTALK_AT_MOBILES=" }) -replace "^DINGTALK_AT_MOBILES=", ""
$atMobiles = @($atMobilesRaw -split "," | Where-Object { $_ -ne "" })
$keywordsRaw = ($envContent | Where-Object { $_ -match "^DINGTALK_KEYWORD=" }) -replace "^DINGTALK_KEYWORD=", ""
$keywords = @($keywordsRaw -split "," | Where-Object { $_ -ne "" })

# 跳过占位符 secret（SECyour_secret_here 为模板默认值，非真实密钥）
$useSign = $secret -and $secret -ne "SECyour_secret_here"

# 计算签名（若配置了有效 secret）
if ($useSign) {
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $stringToSign = "$timestamp`n$secret"
    $hmac = [System.Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($secret))
    $signBytes = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($stringToSign))
    $sign = [Convert]::ToBase64String($signBytes)
    $signEncoded = [Uri]::EscapeDataString($sign)
    $url = "$webhookUrl&timestamp=$timestamp&sign=$signEncoded"
} else {
    $url = $webhookUrl
}

# 构造 markdown 消息
$title = "PRD 需求变更通知"
$markdownText = @"
### PRD 需求变更通知
...（按 6.2.1 构造完整内容）...
"@

# @ 通知：将手机号以 @手机号 格式追加到正文末尾（钉钉 API 要求 text 中必须包含 @手机号，否则 @ 不生效）
if ($atMobiles.Count -gt 0) {
    $atText = ($atMobiles | ForEach-Object { "@$_" }) -join " "
    $markdownText = "$markdownText`n`n$atText"
}

# 关键词校验：确保消息包含至少一个配置的关键词，否则钉钉会拒绝（errcode 310000）
$keywordMatched = $false
foreach ($kw in $keywords) {
    if ($markdownText -match [regex]::Escape($kw) -or $title -match [regex]::Escape($kw)) {
        $keywordMatched = $true
        break
    }
}
if (-not $keywordMatched -and $keywords.Count -gt 0) {
    $title = "$($keywords[0])-$title"
    $markdownText = "$($keywords[0]) $markdownText"
}

$body = @{
    msgtype = "markdown"
    markdown = @{
        title = $title
        text = $markdownText
    }
    at = @{
        atMobiles = $atMobiles
        isAtAll = $false
    }
} | ConvertTo-Json -Depth 10

# 使用 UTF-8 编码发送（避免中文乱码导致关键词匹配失败）
$bodyBytes = [Text.Encoding]::UTF8.GetBytes($body)
$response = Invoke-RestMethod -Uri $url -Method Post -Body $bodyBytes -ContentType "application/json; charset=utf-8"

# 检查响应
if ($response.errcode -ne 0) {
    Write-Error "钉钉通知发送失败: $($response.errmsg)"
}
```

## 7. 错误处理

### 7.1 Git 操作失败

| 错误场景                      | 处理方式                                                          |
| ----------------------------- | ----------------------------------------------------------------- |
| 暂存失败（文件不存在）        | 提示文件路径有误，列出 `git status` 中的实际变更文件供用户选择    |
| 提交失败（nothing to commit） | 检查文件是否已保存，确认暂存状态                                  |
| 推送失败（网络问题）          | 提示网络异常，建议检查网络后重试 `git push origin <分支>`         |
| 推送失败（权限不足）          | 提示无推送权限，建议检查远程仓库权限配置或使用 SSH 方式           |
| 推送失败（非快进）            | 提示远程有新提交，建议先 `git pull --rebase origin <分支>` 再推送 |

### 7.2 变更记录更新失败

| 错误场景                | 处理方式                                                                   |
| ----------------------- | -------------------------------------------------------------------------- |
| `05-变更记录.md` 不存在 | 询问用户是否新建，或跳过变更记录更新                                       |
| 表格格式不匹配          | 读取文件后分析实际格式，适配后追加；若无法适配则在文件末尾追加变更说明段落 |
| 文件被锁定/只读         | 提示文件权限问题，建议关闭编辑器后重试                                     |

### 7.3 钉钉通知失败

| 错误场景                         | 处理方式                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `.env` 不存在或缺配置            | 提示参考 `.env.example` 配置，不阻塞 Git 提交                                                   |
| 网络请求超时/失败                | 提示网络异常，提供手动重发建议                                                                  |
| `errcode` 310000（关键词不匹配） | 消息未包含机器人自定义关键词；检查 `.env` 中 `DINGTALK_KEYWORD`，确保消息含至少一个关键词后重发 |
| `errcode` 非 0（如 token 无效）  | 提示具体错误码和消息，建议检查 Webhook 配置                                                     |
| 签名验证失败                     | 提示 secret 可能不匹配或仍为占位符，建议核对 `.env` 中的 `DINGTALK_WEBHOOK_SECRET`              |

### 7.4 错误处理原则

- Git 提交是核心操作，变更记录和钉钉通知是增强操作。
- 增强操作失败**不回滚**已完成的 Git 提交，但必须在最终反馈中明确报告失败项。
- 任何错误都向用户提供具体原因和可操作的建议，不使用模糊表述。

## 8. 反馈报告

操作完成后（无论成功或部分失败），向用户返回综合反馈：

```
## 提交结果

[Git 提交]
- 分支：master
- Commit：a1b2c3d
- 提交信息：docs(prd): 新增合同启停状态展示需求
- 推送状态：成功

[变更记录更新]
- 文件：Prds/V1.6.1/05-变更记录.md
- 追加记录：第 2/3/4 节各 1 行
- 提交状态：成功

[钉钉通知]
- 接收人：13800138000, 13900139000
- 发送状态：成功
```

若有失败项，明确标记失败原因和建议操作。

## 9. 安全与权限控制

### 9.1 凭证保护

- 钉钉 Webhook URL 和 Secret **只从 `.env` 文件读取**，禁止硬编码在 SKILL.md 或任何脚本中。
- `.env` 必须在 `.gitignore` 中排除，确保不被提交。
- 提交信息中不包含任何凭证、Token 或密钥。

### 9.2 Git 操作安全

- **禁止 `git add .` / `git add -A`**，必须按文件精确暂存，防止误提交敏感文件。
- **禁止 `git push --force`**，除非用户明确要求。
- 推送前确认分支正确，避免误推到受保护分支。
- 不自动创建分支，分支操作需用户明确指示。

### 9.3 变更记录完整性

- 只向 `05-变更记录.md` **追加行**，不修改或删除已有记录。
- 变更记录的"变更人"取自 `git config user.name`，确保可追溯。
- `REQ` 编号必须来自需求文档已有定义，不自造编号。

## 10. 完整执行流程

```
用户自然语言指令
    |
[前置检查] Git环境 -> 工作区状态 -> .env配置(按需)
    |
[意图解析] 提取变更文件/说明/REQ -> 判定是否01需求变更
    |
[Git暂存] 精确 git add 变更文件
    |
[Git提交] docs(prd): 变更摘要 + 上下文body
    |
[Git推送] git push origin <分支>
    |
    +-- 涉及01需求变更?
    |     |
    |     +-- 否 --> 输出反馈报告
    |     |
    |     +-- 是
    |           |
    |           [更新变更记录] 定位05-变更记录.md -> 追加3个表格行 -> 提交推送
    |           |
    |           [发送钉钉通知] 读.env -> 关键词校验 -> 构造markdown -> 签名计算 -> 发送
    |           |
    |           v
    |     输出反馈报告
    v
  结束
```

## 11. 约束

- 本 skill 仅处理 `Prds/` 目录下的文档提交，不处理 `Codes/`、`Tests/` 目录的代码提交。
- 变更记录格式以 `05-变更记录.md` 现有结构为准，不自行发明格式。
- `REQ` 编号必须来自需求文档已有定义，不自造编号。
- 钉钉通知仅在 01 需求变更时发送，普通文档变更不发通知。
- 所有操作向用户透明，关键步骤前向用户确认变更文件和提交信息。
- 遵循 `docs/需求开发测试一体化-落地蓝图版.md` 的目录体系与编号规则。
