# 配置中心-报告配置-报告类别配置测试用例文档

## 1. 测试范围

### 1.1 测试目标

验证"报告类别配置"功能在 WGS/WES 项目下的入口展示、产品套餐加载与配置回填、位点类型报告类别勾选和保存操作符合需求文档与详细设计文档定义的业务规则与交互逻辑。

### 1.2 范围模块

| 模块编号 | 模块名                             | 覆盖深度 |
| -------- | ---------------------------------- | -------- |
| 5.1      | 配置中心 / 报告配置 / 报告类别配置 | 全量     |

子功能覆盖：

| 需求编号                           | 功能名称               | 覆盖深度 |
| ---------------------------------- | ---------------------- | -------- |
| `REQ-CONFIG-REPORTCFG-TYPECFG-001` | 入口展示与打开         | 全量     |
| `REQ-CONFIG-REPORTCFG-TYPECFG-002` | 产品套餐加载与配置回填 | 全量     |
| `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 位点类型报告类别勾选   | 全量     |
| `REQ-CONFIG-REPORTCFG-TYPECFG-004` | 当前产品配置保存       | 全量     |

### 1.3 排除项

- 下游解读页面的报告类别实际生效表现（不在本功能范围内）。
- WGS/WES 以外项目的入口展示与配置保存（本期不做）。
- 批量保存多个产品套餐配置（本期不做）。
- 自定义新增/删除位点类型与报告类别枚举值（本期不做）。
- 配置排序、版本历史、变更审计与回滚（本期不做）。
- 后端接口完整报文、数据库持久化验证（04b 后台文档未生成，相关边界值待回填）。

### 1.4 覆盖率目标

| 维度                                 | 目标值 |
| ------------------------------------ | ------ |
| 功能用例覆盖度（按需求条目）         | ≥ 95%  |
| 接口覆盖度（按接口数）               | 100%   |
| 权限矩阵覆盖度（角色 × 模块）        | 100%   |
| 异常分支覆盖度（按数据流转异常分支） | ≥ 90%  |

---

## 2. 测试环境

### 2.1 环境信息

| 字段 | 值 |
| --- | --- |
| 环境名 | test |
| 前端 URL | `http://10.17.227.10:30080/config/reportConfig` |
| 后端 URL | `http://10.17.227.10:30080/api/` |
| 测试数据初始化 | 需保证 `XOME` 项目下存在至少 1 条 `status=1` 的产品套餐，并已预置部分报告类别配置数据 |

### 2.2 测试账号矩阵

| 角色编码 | 账号 | 初始密码 | 数据范围 | 菜单权限 |
| --- | --- | --- | --- | --- |
| 报告配置维护人员 | `admin` | `@admin123` | 当前授权项目下数据 | 具备 `menuId=11008` 报告配置菜单权限 |
| 无报告配置权限用户 | `no_report` | `{pwd}` | - | 不具备 `menuId=11008` 菜单权限 |

> 角色编码待后端确认补充；当前测试以"具备/不具备 menuId=11008 菜单权限"区分。

### 2.3 数据初始化

| 数据项       | 要求                                                                        |
| ------------ | --------------------------------------------------------------------------- |
| XOME 项目    | 系统存在项目编码为 `XOME`（展示名称 `WGS/WES`）的项目                       |
| 启用产品套餐 | `XOME` 项目下存在至少 2 条 `status=1` 的产品套餐（如 `DX2489`、`DX2490`）   |
| 禁用产品套餐 | `XOME` 项目下存在至少 1 条 `status=0` 的产品套餐，用于验证禁用产品不展示    |
| 已保存配置   | `DX2489` 产品已保存 `ExonCNVAndSNV: ["Primary", "ACMG"]` 配置，用于回填验证 |
| 非 XOME 项目 | 系统存在至少 1 个非 `XOME` 项目编码的项目，用于入口隐藏验证                 |

---

## 3. 功能用例

### 3.1 模块：入口展示与打开（REQ-CONFIG-REPORTCFG-TYPECFG-001）

| 用例编号 | 关联需求编号 | 模块 | 前置条件 | 操作步骤 | 预期结果 | 优先级 | 测试结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FT-CONFIG-REPORTCFG-TYPECFG-001-001 | `REQ-CONFIG-REPORTCFG-TYPECFG-001` | 配置中心 / 报告配置 | 以具备菜单权限的报告配置维护人员登录；当前页面项目已选中 `XOME`（WGS/WES） | 1. 进入 `/config/reportConfig` 2. 观察页面操作区按钮列表 | 页面操作区显示"报告类别配置"按钮，与"下载模板""报告命名""报告周期"并列 | P0 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-001-002 | `REQ-CONFIG-REPORTCFG-TYPECFG-001` | 配置中心 / 报告配置 | 以具备菜单权限的报告配置维护人员登录；当前页面项目已切换为非 `XOME` 项目 | 1. 进入 `/config/reportConfig` 2. 选择非 `XOME` 的项目 3. 观察页面操作区 | 页面操作区**不显示**"报告类别配置"按钮 | P0 | 跳过（未找到非 XOME 项目选项） |
| FT-CONFIG-REPORTCFG-TYPECFG-001-003 | `REQ-CONFIG-REPORTCFG-TYPECFG-001` | 配置中心 / 报告配置 | 已显示"报告类别配置"按钮（当前项目为 XOME） | 1. 点击"报告类别配置"按钮 | 弹窗打开，弹窗标题显示"报告类别配置"；弹窗内"检测项目"字段展示为"WGS/WES" | P0 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-001-004 | `REQ-CONFIG-REPORTCFG-TYPECFG-001` | 配置中心 / 报告配置 | 弹窗已打开 | 1. 点击弹窗右上角关闭按钮（或取消按钮） | 弹窗关闭；页面回到报告配置原态；无任何数据提交 | P1 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-001-005 | `REQ-CONFIG-REPORTCFG-TYPECFG-001` | 配置中心 / 报告配置 | 当前项目为 `XOME` 且弹窗已打开并有临时编辑 | 1. 对某位点类型勾选了部分报告类别（未保存） 2. 点击取消/关闭弹窗 3. 再次点击"报告类别配置"按钮重新打开弹窗 | 重新打开的弹窗中，上次临时编辑内容已清空；回填的是已保存的配置 | P1 | 通过 |

### 3.2 模块：产品套餐加载与配置回填（REQ-CONFIG-REPORTCFG-TYPECFG-002）

| 用例编号 | 关联需求编号 | 模块 | 前置条件 | 操作步骤 | 预期结果 | 优先级 | 测试结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FT-CONFIG-REPORTCFG-TYPECFG-002-001 | `REQ-CONFIG-REPORTCFG-TYPECFG-002` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 当前项目为 `XOME`；`XOME` 下存在至少 1 条 `status=1` 的产品套餐 | 1. 点击"报告类别配置"按钮打开弹窗 2. 观察产品套餐下拉 | 产品套餐下拉已加载产品列表；默认选中第一个可用产品套餐 | P0 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-002-002 | `REQ-CONFIG-REPORTCFG-TYPECFG-002` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 弹窗已打开；`DX2489` 产品已有保存的报告类别配置（如 `ExonCNVAndSNV: ["Primary", "ACMG"]`） | 1. 打开弹窗（默认选中 `DX2489`） 2. 切换到 SNV/ExonCNV 位点类型 Tab 3. 观察报告类别勾选状态 | "主要"和"ACMG"复选框呈已选中状态；其余未选；已选数量显示 2 | P0 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-002-003 | `REQ-CONFIG-REPORTCFG-TYPECFG-002` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 弹窗已打开；存在 `status=0` 的禁用产品套餐 | 1. 打开弹窗 2. 查看产品套餐下拉选项 | 禁用状态（`status=0`）的产品套餐**不出现**在产品下拉列表中 | P1 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-002-004 | `REQ-CONFIG-REPORTCFG-TYPECFG-002` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 弹窗已打开；`XOME` 下不存在任何 `status=1` 的产品套餐 | 1. 打开弹窗 2. 观察产品套餐下拉与操作区 | 弹窗正常打开；产品套餐下拉呈**禁用**状态并显示"暂无可用数据"；位点类型 Tab 区域正常展示但不可操作；确定按钮禁用 | P1 | 未执行（本轮未覆盖） |
| FT-CONFIG-REPORTCFG-TYPECFG-002-005 | `REQ-CONFIG-REPORTCFG-TYPECFG-002` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 弹窗已打开；默认选中第一个产品（已加载配置） | 1. 切换到另一个未读取过配置的产品套餐（如 `DX2490`） 2. 观察接口调用与回填结果 | 切换后自动请求 `GET /base/products/reportTypeConfigs/DX2490`；回填 `DX2490` 的已保存配置 | P1 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-002-006 | `REQ-CONFIG-REPORTCFG-TYPECFG-002` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 弹窗已打开；已切换到 `DX2490` 并加载了其配置；再切回 `DX2489` | 1. 将产品套餐切回 `DX2489` 2. 观察网络请求 | **不再重复**请求 `GET /base/products/reportTypeConfigs/DX2489`；直接使用本次会话中已有的本地草稿 | P1 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-002-007 | `REQ-CONFIG-REPORTCFG-TYPECFG-002` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 后端配置查询接口返回包含当前规则之外的非法报告类别枚举（如 `ExonCNVAndSNV` 返回了实际上不属于该位点类型的枚举值） | 1. 打开弹窗并加载该产品配置 2. 观察 SNV/ExonCNV Tab 下的勾选状态 | 非法枚举值**不出现**在复选框选项中，也不呈现为已选状态；只有合法枚举项可见 | P1 | 未执行（本轮未覆盖） |

### 3.3 模块：位点类型报告类别勾选（REQ-CONFIG-REPORTCFG-TYPECFG-003）

| 用例编号 | 关联需求编号 | 模块 | 前置条件 | 操作步骤 | 预期结果 | 优先级 | 测试结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FT-CONFIG-REPORTCFG-TYPECFG-003-001 | `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 弹窗已打开并已加载产品配置 | 1. 依次点击 7 个位点类型 Tab：SNV/ExonCNV、LargeCNV、LOH、MT、STR、地贫 CNV、SV | 7 个 Tab 全部可正常切换；每次切换后展示对应位点类型的报告类别选项 | P0 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-002 | `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 弹窗已打开；当前位点类型为 SNV/ExonCNV | 1. 观察 SNV/ExonCNV Tab 下的复选框选项列表 | 仅显示：主要、次要、ACMG、附加、附表、夫妻联合筛查、罕见病表一、罕见病表二、罕见病表三（共 9 项）；不出现 LargeCNV 等其他位点类型的专属选项 | P0 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-003 | `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 当前位点类型为 LargeCNV | 1. 观察 LargeCNV Tab 下的复选框选项列表 | 仅显示：正式、附加、罕见病表一、罕见病表二、罕见病表三（共 5 项） | P1 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-004 | `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 当前位点类型为 LOH | 1. 观察 LOH Tab 下的复选框选项列表 | 仅显示：附加、罕见病表一、罕见病表二、罕见病表三（共 4 项） | P1 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-005 | `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 当前位点类型为 MT | 1. 观察 MT Tab 下的复选框选项列表 | 仅显示：正式、附加、MT 表一、MT 表二（共 4 项） | P1 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-006 | `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 当前位点类型为 STR | 1. 观察 STR Tab 下的复选框选项列表 | 仅显示：附加、STR 表一、STR 表二（共 3 项） | P1 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-007 | `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 当前位点类型为 地贫 CNV | 1. 观察 地贫 CNV Tab 下的复选框选项列表 | 仅显示：附加（共 1 项） | P1 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-008 | `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 当前位点类型为 SV | 1. 观察 SV Tab 下的复选框选项列表 | 仅显示：附加、罕见病表一、罕见病表二、罕见病表三（共 4 项） | P1 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-009 | `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 当前位点类型为 SNV/ExonCNV；当前无任何勾选 | 1. 勾选"主要"复选框 2. 观察"当前位点类型已选择"的数量提示 | 已选择数量从 0 变为 1；"主要"复选框呈选中状态 | P0 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-010 | `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 配置中心 / 报告配置 / 报告类别配置弹窗 | SNV/ExonCNV 下已勾选"主要" | 1. 取消勾选"主要"复选框 2. 观察数量变化 | 已选择数量变为 0；"主要"复选框不再选中 | P1 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-011 | `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 配置中心 / 报告配置 / 报告类别配置弹窗 | SNV/ExonCNV 下勾选了"主要"，切换到 LargeCNV Tab | 1. 在 SNV/ExonCNV 勾选"主要" 2. 切换到 LargeCNV Tab 3. 再切回 SNV/ExonCNV Tab | 切回后"主要"仍保持勾选状态；Tab 切换不丢失本地草稿 | P0 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-012 | `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 所有位点类型均未勾选任何报告类别 | 1. 不作任何勾选，直接点击"确定" | 可以正常提交保存请求（配置结果为各位点类型空数组）；系统不强制要求至少选 1 项 | P2 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-013 | `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 弹窗已打开并已加载产品配置；当前位点类型为 SNV/ExonCNV；所有选项均未选中 | 1. 点击 Tab 面板顶部的全选复选框 | SNV/ExonCNV 下全部 9 个报告类别变为已选状态；已选数量显示 9；全选复选框呈全选态；再次点击后全部取消、数量归零 | P1 | 未执行（本轮未覆盖） |
| FT-CONFIG-REPORTCFG-TYPECFG-003-014 | `REQ-CONFIG-REPORTCFG-TYPECFG-003` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 当前位点类型为 SNV/ExonCNV；已勾选部分选项；之后切换到 LargeCNV Tab | 1. 在 SNV/ExonCNV 下勾选"主要"（此时全选复选框呈半选态） 2. 切换到 LargeCNV Tab 3. 观察 LargeCNV 下全选复选框状态 | SNV/ExonCNV 的全选半选状态不影响 LargeCNV；LargeCNV 全选状态由自身选中情况决定 | P1 | 未执行（本轮未覆盖） |

### 3.4 模块：当前产品配置保存（REQ-CONFIG-REPORTCFG-TYPECFG-004）

| 用例编号 | 关联需求编号 | 模块 | 前置条件 | 操作步骤 | 预期结果 | 优先级 | 测试结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FT-CONFIG-REPORTCFG-TYPECFG-004-001 | `REQ-CONFIG-REPORTCFG-TYPECFG-004` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 弹窗已打开；已选中 `DX2489` 产品套餐；SNV/ExonCNV 下已勾选"主要"、"ACMG" | 1. 点击"确定"按钮 | 弹窗底部"确定"按钮进入 loading 状态；取消按钮变为禁用状态 | P0 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-004-002 | `REQ-CONFIG-REPORTCFG-TYPECFG-004` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 同上，保存请求正常返回成功 | 1. 点击"确定"等待保存成功 | 弹窗关闭；页面出现保存成功提示消息；前端本地临时编辑状态被清空 | P0 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-004-003 | `REQ-CONFIG-REPORTCFG-TYPECFG-004` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 当前项目下无可用产品套餐，弹窗已打开 | 1. 观察弹窗底部"确定"按钮状态 2. 尝试点击"确定"按钮 | "确定"按钮呈禁用状态，无法触发保存请求；弹窗保持打开，用户只能关闭弹窗 | P0 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-004-004 | `REQ-CONFIG-REPORTCFG-TYPECFG-004` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 弹窗已打开；已选中产品套餐 `DX2489`；SNV/ExonCNV 勾选了"主要"，LargeCNV 勾选了"正式"；另有产品 `DX2490` 本次会话也进行了本地编辑但未保存 | 1. 确认当前激活产品套餐为 `DX2489` 2. 点击"确定" 3. 检查保存请求体 | 请求体中 `productNo` 为 `DX2489`；`reportTypeConfigs` 仅包含 `DX2489` 的配置；不包含 `DX2490` 的任何数据 | P0 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-004-005 | `REQ-CONFIG-REPORTCFG-TYPECFG-004` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 弹窗已打开；保存请求后端返回失败（网络异常或业务错误） | 1. 点击"确定"触发保存 2. 模拟后端返回错误 | 弹窗保持打开；loading 状态结束；页面显示错误提示（统一错误处理）；当前勾选状态不丢失 | P0 | 通过 |
| FT-CONFIG-REPORTCFG-TYPECFG-004-006 | `REQ-CONFIG-REPORTCFG-TYPECFG-004` | 配置中心 / 报告配置 / 报告类别配置弹窗 | 弹窗已打开；保存中（请求尚未返回） | 1. 保存请求发出后，立即再次点击"确定" | 不产生第二次保存请求；按钮 loading 状态持续直到第一次请求返回 | P1 | 通过 |

---

## 4. 接口用例

### 4.1 接口 `GET /base/products/queryForReportTemplate/{projectCode}`

| 用例编号 | 关联需求编号 | 接口 | 方法 | 请求参数 | 正常返回 | 异常返回 | 边界值 | 权限场景 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IT-CONFIG-REPORTCFG-TYPECFG-01-001 | `REQ-CONFIG-REPORTCFG-TYPECFG-002` | `/base/products/queryForReportTemplate/{projectCode}` | GET | `projectCode=XOME` | `retCode=0`；`result` 为数组，至少包含 1 条产品，各产品含 `productNo`；所有产品均为 `status=1` | `retCode≠0`，接口异常（错误码待 04b 补充） | `projectCode` 为空 / 不存在的项目编码 / 非 XOME 项目编码 | 具备 `menuId=11008` 权限返回 200；无权限返回 401/403 |
| IT-CONFIG-REPORTCFG-TYPECFG-01-002 | `REQ-CONFIG-REPORTCFG-TYPECFG-002` | `/base/products/queryForReportTemplate/{projectCode}` | GET | `projectCode=XOME`（当前项目下无启用产品） | `retCode=0`；`result` 为空数组 `[]` | - | 返回空数组 | 具备 `menuId=11008` 权限 |
| IT-CONFIG-REPORTCFG-TYPECFG-01-003 | `REQ-CONFIG-REPORTCFG-TYPECFG-002` | `/base/products/queryForReportTemplate/{projectCode}` | GET | `projectCode=XOME` | `retCode=0`；`result` 中**不包含** `status=0` 的产品 | - | 存在禁用产品时验证过滤是否在后端执行（若在前端过滤则此用例观察前端行为） | 具备 `menuId=11008` 权限 |

### 4.2 接口 `GET /base/products/reportTypeConfigs/{productNo}`

| 用例编号 | 关联需求编号 | 接口 | 方法 | 请求参数 | 正常返回 | 异常返回 | 边界值 | 权限场景 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IT-CONFIG-REPORTCFG-TYPECFG-02-001 | `REQ-CONFIG-REPORTCFG-TYPECFG-002` | `/base/products/reportTypeConfigs/{productNo}` | GET | `productNo=DX2489` | `retCode=0`；`result.productNo='DX2489'`；`result.reportTypeConfigs` 为对象，包含各位点类型键（如 `ExonCNVAndSNV`、`LargeCnv` 等），值为字符串数组 | `retCode≠0`（错误码待 04b 补充） | `productNo` 为空 / 不存在的产品编码 | 具备 `menuId=11008` 权限返回 200；无权限返回 401/403 |
| IT-CONFIG-REPORTCFG-TYPECFG-02-002 | `REQ-CONFIG-REPORTCFG-TYPECFG-002` | `/base/products/reportTypeConfigs/{productNo}` | GET | `productNo=DX2489`（该产品尚无保存配置） | `retCode=0`；`result.reportTypeConfigs` 各位点类型均为空数组或键缺失 | - | 首次使用的产品无历史配置 | 具备 `menuId=11008` 权限 |
| IT-CONFIG-REPORTCFG-TYPECFG-02-003 | `REQ-CONFIG-REPORTCFG-TYPECFG-002` | `/base/products/reportTypeConfigs/{productNo}` | GET | `productNo=DX2489`（后端返回包含非法枚举的 `reportTypeConfigs`） | `retCode=0`；前端只回填合法枚举，非法值不展示 | - | 后端返回枚举超出当前位点类型允许值 | 具备 `menuId=11008` 权限 |

### 4.3 接口 `POST /base/products/reportTypeConfigs/edit`

| 用例编号 | 关联需求编号 | 接口 | 方法 | 请求参数 | 正常返回 | 异常返回 | 边界值 | 权限场景 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IT-CONFIG-REPORTCFG-TYPECFG-03-001 | `REQ-CONFIG-REPORTCFG-TYPECFG-004` | `/base/products/reportTypeConfigs/edit` | POST | `{ "productNo": "DX2489", "reportTypeConfigs": { "ExonCNVAndSNV": ["Primary","ACMG"], "LargeCnv": [], "RohImprintArea": [], "Sv": [], "Mt": [], "Str": [], "PovertyCnv": [] } }` | `retCode=0`；保存成功 | `retCode≠0`（错误码待 04b 补充） | `productNo` 为空；`reportTypeConfigs` 缺失某位点类型键；某位点类型值为非法枚举字符串 | 具备 `menuId=11008` 权限返回 200；无权限返回 401/403 |
| IT-CONFIG-REPORTCFG-TYPECFG-03-002 | `REQ-CONFIG-REPORTCFG-TYPECFG-004` | `/base/products/reportTypeConfigs/edit` | POST | `{ "productNo": "DX2489", "reportTypeConfigs": { ... } }`（所有位点类型均为空数组） | `retCode=0`；允许保存全空配置 | - | 全部位点类型配置均为空数组 | 具备 `menuId=11008` 权限 |
| IT-CONFIG-REPORTCFG-TYPECFG-03-003 | `REQ-CONFIG-REPORTCFG-TYPECFG-004` | `/base/products/reportTypeConfigs/edit` | POST | 请求体包含 2 个产品的 `reportTypeConfigs`（模拟前端异常多产品提交） | 不应出现此请求（前端控制；若后端收到则只处理当前产品或返回参数错误） | 返回参数校验错误（错误码待 04b 补充） | 多产品提交 | 具备 `menuId=11008` 权限 |

---

## 5. 权限用例

| 用例编号 | 角色 | 操作 | 期望 |
| --- | --- | --- | --- |
| PT-CONFIG-REPORTCFG-TYPECFG-001 | 报告配置维护人员（具备 `menuId=11008`） | 访问 `/config/reportConfig`，切换项目为 `XOME` | 可见"报告类别配置"按钮；点击可打开弹窗 |
| PT-CONFIG-REPORTCFG-TYPECFG-002 | 无报告配置权限用户（不具备 `menuId=11008`） | 访问 `/config/reportConfig` | 路由守卫或菜单控制拦截，无法进入报告配置页面；或进入后"报告类别配置"按钮不可见 |
| PT-CONFIG-REPORTCFG-TYPECFG-003 | 无报告配置权限用户 | 直接调用 `GET /base/products/queryForReportTemplate/XOME` | HTTP 401 或 403；无法获取产品套餐列表 |
| PT-CONFIG-REPORTCFG-TYPECFG-004 | 无报告配置权限用户 | 直接调用 `GET /base/products/reportTypeConfigs/DX2489` | HTTP 401 或 403；无法获取配置信息 |
| PT-CONFIG-REPORTCFG-TYPECFG-005 | 无报告配置权限用户 | 直接调用 `POST /base/products/reportTypeConfigs/edit` | HTTP 401 或 403；保存请求被拒绝；数据库无写入 |
| PT-CONFIG-REPORTCFG-TYPECFG-006 | 报告配置维护人员（具备 `menuId=11008`） | 当前项目切换为非 `XOME` 项目后，尝试访问页面操作区 | "报告类别配置"按钮不展示；无法打开弹窗（前端入口条件控制） |

---

## 6. 异常用例

| 用例编号 | 异常类型 | 触发方式 | 期望表现 | 数据一致性 |
| --- | --- | --- | --- | --- |
| ET-CONFIG-REPORTCFG-TYPECFG-001 | 产品套餐查询接口失败 | 弹窗打开时，模拟 `GET /base/products/queryForReportTemplate/XOME` 返回网络错误或非零 `retCode` | 弹窗正常打开；产品套餐下拉呈禁用状态并显示"暂无可用数据"；位点类型 Tab 区域正常展示但不可操作；确定按钮禁用；不阻断页面打开；页面显示接口错误提示 | 无写入 |
| ET-CONFIG-REPORTCFG-TYPECFG-002 | 产品配置查询失败 | 选中产品套餐后，模拟 `GET /base/products/reportTypeConfigs/{productNo}` 超时或返回错误 | 提示"查询失败"；当前产品套餐下各位点类型以空配置展示；用户仍可手工勾选并继续保存 | 无写入 |
| ET-CONFIG-REPORTCFG-TYPECFG-003 | 保存接口失败（业务错误） | 点击"确定"后，模拟 `POST /base/products/reportTypeConfigs/edit` 返回非零 `retCode` | 弹窗保持打开；loading 结束；统一错误处理弹出错误提示；已勾选状态保留 | 无写入 |
| ET-CONFIG-REPORTCFG-TYPECFG-004 | 保存接口失败（网络超时） | 点击"确定"后，模拟网络请求超时 | 弹窗保持打开；loading 结束；显示超时/网络异常友好提示；已勾选状态保留 | 无写入 |
| ET-CONFIG-REPORTCFG-TYPECFG-005 | Token 过期 | 用户长时间停留在弹窗中，Token 过期后点击"确定" | HTTP 401；前端统一拦截器处理，提示登录过期并跳转登录页 | 无写入 |
| ET-CONFIG-REPORTCFG-TYPECFG-006 | 后端返回非法枚举值 | 配置查询接口返回 `ExonCNVAndSNV` 包含不属于该位点类型允许范围的枚举字符串 | 前端过滤非法值，不在复选框中展示也不回显为已选状态；仅保留合法枚举 | 无写入（页面过滤，不影响持久化） |
| ET-CONFIG-REPORTCFG-TYPECFG-007 | 重复保存（快速双击确定） | 保存请求发出后，在请求返回前快速再次点击"确定" | 第二次点击无效（按钮 loading/禁用）；不发出第二次保存请求 | 无重复写入 |
| ET-CONFIG-REPORTCFG-TYPECFG-008 | 关闭弹窗未保存（草稿丢弃） | 在弹窗内勾选了报告类别但未点击"确定"，直接点击关闭/取消 | 弹窗关闭；本次临时编辑内容被清空；无保存请求发出；无二次确认弹框 | 无写入 |

---

## 7. 回归测试清单

| 用例编号 | 类型 | 涉及模块 | 备注 |
| --- | --- | --- | --- |
| FT-CONFIG-REPORTCFG-TYPECFG-001-001 | 功能 | 报告类别配置 / 入口展示 | XOME 项目下入口可见冒烟 |
| FT-CONFIG-REPORTCFG-TYPECFG-001-002 | 功能 | 报告类别配置 / 入口展示 | 非 XOME 项目入口隐藏冒烟 |
| FT-CONFIG-REPORTCFG-TYPECFG-001-003 | 功能 | 报告类别配置 / 入口展示 | 点击打开弹窗冒烟 |
| FT-CONFIG-REPORTCFG-TYPECFG-002-001 | 功能 | 报告类别配置 / 产品加载 | 弹窗打开默认选中首个产品冒烟 |
| FT-CONFIG-REPORTCFG-TYPECFG-002-002 | 功能 | 报告类别配置 / 配置回填 | 已保存配置正确回填冒烟 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-001 | 功能 | 报告类别配置 / 位点类型切换 | 7 个 Tab 全量切换冒烟 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-009 | 功能 | 报告类别配置 / 勾选交互 | 勾选数量实时更新冒烟 |
| FT-CONFIG-REPORTCFG-TYPECFG-003-013 | 功能 | 报告类别配置 / 全选 | 全选后全部选项选中及取消全选冒烟 |
| FT-CONFIG-REPORTCFG-TYPECFG-004-002 | 功能 | 报告类别配置 / 保存成功 | 保存成功关闭弹窗冒烟 |
| FT-CONFIG-REPORTCFG-TYPECFG-004-003 | 功能 | 报告类别配置 / 保存校验 | 无可用产品时确定禁用冒烟 |
| IT-CONFIG-REPORTCFG-TYPECFG-02-001 | 接口 | 报告类别配置查询接口 | 配置查询正常返回冒烟 |
| IT-CONFIG-REPORTCFG-TYPECFG-03-001 | 接口 | 报告类别配置保存接口 | 配置保存正常提交冒烟 |
| PT-CONFIG-REPORTCFG-TYPECFG-001 | 权限 | 报告类别配置 / 权限控制 | 有权限用户可访问冒烟 |
| PT-CONFIG-REPORTCFG-TYPECFG-002 | 权限 | 报告类别配置 / 权限控制 | 无权限用户不可访问冒烟 |
| ET-CONFIG-REPORTCFG-TYPECFG-003 | 异常 | 报告类别配置 / 保存失败 | 保存失败弹窗保持打开 |
| ET-CONFIG-REPORTCFG-TYPECFG-005 | 异常 | 报告类别配置 / Token 过期 | Token 过期跳转登录 |
| ET-CONFIG-REPORTCFG-TYPECFG-008 | 异常 | 报告类别配置 / 草稿丢弃 | 关闭弹窗草稿清空冒烟 |

---

## 8. 测试报告字段要求

### 8.1 报告必备字段

| 字段名     | 类型    | 必填 | 说明                           |
| ---------- | ------- | ---- | ------------------------------ |
| 报告版本   | String  | 是   | 如 `V1.5.3.1-R1`               |
| 测试环境   | String  | 是   | 引用第 2 章环境信息            |
| 用例总数   | Integer | 是   | 本文档所有用例数量             |
| 通过数     | Integer | 是   | 实际执行通过的用例数           |
| 失败数     | Integer | 是   | 实际执行失败的用例数           |
| 阻塞数     | Integer | 是   | 因环境或依赖阻塞未执行的用例数 |
| 缺陷清单   | Table   | 是   | 见 8.2                         |
| 覆盖率达成 | Table   | 是   | 见 8.3                         |
| 风险结论   | String  | 是   | 可发版 / 不可发版 + 原因       |

### 8.2 缺陷清单字段

| bugId | 关联用例编号 | 严重度 | 状态 | 复现步骤 |
| --- | --- | --- | --- | --- |
| {} | `FT-CONFIG-REPORTCFG-TYPECFG-{MODULE}-{SEQ}` | P0/P1/P2 | 待修复/已修复/验证中 | {} |

### 8.3 覆盖率达成

| 维度           | 目标  | 实际 |
| -------------- | ----- | ---- |
| 功能用例覆盖度 | ≥ 95% | {}   |
| 接口覆盖度     | 100%  | {}   |
| 权限矩阵覆盖度 | 100%  | {}   |
| 异常分支覆盖度 | ≥ 90% | {}   |

---

## 附录 A. 与下游文档的字段映射

| 测试用例字段 | 来源接口字段 | 来源详细设计 | 数据库字段 | 前端使用位置 |
| --- | --- | --- | --- | --- |
| 项目编码 `XOME` | `projectCode`（路径参数） | 详设 5.1.4.1 入口显隐条件 | [待后端补充] | 页面项目筛选项，控制入口显隐 |
| 产品套餐编码 | `result.productNo` / 保存请求 `productNo` | 详设 5.1.4.2 / 5.1.4.4 字段说明 | [待后端补充] | 弹窗产品套餐下拉；保存请求体 |
| 报告类别配置结果 | `result.reportTypeConfigs` / 保存请求 `reportTypeConfigs` | 详设 5.1.4.2 / 5.1.4.4 字段说明 | [待后端补充] | 各位点类型 Tab 复选框区域 |
| SNV/ExonCNV 已选类别 | `reportTypeConfigs.ExonCNVAndSNV[]` | 详设 5.1.4.3 位点类型配置键 | [待后端补充] | SNV/ExonCNV Tab 复选框选中状态 |
| 权限用例菜单授权 | HTTP 401/403 响应 | 详设 5.1.2 数据权限规则（`menuId=11008`） | [待后端补充] | 路由守卫 / 按钮显隐 |

---

## 附录 B. 一致性检查清单

- [x] 用例编号格式统一（功能 `FT-`、接口 `IT-`、权限 `PT-`、异常 `ET-`）
- [x] 功能用例字段完整：用例编号 / 关联需求编号 / 模块 / 前置条件 / 操作步骤 / 预期结果 / 优先级
- [x] 接口用例字段完整：用例编号 / 关联需求编号 / 接口 / 方法 / 请求参数 / 正常返回 / 异常返回 / 边界值 / 权限场景；`04b-后台文档.md` 未生成，错误码已标注"待 04b 补充"
- [x] 详设第 5 章每个需求实现单元（001-004）的关键功能动作，均被功能/接口/权限/异常四类用例覆盖
- [x] 每条功能用例和接口用例均填写关联需求编号，且编号能在 `04-报告类别配置详细设计文档.md` 第 5 章和 `01-报告类别配置需求文档.md` 中找到同号来源
- [x] 错误码已按 04b 未生成状态标注待回填来源
- [x] 第 4 章接口用例覆盖详设第 6 章全部 3 个接口
- [x] 详设第 5 章每个关键功能动作至少覆盖主路径、失败路径及空状态
- [x] 权限用例覆盖有权限/无权限两类角色 × 全部接口和入口
- [x] 第 2.2 节测试账号矩阵覆盖详设第 2.3 节定义角色
- [x] 异常用例覆盖：产品查询失败、配置查询失败、保存失败（业务/网络）、Token 过期、非法返回值过滤、重复提交防护、草稿丢弃
- [x] 回归测试清单包含全部核心模块 P0 用例
- [x] 测试报告字段表已列出，便于执行后回填
- [x] 已将全选/取消全选关键用例（-013、-014）并入 3.3，不独立为模块；回归清单精简为 1 条全选冒烟条目
- [x] 未出现"TBD"、"后续补充"等占位语句（待后端补充项已明确标注原因）
- [x] 未原样复制模板示例的 OmicsDB 业务事实
- [x] 附录 A 字段映射 5 条，覆盖测试 → 接口 → 详设 → DB → 前端链路
