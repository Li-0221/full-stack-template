SHELL := /bin/bash

.PHONY: setup dev dev-backend dev-frontend up down logs generate-client check-generated check-backend check-frontend check

setup:
	@test -f .env || cp .env.example .env
	cd backend && uv sync --all-groups
	cd frontend && pnpm install --frozen-lockfile

dev:
	@test -f .env || { echo "Missing .env; run 'make setup' first."; exit 1; }
	docker compose up -d --wait db
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
	cd backend && uv run python ../scripts/backend_dev.py

dev-frontend:
	cd frontend && pnpm dev

up:
	docker compose up -d --build --wait

down:
	docker compose down

logs:
	docker compose logs -f backend frontend

generate-client:
	cd backend && APP_SECRET_KEY=openapi-export-only-secret-key-123456 APP_DATABASE_URL=postgresql+psycopg://openapi:openapi@localhost:5432/openapi uv run python -m app.scripts.export_openapi ../frontend/openapi.json
	cd frontend && pnpm generate:client

check-generated: generate-client
	git diff --exit-code -- frontend/openapi.json frontend/src/client

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

check: check-generated check-backend check-frontend
