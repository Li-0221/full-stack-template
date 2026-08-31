#!/bin/sh
set -eu

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

CONFIG_FILE=${CONFIG_FILE:-/usr/share/nginx/html/env-config.js}

if [ ! -f "$CONFIG_FILE" ]; then
  fail "$CONFIG_FILE does not exist; required runtime variables cannot be determined."
fi

required_vars=$(grep -oE 'VITE_[A-Z0-9_]+' "$CONFIG_FILE" | sort -u || true)
if [ -z "$required_vars" ]; then
  fail "$CONFIG_FILE does not declare any required VITE_* runtime variables."
fi

missing_vars=""
for key in $required_vars; do
  value=$(printenv "$key" 2>/dev/null || true)
  non_whitespace_value=$(printf '%s' "$value" | tr -d '[:space:]')
  if [ -z "$non_whitespace_value" ]; then
    missing_vars="$missing_vars $key"
  fi
done

if [ -n "$missing_vars" ]; then
  fail "Missing required runtime environment variables:$missing_vars"
fi

case "${APP_PORT:-}" in
  ''|*[!0-9]*) fail 'APP_PORT must be a number between 1 and 65535.' ;;
esac

if [ "$APP_PORT" -lt 1 ] || [ "$APP_PORT" -gt 65535 ]; then
  fail 'APP_PORT must be a number between 1 and 65535.'
fi

raw_base_path=${VITE_APP_BASE_PATH:-}
case "$raw_base_path" in
  *[!A-Za-z0-9._~/-]*) fail 'VITE_APP_BASE_PATH must contain only URL path characters.' ;;
  ../*|*/../*|*/..|..) fail 'VITE_APP_BASE_PATH cannot contain parent path segments.' ;;
esac

base_path=$(printf '%s' "$raw_base_path" | sed 's#^/*##; s#/*$##')
if [ -n "$base_path" ]; then
  router_base_path="/$base_path"
  NGINX_APP_BASE_PATH="/$base_path/"
  NGINX_APP_BASE_PATH_NO_SLASH="/$base_path"
else
  router_base_path="/"
  NGINX_APP_BASE_PATH="/"
  NGINX_APP_BASE_PATH_NO_SLASH="/__disabled_app_base_redirect__"
fi

VITE_APP_BASE_PATH=$router_base_path
export NGINX_APP_BASE_PATH NGINX_APP_BASE_PATH_NO_SLASH VITE_APP_BASE_PATH

envsubst '${APP_PORT} ${NGINX_APP_BASE_PATH} ${NGINX_APP_BASE_PATH_NO_SLASH}' \
  < /etc/nginx/templates/app.conf.template \
  > /etc/nginx/conf.d/default.conf

escape_javascript_string() {
  case "$1" in
    *'
'*) fail 'Runtime configuration values must be single-line strings.' ;;
  esac

  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

{
  printf '%s\n' '// Generated at container startup. Do not cache this file.'
  printf '%s\n' 'window.__ENV__ = {}'
  for key in $required_vars; do
    value=$(printenv "$key")
    escaped_value=$(escape_javascript_string "$value")
    printf 'window.__ENV__["%s"] = "%s";\n' "$key" "$escaped_value"
  done
} > "$CONFIG_FILE"

sed -i "s#<base href=\"[^\"]*\" />#<base href=\"$NGINX_APP_BASE_PATH\" />#" \
  /usr/share/nginx/html/index.html

exec "$@"
