# 前端规则

## 技术与组织

- 使用 React 19、TypeScript、Vite、TanStack Router、TanStack Query、TanStack Table、React Hook Form、Zod、Zustand、Tailwind CSS 和本地 shadcn/ui；包管理器使用 pnpm。
- 文件路由放在 `src/routes`，页面实现放在 `src/features/<feature>`，接口调用和 Query Options 放在功能的 `data` 目录。只有跨功能复用的代码进入 `src/components`、`src/hooks`、`src/lib`、`src/types` 或 `src/stores`。
- `src/routeTree.gen.ts` 和 `src/client/**` 是生成文件，禁止手工修改。
- 不引入第二套路由、请求、表单、状态或组件系统。新增依赖和抽象必须有真实消费者。
- 使用 pnpm 修改依赖和 lockfile，不手工编辑 `pnpm-lock.yaml`；保持 TypeScript strict，不用 `any`、`@ts-ignore` 或扩大 ignore 掩盖问题。

## 接口与认证

- 后端 OpenAPI 是唯一接口契约。先改后端，再运行 `make generate-client`；前端直接使用生成的 Service 和 request/response 类型。
- 功能数据层调用 `generatedApiClient`；登录、刷新和退出调用 `generatedPublicApiClient`。完整流程见 [`docs/api-workflow.md`](docs/api-workflow.md)。
- 共享 Axios 客户端统一处理 Bearer token、非零业务码、HTTP 错误和 single-flight refresh；不要新增通用 `request()`、原始 Axios 实例或业务 `fetch` wrapper。
- 服务端数据用 TanStack Query；query key 包含所有影响结果的参数，mutation 成功后精确更新或失效缓存。不要用 Zustand 保存服务端列表。
- 认证状态只由 `src/stores/auth-store.ts` 持有。页面和 Query Hook 不重复实现 token 刷新；登录 redirect 只能指向站内路径。
- 除非需求明确公开，新业务页面放在 `src/routes/_authenticated`。`/_authenticated` 的认证门禁只判断 session 是否存在，token 有效性由后端和请求层决定。
- 已确认的页面权限规则集中在 `src/lib/router-access.ts`，由 Sidebar 和受限父路由共同消费；当前 Users 只允许 `isSuperuser` 用户。前端门禁只改善可见性和导航体验，后端仍负责最终权限校验。
- 没有后端权限契约时，不自行推断 RBAC、菜单权限或按钮权限。
- Zod 用于表单、URL、浏览器持久化和外部未类型化数据；同仓库生成的响应类型不再手写一套 schema。
- 分页统一使用 `page`、`pageSize`、`items` 和 `total`。请求失败必须显示错误和恢复入口，不能伪装为空数据。
- URL 是可分享的分页、搜索、筛选和排序状态源；条件变化回到第一页，浏览器前进和后退必须恢复状态。
- 服务端列表优先复用 `ServerDataTable`。服务端排序不能只重排当前页，跨页选择和批量操作不能伪装成全量行为。

## UI 与配置

- 管理端保持紧凑、可扫描，复用现有 shadcn/Radix 组件、语义 token 和 Lucide 图标；保留键盘、焦点、ARIA 和 RTL 行为。
- `src/components/ui` 是本地维护源码，且不完全受 ESLint 和 Knip 覆盖。shadcn CLI 结果先审查差异，不直接覆盖；基础组件修改需检查调用点和相关测试。
- 默认验收桌面端；只有需求明确时才扩展移动端。
- 环境配置只通过 `src/lib/env.ts` 读取。运行时变量为 `VITE_API_BASE_URL` 和 `VITE_APP_BASE_PATH`，本地端口由 `VITE_DEV_PORT` 控制。
- 修改运行时变量时同步更新 `.env.example`、`src/vite-env.d.ts`、`public/env-config.js`、容器入口和测试。
- 修改 base path、静态资源、Nginx fallback 或运行时 env 注入时，同时验证根路径和非根路径，并保留 `/healthz`、SPA fallback、`env-config.js` 不缓存及 Nginx worker 读取静态文件所需权限。

## 验证

```bash
pnpm lint
pnpm format:check
pnpm knip
pnpm test
pnpm build
```

- 先运行最窄相关测试。认证、请求层、共享组件、路由、环境配置或跨功能改动需要扩大到完整测试和构建。
- `pnpm test` 使用 Vitest Browser Mode 和 Playwright Chromium，验证组件与模拟请求行为；`pnpm test:e2e` 才是连接已启动前后端的真实全栈 E2E。
- 只有在真实前后端共同运行、等待 access token 实际过期并观察到 refresh、token 轮换和原请求重试后，才能声称 token 过期刷新通过运行时验证；mock adapter 或 Browser Mode 测试不能替代该证据。
- 某个浏览器控制面无法运行时，说明具体控制面、原因和剩余风险，不笼统声称浏览器或 Playwright 不可用。
- 视觉或交互变更按影响检查桌面视口、light/dark、RTL、键盘、焦点和错误状态。
- 不提交 `.env`、凭据、`dist`、coverage、浏览器截图、`.vitest-attachments` 或开发日志。
