# 前端规则

## 技术与组织

- 使用 React 19、TypeScript、Vite、TanStack Router、TanStack Query、TanStack Table、React Hook Form、Zod、Zustand、Tailwind CSS 和本地 shadcn/ui；包管理器使用 pnpm。
- 文件路由放在 `src/routes`，页面实现放在 `src/features/<feature>`，接口调用和 Query Options 放在功能的 `data` 目录。只有跨功能复用的代码进入 `src/components`、`src/hooks`、`src/lib`、`src/types` 或 `src/stores`。
- `src/routeTree.gen.ts` 和 `src/client/**` 是生成文件，禁止手工修改。
- 不引入第二套路由、请求、表单、状态或组件系统。新增依赖和抽象必须有真实消费者。

## 接口与认证

- 后端 OpenAPI 是唯一接口契约。先改后端，再运行 `make generate-client`；前端直接使用生成的 Service 和 request/response 类型。
- 功能数据层调用 `generatedApiClient`；登录、刷新和退出调用 `generatedPublicApiClient`。完整流程见 [`docs/api-workflow.md`](docs/api-workflow.md)。
- 共享 Axios 客户端统一处理 Bearer token、非零业务码、HTTP 错误和 single-flight refresh；不要新增通用 `request()`、原始 Axios 实例或业务 `fetch` wrapper。
- 服务端数据用 TanStack Query；query key 包含所有影响结果的参数，mutation 成功后精确更新或失效缓存。不要用 Zustand 保存服务端列表。
- 认证状态只由 `src/stores/auth-store.ts` 持有。页面和 Query Hook 不重复实现 token 刷新；登录 redirect 只能指向站内路径。
- Zod 用于表单、URL、浏览器持久化和外部未类型化数据；同仓库生成的响应类型不再手写一套 schema。
- 分页统一使用 `page`、`pageSize`、`items` 和 `total`。请求失败必须显示错误和恢复入口，不能伪装为空数据。

## UI 与配置

- 管理端保持紧凑、可扫描，复用现有 shadcn/Radix 组件、语义 token 和 Lucide 图标；保留键盘、焦点、ARIA 和 RTL 行为。
- `src/components/ui` 是本地维护源码。shadcn CLI 结果先审查差异，不直接覆盖；基础组件修改需检查现有调用点。
- 默认验收桌面端；只有需求明确时才扩展移动端。
- 环境配置只通过 `src/lib/env.ts` 读取。运行时变量为 `VITE_API_BASE_URL` 和 `VITE_APP_BASE_PATH`，本地端口由 `VITE_DEV_PORT` 控制。
- 修改运行时变量时同步更新 `.env.example`、`src/vite-env.d.ts`、`public/env-config.js`、容器入口和测试。

## 验证

```bash
pnpm lint
pnpm format:check
pnpm knip
pnpm test
pnpm build
```

- 先运行最窄相关测试。认证、请求层、共享组件、路由、环境配置或跨功能改动需要扩大到完整测试和构建。
- `pnpm test` 使用 Vitest Browser Mode 和 Playwright Chromium。无法运行时说明具体控制面、原因和剩余风险。
- 不提交 `.env`、凭据、`dist`、coverage、浏览器截图、`.vitest-attachments` 或开发日志。
