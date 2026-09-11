SHELL := /bin/bash

.PHONY: setup setup-env admin migrate dev dev-backend dev-frontend generate-client check-generated check-backend check-frontend check check-full

setup:
	cd backend && uv sync --all-groups
	$(MAKE) setup-env
	cd frontend && pnpm install --frozen-lockfile

setup-env:
	cd backend && uv run python ../scripts/backend.py setup

admin:
	cd backend && uv run python ../scripts/backend.py admin

migrate:
	cd backend && uv run python ../scripts/backend.py migrate $(ARGS)

dev:
	@test -f .env || { echo "Missing .env; run 'make setup' first."; exit 1; }
	@cleanup() { \
		trap - EXIT INT TERM; \
		running_pids="$$(jobs -pr)"; \
		if [[ -n "$$running_pids" ]]; then kill $$running_pids 2>/dev/null || true; fi; \
		wait 2>/dev/null || true; \
	}; \
		trap cleanup EXIT INT TERM; \
		$(MAKE) --no-print-directory dev-backend & \
		$(MAKE) --no-print-directory dev-frontend & \
		wait -n

dev-backend:
	cd backend && uv run python ../scripts/backend.py dev

dev-frontend:
	cd frontend && pnpm dev

generate-client:
	cd backend && APP_SECRET_KEY=openapi-export-only-secret-key-123456 APP_DATABASE_URL=postgresql+psycopg://openapi:openapi@localhost:5432/openapi uv run python -m app.scripts.export_openapi ../frontend/openapi.json
	cd frontend && pnpm generate:client

check-generated:
	python3 scripts/check_client.py

check-backend:
	cd backend && uv run ruff format --check . ../scripts
	cd backend && uv run ruff check . ../scripts
	cd backend && uv run mypy src ../scripts
	cd backend && uv run pytest --cov=app --cov-report=term-missing

check-frontend:
	cd frontend && pnpm lint
	cd frontend && pnpm format:check
	cd frontend && pnpm knip
	cd frontend && pnpm test
	cd frontend && pnpm build

# 日常快速检查；完整测试、生成验证及构建使用 make check-full。
check:
	cd backend && uv run ruff check . ../scripts
	cd backend && uv run mypy src ../scripts
	cd backend && uv run pytest tests/unit
	cd frontend && pnpm lint
	cd frontend && pnpm exec tsc -b --noEmit

check-full: check-generated check-backend check-frontend check-deploy

.PHONY: deploy-dev deploy-prod compose-dev compose-prod check-deploy

deploy-dev deploy-prod:
	bash deploy/deploy.sh $(@:deploy-%=%)

compose-dev compose-prod:
	docker compose --env-file deploy/.env.$(@:compose-%=%) -f deploy/compose.$(@:compose-%=%).yaml $(ARGS)

check-deploy:
	bash -n deploy/deploy.sh
	shellcheck deploy/deploy.sh
