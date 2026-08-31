# 全栈模板前端

这是全栈模板的 React 管理端。它提供统一的应用壳层、真实的认证与用户管理、主题、RTL 支持和浏览器测试，但不与具体产品领域绑定。

## 已包含页面

- Dashboard 指标与图表示例
- Users 真实服务端分页和增删改查
- Profile 真实姓名与邮箱编辑
- Security 真实密码修改
- Appearance 主题设置
- Display 侧边栏本地偏好
- Sign in 登录页
- 401、403、404、500 和 503 公开错误页

模板不提供公开注册。账号由管理员在 Users 页面创建；密码重置需要完整的邮件流程，
当前也不开放对应页面。

## 技术栈

- React 19 和 TypeScript
- Vite 和 TanStack Router
- TanStack Query 和 TanStack Table
- Tailwind CSS 和 shadcn/ui
- React Hook Form 和 Zod
- Zustand
- 使用 Playwright 的 Vitest Browser Mode

## 本地开发

环境要求：

- Node.js 20.19 及以上
- pnpm 10.34

```bash
pnpm install
cp .env.example .env
pnpm dev
```

运行时配置：

- `VITE_API_BASE_URL`：后端 API 的 origin 或基础 URL
- `VITE_APP_BASE_PATH`：部署路径，例如 `/` 或 `/admin`
- `VITE_DEV_PORT`：本地 Vite 端口，默认值为 `5176`

应用代码通过 `src/lib/env.ts` 读取配置。在容器中，启动时传入的值通过
`env-config.js` 覆盖 Vite 构建时的值。容器启动时必须提供
`public/env-config.js` 中声明的所有配置；任何配置缺失或为空时，容器都会在
启动 Nginx 前退出。

提交改动前，根据改动范围选择相应检查，不要求每次机械运行全部命令：

```bash
pnpm lint
pnpm test
pnpm build
pnpm format:check
pnpm knip
```

前后端启动后，可以在不保存凭据的情况下验证全栈认证和 Users 增删改查：

```bash
E2E_BASE_URL=http://localhost:5176 \
E2E_ADMIN_EMAIL=admin@example.com \
E2E_ADMIN_PASSWORD=replace-with-local-password \
pnpm test:e2e
```

## 容器

生产镜像使用 Nginx 提供应用，并暴露 `/healthz`。默认容器端口为 `3000`，
可以通过 `APP_PORT` 修改。

```bash
docker build -t full-stack-template-frontend .
docker run --rm -p 3000:3000 \
  -e VITE_API_BASE_URL=https://api.example.com \
  -e VITE_APP_BASE_PATH=/admin \
  full-stack-template-frontend
```

## API 与认证

后端 OpenAPI 是接口契约的唯一来源。运行 `make generate-client` 会更新
`openapi.json` 和 `src/client`；功能数据层直接调用生成的 Service 和类型，不手写重复的
响应 schema。Zod 继续用于表单、URL、浏览器持久化数据和其他未类型化边界。

```ts
import { UsersService, type UserCreateRequest } from '@/client'
import { generatedApiClient } from '@/lib/generated-api'

export async function createUser(request: UserCreateRequest) {
  const response = await UsersService.createUser({
    client: generatedApiClient,
    body: request,
  })
  return response.data.data
}
```

普通 API 使用 `{ code, data, message }` envelope，只有数字 `code === 0` 表示成功。
登录、刷新和退出也使用生成客户端。认证 Store 只持久化一份 access token 与 refresh token；
应用启动时注册真实的 `refreshSession`：

```ts
import { configureTokenRefresh } from '@/lib/api-client'
import { refreshSession } from '@/features/auth/data/session'

configureTokenRefresh(refreshSession)
```

HTTP `401` 和自定义业务码 `40111` 会触发 single-flight access token 刷新，并将原请求
最多重试一次。refresh token 被后端拒绝时会清理当前 session；临时网络错误会保留 session，
以便用户重试。

## 服务端数据表格

`ServerDataTable` 消费共享的 `PageData<T>` 契约。Users 页面用 TanStack Query 获取真实
服务端数据，并通过路由搜索参数保存 `page` 和 `pageSize`：

```tsx
<UsersTable
  pageData={usersQuery.data}
  search={search}
  navigate={navigate}
  isLoading={usersQuery.isLoading}
  isRefreshing={usersQuery.isFetching && !usersQuery.isLoading}
  isPlaceholderData={usersQuery.isPlaceholderData}
  error={usersQuery.error}
  onRetry={() => void usersQuery.refetch()}
  onRefresh={() => void usersQuery.refetch()}
/>
```

路由需要额外筛选条件时可以扩展 `paginationSearchSchema`。通用表格不会自行定义
搜索、筛选或排序字段，这些字段必须作为具体 API 契约的明确组成部分。

## 品牌配置

应用名称和组织占位文案位于 `src/config/app.ts`。基于本模板创建产品仓库时，需要替换这些值。

## 来源说明

本模板基于 [shadcn-admin](https://github.com/satnaing/shadcn-admin) 开发。
