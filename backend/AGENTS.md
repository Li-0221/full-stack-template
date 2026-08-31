# 后端规则

## 技术与分层

- 使用 Python 3.12、FastAPI、Pydantic v2、SQLAlchemy 2 同步 Session、Alembic、PostgreSQL 和 uv。
- 只支持 `postgresql+psycopg`；测试数据库使用 Testcontainers，不增加 SQLite fallback。
- 调用方向为 `Router -> Service -> Repository -> PostgreSQL`。
- Router 只做 HTTP 绑定、依赖注入和响应组装；Service 拥有业务规则、授权、短 Session 和 commit/rollback；Repository 只做查询、稳定排序、约束相关写入和 `flush()`。
- 简单用例直接传明确的 typed 参数。只有多入口、不同信任边界、PATCH 三态、聚合转换或多实现确实存在时，才增加 Command、Presenter、Protocol 或 Unit of Work。
- 不把 request 裸 `dict` 传入业务层，不用字符串 key mass assignment ORM，不让 ORM、Session 或密码哈希离开业务边界。

## 契约与安全

- 普通成功响应为 `{ code: 0, data, message: "success" }`；错误使用非零稳定业务码和真实 HTTP 状态，`data` 为 `null`，请求 ID 通过 `X-Request-ID` 返回。`204` 保持空响应。
- wire 字段使用 camelCase；分页使用 `page`、`pageSize`、`items`、`total`。OAuth2 token 字段保持标准 snake_case。
- PUT 表示完整替换；可清空字段显式传 `null`。PATCH 必须区分 omitted、`null` 和普通值。
- 已知业务失败使用 `AppError`，由统一 handler 映射；未知错误不得泄漏 stack、SQL、headers、连接串或 payload。
- 身份只来自验证后的 Bearer token，权限由拥有业务事实的 Service 判断。密码使用 Argon2，token、密码和 Secret 不得进入日志或响应。
- refresh token 只保存 hash 并在刷新时轮换；修改密码或停用账号必须撤销该用户的 refresh sessions。

## 数据库与配置

- Service 是唯一事务 owner；Repository 不得 commit。外部 IO 不放在数据库事务中。
- 数据库约束保护所有 writer 都必须遵守的完整性；唯一性不能只依赖 check-then-write。
- 模型变更新增 forward migration，不修改已发布 revision。应用启动时不自动执行 migration 或 `create_all()`。
- 只有运行时代码真实读取的配置才能进入 Settings 和 `.env.example`；必填生产配置启动时 fail fast，Secret 由运行环境注入。

## 验证

```bash
uv run ruff format --check .
uv run ruff check .
uv run mypy src
uv run pytest --cov=app --cov-report=term-missing
uv run pre-commit run --all-files
uv run alembic check
```

- 先运行最窄相关测试，再按风险扩大。API contract 从真实 ASGI 边界验证；Repository、事务和 migration 使用真实 PostgreSQL。
- bug 修复增加修复前会失败的回归测试。只报告实际执行过的检查。
