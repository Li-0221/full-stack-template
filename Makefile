.PHONY: setup dev up down logs generate-client check-generated check-backend check-frontend check

setup:
	@test -f .env || cp .env.example .env
	cd backend && uv sync --all-groups
	cd frontend && pnpm install --frozen-lockfile

dev:
	docker compose up --build

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
	cd backend && uv run ruff format --check .
	cd backend && uv run ruff check .
	cd backend && uv run mypy src
	cd backend && uv run pytest --cov=app --cov-report=term-missing

check-frontend:
	cd frontend && pnpm lint
	cd frontend && pnpm format:check
	cd frontend && pnpm knip
	cd frontend && pnpm test
	cd frontend && pnpm build

check: check-generated check-backend check-frontend
