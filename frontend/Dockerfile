# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable \
    && corepack prepare pnpm@10.34.3 --activate \
    && pnpm install --frozen-lockfile --store-dir=/app/.pnpm-store --package-import-method=copy

COPY . .

RUN pnpm build

FROM nginx:stable-alpine

ENV APP_PORT=3000

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/app.conf.template
COPY docker-entrypoint.sh /usr/local/bin/app-entrypoint

RUN chmod -R a+rX /usr/share/nginx/html \
    && chmod +x /usr/local/bin/app-entrypoint \
    && rm /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${APP_PORT}/healthz" || exit 1

ENTRYPOINT ["/usr/local/bin/app-entrypoint"]
CMD ["nginx", "-g", "daemon off;"]
