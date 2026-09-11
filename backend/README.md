# 全栈模板后端

FastAPI 后端提供认证、当前用户资料和管理员用户 CRUD。结构保持为 `Router -> Service -> Repository -> PostgreSQL`：Service 拥有业务规则和事务，Repository 只负责持久化。

## 本地启动

需要 Python 3.12、uv 0.11 和可直连的 dev PostgreSQL。应用只支持 `postgresql+psycopg`。

从仓库根目录执行：

```bash
make setup
# 编辑根目录 .env，填写 dev 服务器 APP_DATABASE_URL（sslmode=disable）
make dev-backend
```

`scripts/backend.py` 为开发服务、管理员 CLI 和 Alembic 共用根目录 `.env`，直接使用配置的数据库地址，不做容器主机名转换。开发启动时执行 migration，再运行带热更新的 Uvicorn。不要用 shell `source` 加载包含 JSON 值的环境文件。

本机后端端口使用根 `.env` 中的 `BACKEND_PORT`，默认 `8000`；服务器部署分别读取 `deploy/.env.dev` 和 `deploy/.env.prod`。本地启动、migration 和管理员 CLI 均操作共享 dev 数据库，不启动本机 PostgreSQL。

- Swagger UI：<http://127.0.0.1:8000/docs>
- ReDoc：<http://127.0.0.1:8000/redoc>
- 健康检查：<http://127.0.0.1:8000/api/v1/health>

`APP_SECRET_KEY` 至少 32 个字符。`.env` 已被 Git 忽略，不要提交。

从仓库根目录创建管理员：

```bash
make admin
```

## API 契约

普通成功响应：

```json
{ "code": 0, "data": {}, "message": "success" }
```

错误响应使用真实 `4xx`/`5xx` HTTP 状态和非零稳定业务码：

```json
{ "code": 10007, "data": null, "message": "A user with this email already exists" }
```

- 普通 wire 字段使用 camelCase。
- 分页使用 `page`、`pageSize`、`items` 和 `total`。
- `X-Request-ID` 用于请求关联。
- OAuth2 token 字段保持标准格式；`204 No Content` 不返回 JSON。
- PUT 表示完整替换；`fullName: null` 表示清空姓名，write-only 密码省略或传 `null` 表示不修改。
- 接口路径、参数和响应字段以 OpenAPI 为准。

refresh token 仅以 hash 保存并原子轮换，轮换后的旧 token 无法再次使用。登出、修改密码或停用账号会撤销相关 refresh sessions；停用或删除账号也会让旧 access token 无法继续通过用户状态检查。登录和刷新成功时会顺带清理已过期的 refresh sessions。

## Migration

模型变更应新增 revision，不修改已经执行过的 migration。从仓库根目录执行：

```bash
make migrate ARGS="heads"
make migrate ARGS='revision --autogenerate -m "describe the schema change"'
make migrate
make migrate ARGS="check"
```

生产环境将 migration 作为独立部署步骤，不由每个 API replica 启动时执行。

## 检查

从仓库根目录运行 `make check` 做日常检查；`make check-backend` 运行后端完整检查。只验证某个功能时，可在 backend 目录运行 `uv run pytest tests/api/test_users.py` 等相关测试。

数据库集成测试使用 Testcontainers，需要可用的 Docker daemon。
