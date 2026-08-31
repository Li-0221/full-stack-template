import pytest
from alembic.config import Config
from sqlalchemy import Engine, inspect

from alembic import command
from app.core.config import get_database_settings
from app.db.base import Base


def test_migration_upgrade_and_downgrade(
    postgres_url: str,
    database_engine: Engine,
    monkeypatch,
) -> None:
    Base.metadata.drop_all(database_engine)
    monkeypatch.setenv("APP_DATABASE_URL", postgres_url)
    get_database_settings.cache_clear()
    config = Config("alembic.ini")

    command.upgrade(config, "head")
    database_inspector = inspect(database_engine)
    assert database_inspector.has_table("users")
    assert database_inspector.has_table("auth_sessions")
    auth_session_indexes = {
        index["name"] for index in database_inspector.get_indexes("auth_sessions")
    }
    assert "ix_auth_sessions_expires_at" in auth_session_indexes
    command.check(config)

    command.downgrade(config, "base")
    assert not inspect(database_engine).has_table("users")
    assert not inspect(database_engine).has_table("auth_sessions")
    get_database_settings.cache_clear()


def test_offline_migration_accepts_percent_encoded_database_url(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv(
        "APP_DATABASE_URL",
        "postgresql+psycopg://localhost/example?application_name=fastapi%20demo",
    )
    get_database_settings.cache_clear()
    try:
        command.upgrade(Config("alembic.ini"), "head", sql=True)
        migration_sql = capsys.readouterr().out
        assert "CREATE TABLE users" in migration_sql
        assert "CREATE TABLE auth_sessions" in migration_sql
        assert "CREATE INDEX ix_auth_sessions_expires_at" in migration_sql
    finally:
        get_database_settings.cache_clear()
