# 全栈模板前端

这是全栈模板的 React 管理端。它提供统一的应用壳层、真实的认证与用户管理、主题、RTL 支持和浏览器测试，但不与具体产品领域绑定。

## 已包含页面

- Dashboard 示例
- Users 增删改查示例
- Tasks 表格示例
- 个人资料、账户、外观、通知和显示设置
- 登录、注册、忘记密码、OTP 和备用登录布局
- 401、403、404、500 和 503 系统页面

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

提交改动前，根据改动范围运行相应检查：

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

所有 API 接口都使用数字 `code`，其中 `0` 表示成功。共享请求工具会校验响应
envelope，并直接返回其中的 `data`。

```ts
import { request } from '@/lib/api-client'
import type { PageData, PageParams } from '@/types/api'

const params: PageParams = { page: 1, pageSize: 20 }
const products = await request<PageData<Product>>({
  method: 'get',
  url: '/products',
  params,
})
```

认证 Store 持久化一个 access token 和一个 refresh token。应用初始化时只注册
一次产品的真实刷新接口：

```ts
import {
  configureTokenRefresh,
  request,
} from '@/lib/api-client'
import type { AuthTokens } from '@/types/api'

configureTokenRefresh((refreshToken) =>
  request<AuthTokens>({
    method: 'post',
    url: '/replace-with-the-product-refresh-endpoint',
    data: { refreshToken },
    skipAuth: true,
    skipAuthRefresh: true,
  })
)
```

登录和刷新使用基于本仓库后端 OpenAPI 契约生成的客户端。HTTP `401` 和自定义
业务码 `40111` 会触发 access token 刷新，并将原请求重试一次。

## 服务端数据表格

`ServerDataTable` 直接消费共享的 `PageData<T>` 契约。它在 URL 中保存 `page`
和 `pageSize`，具体产品页面仍负责使用 TanStack Query 获取数据。

```tsx
<ServerDataTable
  pageData={productsQuery.data}
  columns={columns}
  search={route.useSearch()}
  navigate={route.useNavigate()}
  isLoading={productsQuery.isLoading}
  isRefreshing={productsQuery.isFetching}
  error={productsQuery.error}
  onRetry={() => productsQuery.refetch()}
  onRefresh={() => productsQuery.refetch()}
/>
```

路由需要额外筛选条件时可以扩展 `paginationSearchSchema`。通用表格不会自行定义
搜索、筛选或排序字段，这些字段必须作为各产品 API 契约的明确组成部分。

## 品牌配置

应用标识和默认占位账户数据位于 `src/config/app.ts`。基于本模板创建产品仓库时，
需要替换这些值。

## 来源说明

本模板基于 [shadcn-admin](https://github.com/satnaing/shadcn-admin) 开发。
