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

本机需要 Python 3.12、uv 0.11、Node.js 20.19+、pnpm 10.34。先按下方说明在服务器部署 dev 环境，再运行：

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

## dev / prod 部署

采用服务器端构建：把仓库放到目标 Linux 服务器，在仓库根目录执行 Make。需要 Docker、支持 `--wait` 的 Compose、Make、Bash 和 `flock`（util-linux），以及宿主机 Nginx。发布不依赖本机镜像传输、镜像仓库或预置 SSH 主机名。

| 环境 | 前端和 API | 宿主机前端 / 后端端口 | 数据库 |
| --- | --- | --- | --- |
| dev | `http://dev.example.com` / `/api/v1` | `127.0.0.1:13000` / `127.0.0.1:18000` | `0.0.0.0:54322`，供本地直连 |
| prod | `http://example.com` / `/api/v1` | `127.0.0.1:3000` / `127.0.0.1:8000` | 仅容器网络，不发布端口 |

两个环境使用独立 Compose 项目、网络、镜像和数据库数据卷。按 HTTP 配置，不包含证书或加密链路。若已有 HTTPS 入口，将对应 `SITE_URL` 改为 `https://...` 并沿用现有入口即可。`SITE_URL` 是不带尾斜杠或 `/api` 的站点 origin。

首次部署，创建 `deploy/.env.dev` 和 `deploy/.env.prod`，分别填写以下变量（deploy 不维护 example 文件）：

| 变量 | dev | prod |
| --- | --- | --- |
| `APP_SECRET_KEY` | 当前环境密钥，至少 32 字符 | 当前环境密钥，至少 32 字符 |
| `POSTGRES_DB` | `app_dev` | `app_prod` |
| `POSTGRES_USER` | 当前数据库用户名 | 当前数据库用户名 |
| `POSTGRES_PASSWORD` | 当前数据库密码 | 当前数据库密码 |
| `SITE_URL` | `http://dev.example.com` | `http://example.com` |
| `FRONTEND_PORT` | `13000` | `3000` |
| `BACKEND_PORT` | `18000` | `8000` |
| `POSTGRES_PORT` | `54322` | 不配置 |

数据库密码使用 URL 安全字符（字母、数字、下划线、短横线），因为 Compose 会将其拼入连接串。本地根 `.env` 的数据库连接须与 dev 配置对应。

在服务器仓库根目录执行：

```bash
# 创建并填写 deploy/.env.dev 和 deploy/.env.prod，然后部署
make deploy-dev
make deploy-prod
```

根 `.env` 只服务本地开发，部署命令明确读取 `deploy/.env.dev` 或 `deploy/.env.prod`；真实环境文件与备份均已忽略，不提交。

配置 DNS，让 `example.com` 和 `dev.example.com` 指向服务器，再安装域名入口（服务器已有站点配置时合并这两个 server 块）：

```bash
sudo cp deploy/nginx.conf /etc/nginx/conf.d/full-stack-template.conf
sudo nginx -t
sudo systemctl reload nginx
curl --fail http://dev.example.com/api/v1/health
curl --fail http://example.com/api/v1/health
```

前端始终请求同域 `/api/`：本地由 Vite 转发到 `BACKEND_PORT`，服务器由 Nginx 原样转发给对应后端，其余请求交给前端。无需配置前端 API URL；`SITE_URL` 只用于后端允许的来源。修改域名或端口时同步修改 `deploy/nginx.conf`。Docker 健康检查通过不代表 DNS 和域名入口已生效。

后续更新服务器代码后再次运行 `make deploy-dev` 或 `make deploy-prod`。dev 执行构建、启动数据库、独立运行 Alembic、更新应用并等待健康检查；prod 额外在迁移前备份数据库到 `deploy/backups/prod/<时间>/database.dump` 并校验备份可读。失败时停止后续步骤，备份不自动清理或恢复。迁移须与仍运行的旧应用兼容。


部署当前服务器工作区内容，包含未提交的代码；建议使用已确认的 Git 提交。需要回退时检出此前版本并重新构建部署；若 schema 不兼容，先停写、制定数据库恢复方案，不能只回退应用。

维护命令：

```bash
make compose-dev ARGS="ps"
make compose-prod ARGS="logs -f backend frontend"
make compose-dev ARGS="exec backend python -m app.scripts.create_superuser"
make compose-prod ARGS="exec backend python -m app.scripts.create_superuser"
make check-deploy
```

`check-deploy` 需要 ShellCheck，仅做 shell 静态检查，不需要环境凭据。部署命令在构建前自动校验对应 Compose 配置。业务集成测试仍使用 Testcontainers 独立数据库。

## 来源

后端参考 [full-stack-fastapi-template](https://github.com/fastapi/full-stack-fastapi-template)，前端基于 [shadcn-admin](https://github.com/satnaing/shadcn-admin)。
