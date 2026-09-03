# 后端规则

## 技术与分层

- 使用 Python 3.12、FastAPI、Pydantic v2、SQLAlchemy 2 同步 Session、Alembic、PostgreSQL 和 uv。
- 只支持 `postgresql+psycopg`；测试数据库使用 Testcontainers，不增加 SQLite fallback。
- 调用方向为 `Router -> Service -> Repository -> PostgreSQL`。
- Router 只做 HTTP 绑定、依赖注入和响应组装；Dependency 拥有认证和粗粒度角色权限；Service 拥有业务规则、资源级授权与不变量、短 Session 和 commit/rollback；Repository 只做查询、稳定排序、约束相关写入和 `flush()`。
- FastAPI dependency 只注入 `DatabaseSessionManager`；公开 Service 用例创建并关闭自己的短 Session，不通过 dependency `yield` 持有业务 Session。
- 简单用例由 Router 传递明确的 typed 参数，不为一比一复制增加 Command。存在 HTTP/CLI/worker 多入口、不同信任级别、PATCH 三态、入站 shape 与用例语义不同或参数组需要独立演进时，启用 Service-owned Command。
- 内部 ORM/Result 与公开 Data 涉及改名、计算、聚合重组、角色视图、API 版本差异或多处共享转换时，启用 Presenter/mapper/转换函数做显式 allowlist 映射。
- 公开 Data 只是内部结果的同名字段子集时，可由 Service 在 Session 关闭前用目标 response schema 校验收窄，并通过 API contract test 断言精确公开字段，不额外增加 Presenter。
- 无状态且只有一个实现的转换优先使用模块级函数，不为字段复制增加 `mappers/` 目录或 Mapper class。只有存在状态、资源生命周期或多个真实 adapter 时才增加 class/`Protocol`；只有跨 Repository 原子事务确实出现时才增加 Unit of Work。
- 不把 request 裸 `dict` 传入业务层，不用字符串 key mass assignment ORM，不让 ORM、Session 或密码哈希离开业务边界。

## 契约与安全

- 普通成功响应为 `{ code: 0, data, message: "success" }`；错误使用非零稳定业务码和真实 HTTP 状态，`data` 为 `null`，请求 ID 通过 `X-Request-ID` 返回。`204` 保持空响应。
- wire 字段使用 camelCase；分页使用 `page`、`pageSize`、`items`、`total`。OAuth2 token 字段保持标准 snake_case。
- 入站 schema 继承 `RequestModel` 以获得 camelCase alias 和 `extra="forbid"`；公开 response data 继承 `ResponseModel`。内部 Command/Result 不继承 HTTP schema 基类。
- PUT 表示完整替换；可清空字段显式传 `null`。PATCH 必须区分 omitted、`null` 和普通值。
- 已知业务失败使用 `AppError`，由统一 handler 映射；未知错误不得泄漏 stack、SQL、headers、连接串或 payload。
- 身份只来自验证后的 Bearer token；管理员等粗粒度入口权限由 Dependency 判断，资源关系和业务不变量由 Service 判断。密码使用 Argon2，token、密码和 Secret 不得进入日志或响应。
- 缺失、无效或过期认证返回 `401` 并保留 `WWW-Authenticate: Bearer`；身份有效但权限不足返回 `403`。
- refresh token 只保存 hash 并在刷新时轮换；修改密码或停用账号必须撤销该用户的 refresh sessions。
- 修改密码不会主动撤销已签发的 access token；它在自然过期前仍有效。认证请求会查询当前用户，因此账号停用或删除后旧 access token 不能继续使用。

## 数据库与配置

- Service 是唯一事务 owner；Repository 不得 commit。外部 IO 不放在数据库事务中。
- 数据库约束保护所有 writer 都必须遵守的完整性；唯一性不能只依赖 check-then-write。
- 捕获使事务失败的 `IntegrityError` 后必须先 rollback，再查询冲突事实或转换稳定业务异常。
- 模型变更新增 forward migration，不修改已发布 revision。应用启动时不自动执行 migration 或 `create_all()`；migration 必须在真实 PostgreSQL 验证 upgrade，声称可逆时同时验证 downgrade。
- 对外时间使用带 offset 的 RFC3339，数据库 datetime 使用 timezone-aware UTC 语义。
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

- 先运行最窄相关测试，再按风险扩大。API contract 从真实 ASGI 边界验证状态码、精确公开字段、错误码和认证 header；Repository、事务和 migration 使用真实 PostgreSQL。
- 认证、越权、停用和删除用户后的旧 token 必须有负向 contract test；测试不得放宽公开字段或泄漏敏感数据。
- bug 修复增加修复前会失败的回归测试。只报告实际执行过的检查。
