# dev / prod 部署

所有命令从仓库根目录执行。


采用服务器端构建：把仓库放到目标 Linux 服务器，在仓库根目录执行 Make。需要 Docker、支持 `--wait` 的 Compose、Make、Bash 和 `flock`（util-linux），以及宿主机 Nginx。发布不依赖本机镜像传输、镜像仓库或预置 SSH 主机名。

| 环境 | 前端和 API | 宿主机前端 / 后端端口 | 数据库 |
| --- | --- | --- | --- |
| dev | `http://dev.example.com` / `/api/v1` | `127.0.0.1:13000` / `127.0.0.1:18000` | `0.0.0.0:54322`，供本地直连 |
| prod | `http://example.com` / `/api/v1` | `127.0.0.1:3000` / `127.0.0.1:8000` | 仅容器网络，不发布端口 |

两个环境使用独立 Compose 项目、网络、镜像和数据库数据卷。按 HTTP 配置，不包含证书或加密链路。若已有 HTTPS 入口，将对应 `SITE_URL` 改为 `https://...` 并沿用现有入口即可。`SITE_URL` 是不带尾斜杠或 `/api` 的站点 origin。

首次部署，复制示例后填写配置：

```bash
cp deploy/.env.dev.example deploy/.env.dev
cp deploy/.env.prod.example deploy/.env.prod
```

`PROJECT_NAME` 是同一服务器上唯一的项目标识，只使用小写字母、数字、短横线或下划线，并以字母或数字开头。dev/prod 使用同一个标识，Compose 自动追加环境后缀，隔离容器、网络、镜像和数据卷。复制模板创建新项目时必须换一个标识。

已有部署升级时，设置 `PROJECT_NAME=full-stack-template` 可保持原 Compose 项目名并继续使用原数据卷。改名会连接新项目的数据卷，不会自动迁移旧数据。

同机多个项目还需要分配不同的宿主机端口、域名及 Nginx 配置文件名；项目名称不会隔离宿主机端口。按下表填写配置：

| 变量 | dev | prod |
| --- | --- | --- |
| `PROJECT_NAME` | 项目标识，例如 `idea-one` | 与 dev 相同 |
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
# 填写配置后，按需要部署对应环境
make deploy-dev
make deploy-prod
```

根 `.env` 只服务本地开发，部署命令明确读取 `deploy/.env.dev` 或 `deploy/.env.prod`；真实环境文件与备份均已忽略，不提交。

配置 DNS，让 `example.com` 和 `dev.example.com` 指向服务器，再安装域名入口（服务器已有站点配置时合并这两个 server 块）：

```bash
# 将 idea-one 替换为项目标识，避免覆盖其他项目入口
sudo cp deploy/nginx.conf /etc/nginx/conf.d/idea-one.conf
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

