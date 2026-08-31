# FastAPI + React 全栈模板

面向中小型后台项目的可运行模板。后端 OpenAPI 是唯一接口契约，前端 SDK 由契约生成；认证、用户管理、分页和错误处理已完整打通。

## 已包含

- FastAPI、Pydantic v2、SQLAlchemy 2、Alembic、PostgreSQL
- React 19、Vite、TanStack Router、TanStack Query、shadcn/ui
- `Router -> Service -> Repository` 后端分层
- access token、refresh token 原子轮换、旧 refresh token 失效和前端 single-flight refresh
- 管理员用户 CRUD、当前用户资料与密码修改；不提供公开注册
- OpenAPI 生成 TypeScript SDK
- Docker Compose 本地全栈环境

## 快速启动

需要 Docker 和支持 `--wait` 的 Docker Compose。

```bash
cp .env.example .env
docker compose up --build
```

- 前端：<http://localhost:3000>
- Swagger UI：<http://localhost:8000/docs>
- 健康检查：<http://localhost:8000/api/v1/health>

创建第一个管理员：

```bash
docker compose exec backend python -m app.scripts.create_superuser
```

模板不包含默认账号或密码。凭据和 token 不应写入仓库。

## 本地开发

本机开发需要 Python 3.12、uv 0.11、Node.js 20.19+、pnpm 10.34 和 Docker。

```bash
make setup
docker compose up -d db
```

后端与前端分别启动的命令见 [后端说明](backend/README.md) 和 [前端说明](frontend/README.md)。完整容器编排可使用：

```bash
make up
make logs
make down
```

## 修改接口

1. 修改后端 schema、route、service 和测试。
2. 运行 `make generate-client`。
3. 在前端功能 `data` 层调用生成 SDK。
4. 检查 OpenAPI、生成代码和消费者差异。

详细步骤与示例见 [前端接口调用工作流](frontend/docs/api-workflow.md)。不要手工修改 `frontend/openapi.json` 或 `frontend/src/client`。

## 检查

```bash
make check-generated
make check-backend
make check-frontend
```

真实登录与 Users CRUD E2E 需要先启动全栈并创建本地管理员：

```bash
cd frontend
E2E_BASE_URL=http://localhost:5176 \
E2E_ADMIN_EMAIL=admin@example.com \
E2E_ADMIN_PASSWORD=replace-with-local-password \
pnpm test:e2e
```

E2E 凭据只通过当前 shell 传入。

## 部署配置

根目录 `.env.example` 只用于本地 Compose。生产环境应通过 secret manager 提供 `APP_SECRET_KEY`、数据库连接和数据库凭据，并在独立步骤执行 migration。

前端运行时读取 `VITE_API_BASE_URL` 和 `VITE_APP_BASE_PATH`，同一镜像可以用于不同环境。

## 来源

后端参考 [full-stack-fastapi-template](https://github.com/fastapi/full-stack-fastapi-template)，前端基于 [shadcn-admin](https://github.com/satnaing/shadcn-admin)。
