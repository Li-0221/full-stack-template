# 全栈模板规则

## 定位与范围

- 这是面向中小型后台项目的接活模板，优先清晰和可维护，不预置 DDD、CQRS、微服务或无消费者的抽象。
- 保留 Dashboard 示例、Users 真实 CRUD、Profile、Security、Appearance、Display、登录和公开错误页。
- 不提供公开注册、未完成的密码重置、OAuth 演示按钮或其他没有后端支持的页面。

## 核心约定

- 后端 OpenAPI 是接口契约的唯一来源；使用 `make generate-client` 更新 `frontend/openapi.json` 和 `frontend/src/client`，使用 `make check-generated` 检查生成产物一致性，禁止手工修改生成文件。
- 后端调用方向保持 `Router -> Service -> Repository -> PostgreSQL`。Service 拥有业务规则和事务，Repository 只负责持久化。
- 前端业务接口直接调用生成 SDK；认证、业务错误和 token 刷新统一由共享客户端处理，不新增第二套 Axios、`fetch` wrapper 或 token 状态。
- 分页字段统一为 `page`、`pageSize`、`items` 和 `total`。
- 保留 refresh token 轮换、重放保护、停用或修改密码后的 session 撤销，以及前端 single-flight 刷新。

## 维护与验证

- 修改前阅读当前目录的 `AGENTS.md`、相关代码和测试；保留无关的已有改动。
- 新增抽象、配置、依赖或页面必须有真实消费者。删除功能时同步删除专用测试、fixture 和文档。
- 本地默认只用 Docker 运行 PostgreSQL，后端和前端作为本机进程运行；完整容器编排用于镜像或集成验证。
- 仓库内的代码、配置、文档和脚本只使用仓库相对路径，不提交开发机器的绝对路径。
- Markdown 说明使用中文，代码标识、命令和协议字段保持原样。不要提交凭据、`.env`、构建产物、覆盖率或浏览器产物。
- 按改动风险运行最小相关检查；认证、请求层、共享契约和发布边界变更需要扩大验证范围。
- 模板默认不包含 CI/CD 或 GitOps；只有用户明确要求时才新增。
