# 新增业务功能：沿着 Users 实现

Users 是已打通的真实 CRUD 参考。按需要复制对应部分，不必为每个功能补齐所有操作，也不用新增通用 CRUD 框架。

## 后端

| 要做的事 | 参考文件 |
| --- | --- |
| 定义数据库模型，并让迁移发现它 | `backend/src/app/models/user.py`、`backend/src/app/models/__init__.py`、`backend/alembic/env.py` |
| 定义公开请求与响应 | `backend/src/app/schemas/user.py` |
| 实现查询和持久化 | `backend/src/app/repositories/user.py` |
| 实现业务规则和事务 | `backend/src/app/services/user.py` |
| 绑定 HTTP 与权限，并注册路由 | `backend/src/app/api/routes/users.py`、`backend/src/app/api/router.py` |
| 验证接口、权限和持久化 | `backend/tests/api/test_users.py`、`backend/tests/integration/test_user_repository.py` |

新增模型后，从仓库根目录生成并审查迁移，再应用到当前项目的 dev 数据库：

```bash
make migrate ARGS='revision --autogenerate -m "add first feature"'
make migrate
make migrate ARGS="check"
```

模型必须被 Alembic 的 metadata 导入链加载。Repository 不 commit；Service 管理短 Session 和事务。简单用例使用明确参数，不为字段搬运增加 Command 或 Mapper。管理员入口参考 Users 的权限 dependency；普通登录用户的功能不要照搬管理员限制，资源归属仍由 Service 校验。

## 前端接入

后端契约完成后运行 `make generate-client`。前端调用方式以现有 [接口调用工作流](../frontend/docs/api-workflow.md) 为准，这里只提供代码入口：

| 要做的事 | 参考文件 |
| --- | --- |
| SDK 调用和 Query Options | `frontend/src/features/users/data/users-api.ts` |
| 页面、列表与弹窗 | `frontend/src/features/users/index.tsx`、`frontend/src/features/users/components/` |
| 文件路由与 URL 分页 | `frontend/src/routes/_authenticated/users/` |
| 菜单与页面访问规则 | `frontend/src/components/layout/data/sidebar-data.ts`、`frontend/src/lib/router-access.ts` |

## 验证

开发时运行受影响功能的测试和 `make check`。接口变更检查生成产物；认证、共享请求层或部署边界变更扩大验证，完整检查用 `make check-full`。数据库测试使用 Testcontainers 的独立数据库，不使用共享 dev 数据库。
