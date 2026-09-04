# 全栈模板后端

FastAPI 后端提供认证、当前用户资料和管理员用户 CRUD。结构保持为 `Router -> Service -> Repository -> PostgreSQL`：Service 拥有业务规则和事务，Repository 只负责持久化。

## 本地启动

需要 Python 3.12、uv 0.11、Docker 和 PostgreSQL。应用只支持 `postgresql+psycopg`。

从仓库根目录执行：

```bash
make setup
# 编辑根目录 .env，填写当前环境配置
docker compose up -d --wait db
make dev-backend
```

`scripts/backend_dev.py` 会自行解析根目录 `.env`、把容器数据库地址转换为宿主机地址、执行 migration，并启动带热更新的 Uvicorn。Makefile 不负责注入配置；不要用 shell `source` 加载包含 JSON 值的环境文件。

本机后端端口与 Compose 暴露端口统一使用根 `.env` 中的 `BACKEND_PORT`，默认是 `8000`。

- Swagger UI：<http://127.0.0.1:8000/docs>
- ReDoc：<http://127.0.0.1:8000/redoc>
- 健康检查：<http://127.0.0.1:8000/api/v1/health>

`APP_SECRET_KEY` 至少 32 个字符。`.env` 已被 Git 忽略，不要提交。

创建管理员：

```bash
uv run python -m app.scripts.create_superuser
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

模型变更应新增 revision，不修改已经执行过的 migration：

```bash
uv run alembic heads
uv run alembic revision --autogenerate -m "describe the schema change"
uv run alembic upgrade head
uv run alembic check
```

生产环境将 migration 作为独立部署步骤，不由每个 API replica 启动时执行。

## 检查

```bash
uv run ruff format --check .
uv run ruff check .
uv run mypy src
uv run pytest --cov=app --cov-report=term-missing
uv run pre-commit run --all-files
```

数据库集成测试使用 Testcontainers，需要可用的 Docker daemon。
