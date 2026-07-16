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
6. **生成测试数据前，先访问测试页面查看系统已有数据**（机构名、项目名、状态值等），基于实际数据编写，不要凭空编造。

## 5. 目录结构建议

默认采用“**UI 共享层 + 一级模块 + 二级模块**”结构。

- **共享层**：放在 `Tests/ui/`，存放整个 UI 自动化共用的环境、登录态、依赖、报告、公共脚本。
- **一级模块**：如 `CONFIG-配置中心/`。
- **二级模块**：如 `BILLCFG-商业化计费配置/`，只放本模块自己的 `specs/pages/fixtures/data/README`。

```text
Tests/ui/
├── package.json                # UI 自动化共享依赖
├── package-lock.json
├── node_modules/               # 共享依赖安装目录
├── playwright.config.ts        # UI 全局 Playwright 配置
├── global-setup.ts             # UI 全局登录 + storageState 保存
├── .env                        # UI 共享环境配置（gitignore）
├── .env.example                # UI 共享环境配置示例
├── .auth/                      # UI 共享认证态（gitignore）
│   └── ui-state.json
├── test-reports/               # UI 共享测试报告输出目录
├── utils/                      # 公共脚本，如验证码处理、图像缺口识别等
│   ├── solve-captcha.js
│   └── get-gap.js
├── CONFIG-配置中心/            # 一级模块
│   ├── BILLCFG-商业化计费配置/ # 二级模块
│   │   ├── specs/
│   │   │   ├── ATS-CONFIG-BILLCFG-LIST-001.spec.ts
│   │   │   ├── ATS-CONFIG-BILLCFG-DETAIL-001.spec.ts
│   │   │   └── ATS-CONFIG-BILLCFG-FORM-001.spec.ts
│   │   ├── pages/
│   │   │   └── billing.page.ts
│   │   ├── fixtures/
│   │   │   └── billing.fixture.ts
│   │   ├── data/
│   │   │   └── billing.data.ts
│   │   ├── snapshots/
│   │   └── README.md
│   └── <其他二级模块>/
└── <其他一级模块>/
```

说明：若某个一级模块确实有独立登录态、独立环境变量或独立运行配置，再在该一级模块下局部覆盖；默认不要把 `.env`、`.auth`、`playwright.config.ts`、`global-setup.ts` 直接散落到二级模块目录。

## 6. 文件建议

### 6.1 UI 共享层文件（`Tests/ui/`）

| 文件 / 目录            | 说明                                              | 必需 |
| ---------------------- | ------------------------------------------------- | ---- |
| `package.json`         | UI 自动化共享依赖入口                             | ✅   |
| `playwright.config.ts` | UI 全局 Playwright 配置                           | ✅   |
| `global-setup.ts`      | 登录 + 验证码处理 + 保存认证态                    | ✅   |
| `.env` / `.env.example`| `TEST_BASE_URL`、`TEST_USERNAME`、`TEST_PASSWORD` | ✅   |
| `.auth/`               | 共享认证态文件目录                                | ✅   |
| `test-reports/`        | 共享报告输出目录                                  | ✅   |
| `utils/*.js`           | 公共脚本，如验证码、图片处理等                    | 按需 |

### 6.2 二级模块文件（`Tests/ui/<一级模块>/<二级模块>/`）

| 文件                    | 说明                                 | 必需 |
| ----------------------- | ------------------------------------ | ---- |
| `specs/ATS-*.spec.ts`   | 每个功能点编号对应一个 spec 文件     | ✅   |
| `pages/*.page.ts`       | 页面对象，封装选择器与操作           | ✅   |
| `fixtures/*.fixture.ts` | 模块夹具，封装模块级上下文与扩展能力 | ✅   |
| `data/*.data.ts`        | 测试数据集中管理（基于系统已有数据） | ✅   |
| `snapshots/`            | 模块级快照或对比工件                 | 按需 |
| `README.md`             | 模块说明、运行方式、前置条件         | ✅   |

## 7. 输出格式建议

```markdown
## 场景优先级

- 先做：列表加载、查询筛选、详情查看（数据驱动、交互简单）
- 后做：新增/编辑表单（依赖级联选择、表单校验）、状态启停（依赖确认弹窗）

## 定位与等待建议

- 选择器优先级：data-testid > aria-label > CSS class > 文本
- 等待策略：用 expect(element).toBeVisible()，不用 networkidle
```

## 8. 边界与移交

### 8.1 本 skill 负责

- 输出 UI 自动化目录结构、文件清单、README 要点
- 给出 `ATS-*.spec.ts` / `pages` / `fixtures` / `data` 的骨架建议
- 给出场景优先级、定位方式、等待策略、可测性要求
- 帮 tester 判断哪些 `FT-*` 适合先做、哪些场景应后做

### 8.2 本 skill 不负责

- 不直接承担完整可执行的 `spec/page/fixture/data` 脚本实现
- 不负责基于 trace / error-context / junit 的失败脚本修复
- 不负责版本迭代中的既有脚本改造、维护与回归修订
- 不负责把骨架建议扩展成完整 Playwright 业务实现

### 8.3 何时移交给下一个 skill

当任务进入以下任一场景时，应切换到 `playwright-test-implementation`：

- 需要生成真实可执行的 Playwright 脚本代码
- 需要补齐页面对象、夹具、测试数据与断言逻辑
- 需要针对版本增量修改既有脚本
- 需要结合 trace / error-context / junit 修失败用例

## 9. 约束

- 不把 Browser Use 这类探索式能力当作正式回归脚本主引擎。
- 脚本命名必须保留功能点编号主线。
- 优先用稳定定位点，再考虑脆弱选择器。
- UI 自动化骨架可前置，但完整主场景脚本应在页面结构和定位点基本稳定后补齐。
- **禁止在测试脚本中硬编码测试环境地址与账号**，必须通过 `Tests/ui/.env` 这类 UI 共享环境配置注入。
- **禁止每个测试用例单独登录**，必须使用 UI 共享层的 `globalSetup` + `storageState` 复用认证态。
- **禁止用 `networkidle` 作为主要等待手段**，改用 DOM 元素可见性断言。
- **选择器必须优先使用 `data-testid`**，缺失时要求前端补充，而非直接用脆弱的 CSS class 或文本定位。
- **测试数据必须基于系统已有数据编写**，先访问页面查看实际值（机构名、项目名、产品名、状态值等），不要凭空编造。
- **默认将 `playwright.config.ts`、`global-setup.ts`、`.env`、`.auth`、共享依赖与公共脚本放在 `Tests/ui/` 共享层**，不要为每个二级模块重复放置一套。
