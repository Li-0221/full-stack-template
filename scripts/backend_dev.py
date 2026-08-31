from __future__ import annotations

import os
import subprocess
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy.engine import make_url

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"


def build_environment() -> dict[str, str]:
    file_values = {
        key: value for key, value in dotenv_values(ROOT_DIR / ".env").items() if value is not None
    }
    environment = {**file_values, **os.environ}

    compose_url = environment.get("APP_DATABASE_URL")
    if compose_url is None:
        raise RuntimeError("APP_DATABASE_URL is required in .env")
    environment["APP_DATABASE_URL"] = (
        make_url(compose_url)
        .set(
            host="127.0.0.1",
            port=int(environment.get("POSTGRES_PORT", "5432")),
        )
        .render_as_string(hide_password=False)
    )
    return environment


def main() -> int:
    environment = build_environment()
    subprocess.run(
        ["uv", "run", "alembic", "upgrade", "head"],
        cwd=BACKEND_DIR,
        env=environment,
        check=True,
    )
    return subprocess.call(
        ["uv", "run", "uvicorn", "app.main:app", "--reload"],
        cwd=BACKEND_DIR,
        env=environment,
    )


if __name__ == "__main__":
    raise SystemExit(main())
