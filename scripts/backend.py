from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy.engine import make_url

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
ROOT_ENV_FILE = ROOT_DIR / ".env"
MISSING_ENV_ERROR = ".env is required; run 'make setup' first"
MISSING_DATABASE_ERROR = "APP_DATABASE_URL is required in .env"
USAGE = "Usage: backend.py [setup|dev|admin|migrate [alembic args]]"


def setup_environment() -> None:
    if not ROOT_ENV_FILE.is_file():
        shutil.copyfile(ROOT_DIR / ".env.example", ROOT_ENV_FILE)
        ROOT_ENV_FILE.chmod(0o600)


def build_environment() -> dict[str, str]:
    if not ROOT_ENV_FILE.is_file():
        raise RuntimeError(MISSING_ENV_ERROR)

    file_values = {
        key: value for key, value in dotenv_values(ROOT_ENV_FILE).items() if value is not None
    }
    environment = {**file_values, **os.environ}

    compose_url = environment.get("APP_DATABASE_URL")
    if not compose_url:
        raise RuntimeError(MISSING_DATABASE_ERROR)
    database_url = make_url(compose_url)
    if database_url.host == "db":
        database_url = database_url.set(
            host="127.0.0.1",
            port=int(environment.get("POSTGRES_PORT", "5432")),
        )
    environment["APP_DATABASE_URL"] = database_url.render_as_string(hide_password=False)
    return environment


def main() -> int:
    action = sys.argv[1] if len(sys.argv) > 1 else "dev"
    if action == "setup":
        setup_environment()
        return 0
    environment = build_environment()
    if action == "admin":
        return subprocess.call(
            ["uv", "run", "python", "-m", "app.scripts.create_superuser"],
            cwd=BACKEND_DIR,
            env=environment,
        )
    if action == "migrate":
        return subprocess.call(
            ["uv", "run", "alembic", *(sys.argv[2:] or ["upgrade", "head"])],
            cwd=BACKEND_DIR,
            env=environment,
        )
    if action != "dev":
        raise SystemExit(USAGE)
    dev_port = environment.get("BACKEND_PORT", "8000")
    subprocess.run(
        ["uv", "run", "alembic", "upgrade", "head"],
        cwd=BACKEND_DIR,
        env=environment,
        check=True,
    )
    return subprocess.call(
        [
            "uv",
            "run",
            "uvicorn",
            "app.main:app",
            "--reload",
            "--port",
            dev_port,
        ],
        cwd=BACKEND_DIR,
        env=environment,
    )


if __name__ == "__main__":
    raise SystemExit(main())
