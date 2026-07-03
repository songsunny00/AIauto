# OmicsDB Portal - AI 编码规范

> 本文件供 AI 编码工具自动读取，定义在本项目中编写和修改代码必须遵守的规则。

## 项目概述

- **项目名称**: OmicsDB 数据交付门户（基因测序数据管理平台）
- **技术栈**: Vue 3.4 + Vite 5 + Pinia 2.1 + Element Plus 2.6 + SCSS
- **语言**: JavaScript（禁止使用 TypeScript）
- **包管理**: npm
- **后端 API 前缀**: `/api/v1`

## 核心约束（必须遵守）

### 1. 框架与语法

- 所有 Vue 组件必须使用 `<script setup>` + Composition API，禁止 Options API
- 使用 `ref` 而非 `reactive` 管理简单状态（对象/数组除外）
- 样式块必须使用 `<style lang="scss" scoped>`，禁止无 scoped 的组件样式
- 禁止使用 `this`

### 2. 通用组件（必须复用，禁止重复造轮子）

项目已封装三个核心业务组件，新页面必须基于它们构建：

| 组件            | 路径                                        | 用途                                        |
| --------------- | ------------------------------------------- | ------------------------------------------- |
| `AppForm`     | `src/components/business/AppForm.vue`     | 所有表单（通过 fields 数组配置驱动）        |
| `AppTable`    | `src/components/business/AppTable.vue`    | 所有数据表格（通过 columns 数组配置驱动）   |
| `AppListPage` | `src/components/business/AppListPage.vue` | 列表页容器（搜索栏 + 工具栏 + 表格 + 分页） |

- 禁止在页面中直接使用 `<el-form>` / `<el-table>` 搭建完整表单或表格

#### AppForm 自定义插槽模式

当表单中需要渲染标准字段类型无法覆盖的复杂 UI（如富文本编辑器、复选框面板、分区标题等），使用 `type: 'custom'` 字段 + 具名插槽：

```javascript
const formFields = [
  { name: 'content', label: '邮件内容', type: 'custom', required: true },
  { name: 'permissions', label: '数据权限', type: 'custom', span: 24 }
]
```

```html
<AppForm :form-data="form" :fields="formFields" :show-actions="false">
  <template #content>
    <RichEditor v-model="form.content" />
  </template>
  <template #permissions>
    <CustomCheckboxPanel ... />
  </template>
</AppForm>
```

### 3. Composables（必须复用）

| Composable        | 路径                                 | 用途                       |
| ----------------- | ------------------------------------ | -------------------------- |
| `useTable`      | `src/composables/useTable.js`      | 表格分页、排序、搜索、删除 |
| `useForm`       | `src/composables/useForm.js`       | 表单验证、提交、重置       |
| `useSearchForm` | `src/composables/useForm.js`       | 搜索表单逻辑               |
| `useDialog`     | `src/composables/useDialog.js`     | 弹窗打开/关闭/状态管理     |
| `usePermission` | `src/composables/usePermission.js` | 权限检查、角色检查         |

### 4. API 请求规范

- 所有 HTTP 请求必须使用 `src/api/request.js` 封装的 `get`/`post`/`put`/`del`/`upload`/`download` 方法
- 禁止直接 `import axios`、禁止使用原生 `fetch`
- 新增接口必须在 `src/api/modules/` 下按业务模块创建文件，并在 `src/api/index.js` 统一导出
- 后端接口成功返回 `code: '0'`，数据在 `data` 字段中（request.js 已自动解包）
- 接口地址使用相对路径（如 `/auth/login`），baseURL 由环境变量 `VITE_API_BASE_URL` 控制

### 5. 状态管理

- 使用 Pinia，Store 文件放在 `src/stores/` 下
- 用户状态通过 `useUserStore()` 获取，包含角色、权限、数据范围
- Token 通过 `src/utils/auth.js` 的 `getToken`/`setToken`/`removeToken` 管理

### 6. 路由与权限

- 路由配置在 `src/router/index.js`，采用静态导入（禁止动态 `import()`）
- 路由权限通过 `meta.roles` 数组控制（如 `roles: ['ADMIN', 'DELIVERY']`）
- 角色代码全大写：`ADMIN` / `DELIVERY` / `SALES` / `CUSTOMER`
- 路由守卫已在 `router/index.js` 中统一实现，禁止在其他位置重复添加

### 7. 常量与配置

- 全局常量定义在 `src/constants/config.js`
- 环境变量通过 `.env` / `.env.development` / `.env.production` 管理
- 禁止在代码中硬编码 URL、端口、超时时间等可配置项

## 文件组织规范

### 目录结构

```
src/
  api/modules/        # API 接口（按业务模块拆分）
  components/
    business/         # 业务通用组件（AppForm、AppTable、AppListPage）
    common/           # 基础通用组件（BaseChart、RichEditor、StatCard）
    layout/           # 布局组件（AppLayout、Header、Sidebar）
  composables/        # 组合式函数（useTable、useForm、usePermission 等）
  constants/          # 常量定义
  directives/         # 自定义指令
  router/             # 路由配置
  stores/             # Pinia 状态管理
  styles/             # 全局样式（variables.scss、mixins.scss、global.scss）
  utils/              # 工具函数（auth、date、format、validate、storage）
  views/              # 页面视图（按功能模块建目录）
```

### 页面文件拆分规则

- 单个 `.vue` 文件不超过 500 行
- 超过 500 行必须拆分子组件，放在同级 `components/` 目录下
- 页面私有组件放在 `views/{module}/components/` 下

### 组件架构模式

页面拆分时采用 **薄编排层 + 自包含子组件** 模式：

- **入口页（index.vue）** 作为薄编排层：只负责加载共享数据、管理 Tab 切换、向子组件分发 props，不包含具体业务逻辑
- **Tab 级子组件** 应尽量自包含：内部管理自身的数据加载、状态和交互逻辑，通过 `watch(props.active)` 实现按需加载
- **对话框组件** 应自包含保存逻辑：通过 `defineExpose({ open })` 暴露打开方法，内部管理表单状态和 API 调用，保存成功后 `emit('saved')` 通知父组件刷新

```
views/system/
  index.vue                      # 薄编排层（~200行）：Tab切换 + 共享数据加载
  components/
    UserPermissionTab.vue        # 自包含：用户管理 + 权限矩阵
    NotificationConfig.vue       # 自包含：通知场景 + 模板管理
    EmailLog.vue                 # 自包含：邮件记录查询
    TemplateDialog.vue           # 自包含对话框：模板编辑 + 保存
    RecipientRuleDialog.vue      # 自包含对话框：收件人配置
```

### 命名规范

- Vue 组件文件：`PascalCase.vue`（如 `UserDialog.vue`）
- JS 工具文件：`camelCase.js`（如 `useTable.js`）
- 变量/函数：`camelCase`
- 常量：`UPPER_SNAKE_CASE`
- 组件名：`PascalCase`
- CSS 类名：`kebab-case`
- 路由路径：`kebab-case`（如 `/user-management`）

## 样式规范

### SCSS 变量

全局变量已在 `src/styles/variables.scss` 中定义并自动注入所有组件：

- 主色：`$primary-color: #1E40AF`
- 间距：`$spacing-xs` / `$spacing-sm` / `$spacing-md` / `$spacing-base` / `$spacing-lg` / `$spacing-xl` / `$spacing-xxl`
- 圆角：`$radius-sm` / `$radius-base` / `$radius-lg`
- 阴影：`$shadow-sm` / `$shadow-base` / `$shadow-md`
- 文字色：`$text-primary` / `$text-regular` / `$text-secondary`

编写样式时必须使用这些变量，禁止硬编码颜色值、间距值。

#### 允许硬编码的例外场景

以下场景中 SCSS 变量在技术上不可用，允许直接使用十六进制颜色值：

- **运行时生成的 HTML 字符串**：如 `dangerouslyInsertHtml()` 插入的富文本标签，SCSS 变量在运行时不存在
- **组件 prop 要求字符串字面量**：如 `<el-switch active-color="#52C41A">`，prop 绑定无法引用 SCSS 变量

遇到此类场景时，需在代码旁添加注释说明豁免原因。

### 全局样式

- 全局样式仅在 `src/styles/global.scss` 中定义
- 覆盖 Element Plus 样式时使用 `:deep()` 选择器，尽量避免 `!important`

## 安全规范（红线）

- 禁止在代码中硬编码密码、密钥、Token 等敏感信息
- 禁止提交任何 `console.*` 调用（`console.log` / `console.error` / `console.warn` 等），开发调试必须用 `if (import.meta.env.DEV)` 条件包裹
- 禁止使用 `eval()`、`Function()` 构造器、`v-html`（除非已对内容做 XSS 转义）
- 所有用户输入必须验证（使用 `src/utils/validate.js` 中的工具函数）
- 存储敏感数据必须通过 `src/utils/storage.js` 或 `src/utils/auth.js`，禁止直接操作 `localStorage`

## 代码质量

### 错误处理

- 所有异步操作必须使用 `try-catch`，catch 中需给用户友好提示（`ElMessage.error`）
- API 调用可使用 `{ silent: true }` 配置静默错误（不弹提示）

### 注释要求

- 工具函数和 Composable 必须添加 JSDoc 注释（参数类型、返回值、用途）
- 复杂业务逻辑需添加行内注释说明意图
- 禁止无意义的注释（如 `// 定义变量`）

### 代码检查命令

```bash
npm run dev          # 启动开发服务器（localhost:3000）
npm run build        # 生产构建
npm run lint         # ESLint 检查并自动修复
npm run lint:style   # StyleLint 样式检查
npm run lint:all     # 完整检查（ESLint + StyleLint + Prettier）
npm run format       # Prettier 格式化
```

修改代码后必须运行 `npm run lint` 确保通过。

## 新增页面流程

开发一个新的列表页时，按以下步骤操作：

1. 在 `src/api/modules/` 下新建接口文件，定义 CRUD 接口
2. 在 `src/views/{module}/` 下创建 `index.vue` 作为页面入口
3. 使用 `useTable` composable 管理表格逻辑
4. 使用 `AppListPage` 或 `AppTable` + `AppForm` 组合构建页面
5. 如需弹窗编辑，使用 `useDialog` + `useForm` composable
6. 在 `src/router/index.js` 中添加路由（静态导入组件）
7. 如有权限要求，在路由 `meta.roles` 中配置

## 已知约束

- 后端返回的分页数据格式：`{ list: [...], total: number }`
- 角色层级：ADMIN > DELIVERY > SALES > CUSTOMER
- 邮件模板类型定义在 `src/constants/config.js` 的 `EMAIL_TEMPLATE_TYPE_OPTIONS`
- 数据范围（可访问的产品）定义在 `DATA_SCOPE_OPTIONS`
- 富文本编辑器使用 WangEditor（`@wangeditor/editor` + `@wangeditor/editor-for-vue`）
