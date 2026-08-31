# Full Stack FastAPI + React Template

这是一个可直接运行的前后端模板，组合了分层 FastAPI 后端和 React 管理端。它不是把两个项目放在同一个仓库里而已：后端 OpenAPI 是唯一接口契约，前端 SDK 从该契约生成，认证、分页和用户管理已经完整打通。

## 已包含

- FastAPI、Pydantic v2、SQLAlchemy 2、Alembic 和 PostgreSQL
- Router -> Service -> Repository 的清晰后端分层
- React 19、Vite、TanStack Router、TanStack Query 和 shadcn/ui
- access token 与可轮换 refresh session，包含重放保护和幂等退出
- 前端 single-flight token refresh，失败后清理本地 session
- 真实用户列表、新建、完整编辑和删除流程
- 后端 OpenAPI -> `@hey-api/openapi-ts` -> TypeScript SDK
- 前端数据边界的 Zod 运行时校验
- Docker Compose 全栈本地环境

## 快速启动

需要 Docker 和支持 `--wait` 的 Docker Compose。

```bash
cp .env.example .env
docker compose up --build
```

首次构建会启动 PostgreSQL、执行 Alembic migration、启动 API，再启动前端。

- 前端：<http://localhost:3000>
- Swagger UI：<http://localhost:8000/docs>
- ReDoc：<http://localhost:8000/redoc>
- 健康检查：<http://localhost:8000/api/v1/health>

创建第一个管理员：

```bash
docker compose exec backend python -m app.scripts.create_superuser
```

脚本通过终端隐藏输入密码。模板不包含默认登录密码，也不会把账号或 token 写入仓库。

后台启动和常用操作也可以使用：

```bash
make up
make logs
make down
```

## 目录

```text
.
├── backend/           # FastAPI、数据库、migration 和后端测试
├── frontend/          # React 管理端、生成 SDK 和浏览器测试
├── compose.yaml       # 本地全栈编排
├── Makefile           # 初始化、生成和质量检查入口
└── .env.example       # 仅供本地 Compose 使用的配置示例
```

后端和前端各自的实现细节分别见 `backend/README.md` 与 `frontend/README.md`。

## API 契约和 SDK

修改接口时按固定顺序工作：

1. 修改后端 schema、route、service 及测试。
2. 运行 `make generate-client`，重新导出 `frontend/openapi.json` 并生成 `frontend/src/client`。
3. 在前端功能数据层调用生成 SDK，并用 Zod 校验不可信响应。
4. 检查 OpenAPI 和生成代码差异，再提交后端与前端消费者。

```bash
make generate-client
git diff -- frontend/openapi.json frontend/src/client
```

不要手工修改生成目录。列表分页只使用 `page` 和 `pageSize`；响应固定为 `items`、`page`、`pageSize` 和 `total`。

## 认证边界

登录、刷新和退出请求使用生成 SDK。refresh token 是不透明随机值，后端只保存 SHA-256 hash；每次刷新都会轮换 token，旧 token 重放会撤销对应用户的 refresh sessions。修改密码也会撤销 refresh sessions。

前端只在认证 store 中保存一份 token session。HTTP `401` 或自定义过期码 `40111` 会触发一次共享刷新请求，原请求最多重试一次。刷新失败或 session 已变化时不会保留半登录状态。

## 本地开发

直接开发需要 Python 3.12、uv 0.11、Node.js 20.19+ 和 pnpm 10.34。

```bash
make setup
```

`make setup` 只安装依赖并在缺少时创建根目录 `.env`。后端单独运行、数据库配置和 migration 说明见后端 README；前端开发端口默认是 `5176`。

常用检查：

```bash
make check-generated
make check-backend
make check-frontend
```

后端完整测试使用 Testcontainers，需要可用的 Docker daemon。前端浏览器测试首次运行前需要安装对应 Chromium：

```bash
cd frontend
pnpm test:browser:install
```

## 环境变量

根目录 `.env.example` 只服务于本地 Docker Compose。复制后可以修改端口和本地数据库值，但不要提交 `.env`。

生产环境必须使用独立 secret manager 提供 `APP_SECRET_KEY`、数据库连接和数据库凭据，并在独立部署步骤执行 migration。前端运行时使用 `VITE_API_BASE_URL` 和 `VITE_APP_BASE_PATH`，无需为不同环境重新构建镜像。

## 来源

后端设计参考了 [full-stack-fastapi-template](https://github.com/fastapi/full-stack-fastapi-template)。前端源自 [shadcn-admin](https://github.com/satnaing/shadcn-admin)，其 MIT License 保留在 `frontend/LICENSE`。
