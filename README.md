# FastAPI + React 全栈模板

用于快速验证想法的全栈模板。后端 OpenAPI 是唯一接口契约，前端 SDK 由契约生成；认证、用户管理、分页和错误处理已完整打通。

## 已包含

- FastAPI、Pydantic v2、SQLAlchemy 2、Alembic、PostgreSQL
- React 19、Vite、TanStack Router、TanStack Query、shadcn/ui
- `Router -> Service -> Repository` 后端分层
- access token、refresh token 原子轮换、旧 refresh token 失效和前端 single-flight refresh
- 管理员用户 CRUD、当前用户资料与密码修改；不提供公开注册
- OpenAPI 生成 TypeScript SDK
- dev/prod 独立 Docker Compose 和 Make 部署，本地直连 dev 数据库

## 本地开发

本机需要 Python 3.12、uv 0.11、Node.js 20.19+、pnpm 10.34。先按 [部署说明](deploy/README.md) 准备 dev 数据库，再运行：

```bash
make setup
# 编辑根 .env：APP_DATABASE_URL 填写 dev 服务器数据库地址及凭据
make dev
```

根 `.env.example` 默认连接 `dev.example.com:54322/app_dev`，使用 `sslmode=disable`，不需要证书、TLS 或 SSH 隧道。用户名、密码、数据库名与服务器 `deploy/.env.dev` 对应；服务器网络需允许本机连接 TCP 54322。若该域名使用 HTTP CDN 代理，数据库连接地址改用服务器 IP 或独立直连域名。

`make setup` 只在根 `.env` 不存在时复制示例，保留已有配置。旧项目需要手动将 `APP_DATABASE_URL` 从 `db` 或 localhost 改成 dev 服务器地址。`APP_SECRET_KEY` 固定读取根 `.env`，不会自动生成或替换。Backend 脚本解析根 `.env`，Vite 通过 `envDir` 读取同一文件，不要用 shell `source` 加载包含 JSON 的配置。

`make dev` 在本机启动后端热重载和 Vite，不启动本地数据库。后端启动前自动执行 migration，`make migrate`、`make admin` 也操作同一个共享 dev 数据库。按 `Ctrl+C` 停止本机进程，不停止远端服务。

- 前端：<http://localhost:5176>
- Swagger UI：<http://localhost:8000/docs>
- `make dev-backend` / `make dev-frontend`：单独启动
- `make admin`：交互创建管理员，无默认账号
- `make migrate`：升级数据库；`make migrate ARGS="check"`：检查迁移一致性


## 创建新项目

- 按 [部署说明](deploy/README.md) 设置唯一 `PROJECT_NAME`，分配域名与端口，配置该项目的数据库和环境密钥。
- 根 `.env` 指向该项目的 dev 数据库；本地同时运行多个项目时调整 `BACKEND_PORT` 和 `VITE_DEV_PORT`，并同步 `APP_CORS_ORIGINS`。
- 按需修改 `backend/pyproject.toml`、`frontend/package.json` 的包名，以及 `frontend/src/config/app.ts`、`frontend/index.html` 的应用文案；后端 API 名称可通过 `APP_NAME` 配置。
- 首次 `make dev` 完成迁移后，在另一个终端运行 `make admin` 创建管理员。

新增业务功能可沿着 [Users 参考路径](docs/add-feature.md) 实现。

## 修改接口

1. 修改后端 schema、route、service 和测试。
2. 运行 `make generate-client`。
3. 在前端功能 `data` 层调用生成 SDK。
4. 检查 OpenAPI、生成代码和消费者差异。

`make check-generated` 比较重新生成前后的文件内容，允许正确的生成结果尚未提交；发现差异时保留新生成结果并返回失败，供检查后保存。

详细步骤与示例见 [前端接口调用工作流](frontend/docs/api-workflow.md)。不要手工修改 `frontend/openapi.json` 或 `frontend/src/client`。

## 检查

```bash
make check       # 日常 lint、类型检查和后端单元测试
make check-full  # 完整测试、生成检查、构建和部署脚本检查
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

认证过期 E2E 需在独立测试环境将后端 `APP_ACCESS_TOKEN_EXPIRE_MINUTES` 设为 `1`，重启后端，再为测试设置 `E2E_VERIFY_REFRESH=1`。它会等待真实 token 过期，检查 refresh token 轮换和原请求重试；默认不运行这项约一分钟的测试。

## 部署

服务器配置、首次部署、更新和回退见 [部署说明](deploy/README.md)。

## 来源

后端参考 [full-stack-fastapi-template](https://github.com/fastapi/full-stack-fastapi-template)，前端基于 [shadcn-admin](https://github.com/satnaing/shadcn-admin)。
