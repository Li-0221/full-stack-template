# 全栈模板规则

## 产品范围

- 主导航固定为 Dashboard、Users 和 Settings；Settings 下包含 Profile、Security、Appearance、Display。
- Dashboard 作为首页保留，用演示指标和图表展示完整布局；Users 作为真实用户 CRUD、服务端表格和管理员创建账号的全栈示例。
- Profile 读取并更新当前用户姓名和邮箱，Security 修改当前用户密码；Appearance 和 Display 保存通用前端偏好。
- 模板不提供公开注册，不保留注册页面、入口、后端接口、配置开关或生成客户端类型。账号只能由管理员通过 Users 创建。
- 密码重置只有在后端邮件发送、token 生命周期和安全边界完整实现后才开放；未实现前不保留 Forgot/Reset Password 演示页面。
- 保留公开的 401、403、404、500、503 错误页，但不把错误页放入主导航。
- 不重新引入 Tasks、Sign in 2、OTP、Notifications Settings、无后端支持的 OAuth 按钮、空 Terms/Privacy 链接或其他假业务页面。

## 接口与实现

- 后端 OpenAPI schema 是接口契约的唯一所有者。
- 后端请求链路保持为 Router -> Service -> Repository -> PostgreSQL。
- 使用 `make generate-client` 生成 `frontend/openapi.json` 和 `frontend/src/client`，禁止手工修改生成的客户端文件。
- 后端拥有的接口直接使用 OpenAPI 生成的客户端类型。不得用手写运行时 schema 重复定义生成的响应模型；只有外部、未类型化、持久化或已有明确漂移证据的数据才增加运行时解析。
- 请求和响应契约的分页字段统一使用 `page` 和 `pageSize`。
- 保留 refresh session 轮换、重放保护、前端 single-flight 刷新和幂等退出。

## 本地开发

- 本地开发只用 Docker 启动 PostgreSQL；后端和前端分别作为本机进程启动，默认不使用 Docker Compose 启动整个应用。
- 后端本地进程连接 Docker 中的 PostgreSQL，前端本地进程连接本地后端；只有验证容器镜像或完整编排时才启动前后端容器。

## 仓库维护

- 代码、配置、文档和脚本统一使用仓库相对路径，禁止提交机器相关的绝对路径。
- 所有 Markdown 文档的说明性内容使用中文；代码标识、命令、路径、协议字段和技术名称保持原样。
- 模板不包含 CI 配置，除非用户明确要求，否则不要新增 CI/CD 或 GitOps 文件。
- 不保留 `frontend/LICENSE`；如需增加许可证，必须先由用户明确选择许可证类型。
- 提交应便于审查，并按业务关注点拆分。不得提交 `.env`、凭据、构建产物、覆盖率、浏览器产物或本地数据库文件。
- 完成任务时运行覆盖本次改动行为的最小检查。只有共享基础设施、跨模块契约、高风险行为或发布边界发生变化时，才运行全量测试。
- 删除功能、页面或依赖时同步删除只服务于它们的测试、fixture 和测试工具；保留能保护真实接口、安全边界和用户行为的测试，不保留低价值 smoke test。
