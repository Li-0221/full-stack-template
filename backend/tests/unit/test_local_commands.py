import importlib.util
import sys
from pathlib import Path
from types import ModuleType

import pytest
from dotenv import dotenv_values


@pytest.fixture
def local_commands(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> ModuleType:
    monkeypatch.setattr(sys, "dont_write_bytecode", True)
    script = Path(__file__).resolve().parents[3] / "scripts" / "backend.py"
    spec = importlib.util.spec_from_file_location("local_commands", script)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr(module, "ROOT_DIR", tmp_path)
    monkeypatch.setattr(module, "ROOT_ENV_FILE", tmp_path / ".env")
    monkeypatch.delenv("APP_DATABASE_URL", raising=False)
    monkeypatch.delenv("POSTGRES_PORT", raising=False)
    (tmp_path / ".env.example").write_text(
        "APP_SECRET_KEY=fixed-local-test-secret-key-123456\n"
        "APP_DATABASE_URL=postgresql+psycopg://app:app@dev.example.com:54322/app?sslmode=disable\n"
        'POSTGRES_PORT=5544\nAPP_CORS_ORIGINS=["http://localhost:5176"]\n'
    )
    return module


def test_setup_copies_fixed_configuration_without_regenerating_it(
    local_commands: ModuleType,
) -> None:
    local_commands.setup_environment()
    first = dotenv_values(local_commands.ROOT_ENV_FILE)
    assert first["APP_SECRET_KEY"] == "fixed-local-test-secret-key-123456"
    local_commands.setup_environment()
    assert dotenv_values(local_commands.ROOT_ENV_FILE) == first
    environment = local_commands.build_environment()
    assert (
        environment["APP_DATABASE_URL"]
        == "postgresql+psycopg://app:app@dev.example.com:54322/app?sslmode=disable"
    )
    assert environment["APP_CORS_ORIGINS"] == '["http://localhost:5176"]'


def test_setup_preserves_existing_environment_file(local_commands: ModuleType) -> None:
    original = "APP_SECRET_KEY=existing-local-test-secret-key-123456\nPOSTGRES_PORT=5545\n"
    local_commands.ROOT_ENV_FILE.write_text(original)
    local_commands.setup_environment()
    assert local_commands.ROOT_ENV_FILE.read_text() == original


@pytest.mark.parametrize("action", ["admin", "migrate"])
def test_management_commands_use_the_local_environment(
    local_commands: ModuleType,
    monkeypatch: pytest.MonkeyPatch,
    action: str,
) -> None:
    local_commands.setup_environment()
    monkeypatch.setattr("sys.argv", ["backend.py", action])
    calls = []

    def run(command: list[str], *, cwd: Path, env: dict[str, str]) -> int:
        calls.append(command)
        assert env["APP_DATABASE_URL"].endswith("@dev.example.com:54322/app?sslmode=disable")
        assert env["APP_SECRET_KEY"]
        return 0

    monkeypatch.setattr(local_commands.subprocess, "call", run)
    assert local_commands.main() == 0
    assert calls == [
        ["uv", "run", "python", "-m", "app.scripts.create_superuser"]
        if action == "admin"
        else ["uv", "run", "alembic", "upgrade", "head"]
    ]


def test_explicit_database_environment_is_not_rewritten(
    local_commands: ModuleType,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    local_commands.setup_environment()
    external_url = "postgresql+psycopg://app:app@database.example.com:5433/app"
    monkeypatch.setenv("APP_DATABASE_URL", external_url)
    assert local_commands.build_environment()["APP_DATABASE_URL"] == external_url
