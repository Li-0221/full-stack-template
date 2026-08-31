# 全栈模板前端

React 管理端包含应用壳层、登录、用户 CRUD、当前用户资料与密码修改、主题偏好和公开错误页。模板不提供公开注册或未完成的密码重置流程。

## 本地启动

需要 Node.js 20.19+ 和 pnpm 10.34。

```bash
pnpm install
cp .env.example .env
pnpm dev
```

运行时配置：

- `VITE_API_BASE_URL`：后端 API 地址
- `VITE_APP_BASE_PATH`：部署路径，例如 `/` 或 `/admin`
- `VITE_DEV_PORT`：本地开发端口，默认 `5176`

应用只通过 `src/lib/env.ts` 读取配置。容器启动时会校验运行时配置并生成 `env-config.js`。

## 接口调用

后端 OpenAPI 是唯一接口契约。`make generate-client` 会更新 `openapi.json` 和 `src/client`，业务代码在功能 `data` 层调用生成的 Service 和类型。

- 受保护接口使用 `generatedApiClient`。
- 登录、刷新和退出使用 `generatedPublicApiClient`。
- 共享客户端统一处理 Bearer token、非零业务码、HTTP 错误和 single-flight refresh。
- 不需要额外的通用 `request()` 或 `fetch` wrapper。

新增或修改接口时按 [前端接口调用工作流](docs/api-workflow.md) 操作。

## 检查

```bash
pnpm lint
pnpm format:check
pnpm knip
pnpm test
pnpm build
```

`pnpm test` 使用 Vitest Browser Mode 和 Playwright Chromium。真实全栈 E2E 需要已启动的前后端和本地管理员：

```bash
E2E_BASE_URL=http://localhost:5176 \
E2E_ADMIN_EMAIL=admin@example.com \
E2E_ADMIN_PASSWORD=replace-with-local-password \
pnpm test:e2e
```

## 容器

生产镜像使用 Nginx，默认端口 `3000`，健康检查路径为 `/healthz`。

```bash
docker build -t full-stack-template-frontend .
docker run --rm -p 3000:3000 \
  -e VITE_API_BASE_URL=https://api.example.com \
  -e VITE_APP_BASE_PATH=/admin \
  full-stack-template-frontend
```

应用名称和占位文案位于 `src/config/app.ts`。
