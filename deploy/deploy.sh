#!/usr/bin/env bash
# 在目标服务器构建和部署当前工作区，dev/prod 使用独立项目及数据卷。
set -euo pipefail
cd "$(dirname "$0")/.."
case "${1:-}" in
  dev|prod) target_env=$1 ;;
  *) echo '用法: bash deploy/deploy.sh <dev|prod>' >&2; exit 1 ;;
esac
env_file="deploy/.env.$target_env"
if [[ ! -f "$env_file" ]]; then
  echo "缺少 $env_file；请按 README 的部署配置说明创建并填写该文件。" >&2
  exit 1
fi
umask 077
exec 9>"deploy/.deploy-$target_env.lock"
flock -n 9 || { echo '该环境已有部署正在执行。' >&2; exit 1; }
compose=(docker compose --env-file "$env_file" -f "deploy/compose.$target_env.yaml")
"${compose[@]}" config --quiet
"${compose[@]}" build backend frontend
"${compose[@]}" up -d --wait --wait-timeout 120 db
if [[ "$target_env" == prod ]]; then
  backup_dir="deploy/backups/$target_env/$(date -u +%Y%m%dT%H%M%S)-$$"
  mkdir -p "$backup_dir"
  # 禁用 stdin，避免 pg_dump 消耗调用方的脚本输入；数据库变量由容器内 shell 展开。
  # shellcheck disable=SC2016
  "${compose[@]}" exec -T --interactive=false db sh -c \
    'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_dir/database.dump"
  test -s "$backup_dir/database.dump"
  "${compose[@]}" exec -T db pg_restore --list < "$backup_dir/database.dump" > /dev/null
  echo "迁移前备份: $backup_dir/database.dump"
fi
"${compose[@]}" run --rm --no-deps --interactive=false backend alembic upgrade head
"${compose[@]}" up -d --no-build --no-deps --wait --wait-timeout 180 backend frontend
"${compose[@]}" ps
echo "$target_env 容器健康检查通过；域名入口由服务器 Nginx 配置。"
