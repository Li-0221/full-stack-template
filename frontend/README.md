# Full Stack Template Frontend

React administration frontend for the full-stack template. It provides a consistent application shell, real authentication and user management, theming, RTL support, and browser-based tests without binding the project to a product domain.

## Included Pages

- Dashboard example
- Users CRUD example
- Tasks table example
- Profile, account, appearance, notification, and display settings
- Sign in, sign up, forgot password, OTP, and alternate sign-in layouts
- 401, 403, 404, 500, and 503 system pages

## Stack

- React 19 and TypeScript
- Vite and TanStack Router
- TanStack Query and TanStack Table
- Tailwind CSS and shadcn/ui
- React Hook Form and Zod
- Zustand
- Vitest Browser Mode with Playwright

## Development

Requirements:

- Node.js 20.19 or newer
- pnpm 10.34

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Runtime configuration:

- `VITE_API_BASE_URL`: backend API origin or base URL
- `VITE_APP_BASE_PATH`: deployment path, such as `/` or `/admin`
- `VITE_DEV_PORT`: local Vite port; defaults to `5176`

Application code reads configuration through `src/lib/env.ts`. In a container,
startup values override the Vite build-time values through `env-config.js`.
Every key declared in `public/env-config.js` is required at container startup;
the container exits before starting Nginx if any declared value is missing or
empty.

Before submitting changes:

```bash
pnpm lint
pnpm test
pnpm build
pnpm format:check
pnpm knip
```

## Container

The production image serves the application with Nginx and exposes `/healthz`.
The default container port is `3000` and can be changed with `APP_PORT`.

```bash
docker build -t full-stack-template-frontend .
docker run --rm -p 3000:3000 \
  -e VITE_API_BASE_URL=https://api.example.com \
  -e VITE_APP_BASE_PATH=/admin \
  full-stack-template-frontend
```

The checked-in `.gitlab-ci.yml` is intentionally fully commented. Enable and
configure CI/CD only in a product repository created from this starter.

## API And Authentication

All API endpoints use a numeric `code`; `0` means success. The shared request
helper validates the response envelope and returns its `data` value directly.

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

The auth store persists one access token and one refresh token. Register the
product's real refresh endpoint once during application initialization:

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

Login and refresh use the generated client from this repository's backend
OpenAPI contract. HTTP `401` and custom code `40111` refresh the access token
and retry once.

## Server Data Tables

`ServerDataTable` consumes the shared `PageData<T>` contract directly. It keeps
`page` and `pageSize` in the URL while the product page remains responsible for
fetching data with TanStack Query.

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

Routes can extend `paginationSearchSchema` when they need additional filters.
The generic table deliberately does not invent search, filter, or sort fields;
those remain explicit parts of each product API contract.

## Branding

Application identity and default placeholder account data live in `src/config/app.ts`. Replace those values when creating a product repository from this starter.

## Source Attribution

This starter is derived from [shadcn-admin](https://github.com/satnaing/shadcn-admin) and retains its MIT license in `LICENSE`.
