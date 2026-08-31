# Full Stack Template Rules

- The backend OpenAPI schema is the only API contract owner.
- Keep backend request flow as Router -> Service -> Repository -> PostgreSQL.
- Generate `frontend/openapi.json` and `frontend/src/client` with `make generate-client`; never edit generated client files manually.
- Use the generated OpenAPI client types directly for backend-owned endpoints. Do not duplicate generated response models with handwritten runtime schemas; add runtime parsing only for external, untyped, persisted, or demonstrably drift-prone data.
- Pagination is exclusively `page` and `pageSize` in both request and response contracts.
- Preserve rotating refresh sessions, replay protection, single-flight frontend refresh, and idempotent logout.
- Use repository-relative paths in code, configuration, documentation, and scripts. Never commit machine-specific absolute paths.
- Keep commits reviewable and split by business concern. Do not commit `.env`, credentials, build output, coverage, browser artifacts, or local database files.
- Finish tasks with checks scoped to the changed behavior. Run full test suites only when shared infrastructure, cross-cutting contracts, high-risk behavior, or the release boundary makes them necessary.
