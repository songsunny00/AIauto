---
name: api-automation-bootstrap
description: 基于详细设计、接口信息与测试点生成 API 自动化目录结构、README 要点和脚本骨架建议。
allowed-tools: Read Glob Grep Edit Write
---

# api-automation-bootstrap

## 1. 目标

围绕目标模块输出一套可直接起步的 API 自动化骨架方案，服务 `Tests/api/...` 目录建设和 Playwright API 脚本起步。

## 2. 适用输入

- `02-详细设计文档.md`
- `03-测试用例文档.md`
- 接口定义 / 路径 / 方法 / 入参出参
- 鉴权说明
- 环境说明

## 3. 期望输出

至少输出：

1. 目标 API 自动化目录结构
2. 建议创建的 `specs/clients/fixtures/data/schemas` 文件清单
3. `README.md` 需要说明的要点
4. 每个 `IT-*` 对应的初始脚本命名建议
5. 鉴权、环境、造数、清数建议
6. 哪些接口场景优先实现

## 4. 使用步骤

1. 从 `03` 中找出适合 API 自动化的 `IT-*`。
2. 结合 `02` 中的接口、状态流、权限规则，整理测试范围。
3. 输出 `ATS-*.api.spec.ts` 命名建议。
4. 输出 client、fixture、schema、data 的最小清单。
5. 标记环境、鉴权、测试数据前置要求。

## 5. 输出格式建议

```markdown
## 目录结构建议
- Tests/api/.../

## 文件建议
- specs/ATS-....api.spec.ts
- clients/...client.ts
- fixtures/...fixture.ts
- data/...data.ts
- schemas/...schema.ts
- README.md

## 优先场景
- 

## 环境与鉴权建议
- 
```

## 6. 约束

- 不只输出目录名，要明确哪些 `IT-*` 映射到哪些脚本。
- 不单独维护额外测试映射文件，继续沿用 `REQ -> IT -> ATS` 主线。
- 接口自动化可更前置，只要接口定义、鉴权方式、入参出参基本稳定即可先起骨架。
- 不建议只断言 `status = 200` 或 `code = 0`。
