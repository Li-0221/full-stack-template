import secrets
from datetime import UTC, datetime, timedelta
from time import time

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.db.session import DatabaseSessionManager
from app.models.auth_session import AuthSession
from tests.support import AccountFactory


def test_create_browser_session_returns_refreshable_tokens(
    client: TestClient,
    account_factory: AccountFactory,
) -> None:
    account = account_factory.create()

    response = client.post(
        "/api/v1/auth/session",
        json={"email": account.user.email, "password": account.password},
    )

    assert response.status_code == 200
    assert response.json()["code"] == 0
    tokens = response.json()["data"]
    assert set(tokens) == {
        "accessToken",
        "accessExpiresAt",
        "refreshToken",
        "refreshExpiresAt",
    }
    assert tokens["accessToken"]
    assert tokens["refreshToken"]
    assert tokens["accessExpiresAt"] > int(time() * 1000)
    assert tokens["refreshExpiresAt"] > tokens["accessExpiresAt"]

    me_response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {tokens['accessToken']}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["data"]["id"] == str(account.user.id)


def test_refresh_rotates_token_in_place_and_rejects_replay(
    client: TestClient,
    account_factory: AccountFactory,
    database_manager: DatabaseSessionManager,
) -> None:
    account = account_factory.create()
    login_response = client.post(
        "/api/v1/auth/session",
        json={"email": account.user.email, "password": account.password},
    )
    original = login_response.json()["data"]

    refresh_response = client.post(
        "/api/v1/auth/session/refresh",
        json={"refreshToken": original["refreshToken"]},
    )

    assert refresh_response.status_code == 200
    rotated = refresh_response.json()["data"]
    assert rotated["accessToken"] != original["accessToken"]
    assert rotated["refreshToken"] != original["refreshToken"]
    with database_manager.session_scope() as session:
        session_count = session.scalar(select(func.count()).select_from(AuthSession))
    assert session_count == 1

    replay_response = client.post(
        "/api/v1/auth/session/refresh",
        json={"refreshToken": original["refreshToken"]},
    )
    assert replay_response.status_code == 401
    assert replay_response.json()["code"] == 10001

    latest_refresh_response = client.post(
        "/api/v1/auth/session/refresh",
        json={"refreshToken": rotated["refreshToken"]},
    )
    assert latest_refresh_response.status_code == 200
    with database_manager.session_scope() as session:
        session_count = session.scalar(select(func.count()).select_from(AuthSession))
    assert session_count == 1


def test_create_session_removes_expired_sessions(
    client: TestClient,
    account_factory: AccountFactory,
    database_manager: DatabaseSessionManager,
) -> None:
    account = account_factory.create()
    first_login = client.post(
        "/api/v1/auth/session",
        json={"email": account.user.email, "password": account.password},
    )
    assert first_login.status_code == 200
    with database_manager.session_scope() as session:
        auth_session = session.scalar(select(AuthSession))
        assert auth_session is not None
        auth_session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        session.commit()

    second_login = client.post(
        "/api/v1/auth/session",
        json={"email": account.user.email, "password": account.password},
    )
    assert second_login.status_code == 200
    with database_manager.session_scope() as session:
        session_count = session.scalar(select(func.count()).select_from(AuthSession))
    assert session_count == 1


def test_refresh_session_removes_other_expired_sessions(
    client: TestClient,
    account_factory: AccountFactory,
    database_manager: DatabaseSessionManager,
) -> None:
    expired_account = account_factory.create()
    active_account = account_factory.create()
    expired_login = client.post(
        "/api/v1/auth/session",
        json={
            "email": expired_account.user.email,
            "password": expired_account.password,
        },
    )
    assert expired_login.status_code == 200
    active_login = client.post(
        "/api/v1/auth/session",
        json={"email": active_account.user.email, "password": active_account.password},
    )
    assert active_login.status_code == 200
    with database_manager.session_scope() as session:
        expired_session = session.scalar(
            select(AuthSession).where(AuthSession.user_id == expired_account.user.id)
        )
        assert expired_session is not None
        expired_session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        session.commit()

    refresh_response = client.post(
        "/api/v1/auth/session/refresh",
        json={"refreshToken": active_login.json()["data"]["refreshToken"]},
    )
    assert refresh_response.status_code == 200
    with database_manager.session_scope() as session:
        session_count = session.scalar(select(func.count()).select_from(AuthSession))
        expired_session = session.scalar(
            select(AuthSession).where(AuthSession.user_id == expired_account.user.id)
        )
    assert session_count == 1
    assert expired_session is None


def test_logout_revokes_refresh_token_idempotently(
    client: TestClient,
    account_factory: AccountFactory,
) -> None:
    account = account_factory.create()
    login_response = client.post(
        "/api/v1/auth/session",
        json={"email": account.user.email, "password": account.password},
    )
    refresh_token = login_response.json()["data"]["refreshToken"]
    payload = {"refreshToken": refresh_token}

    assert client.post("/api/v1/auth/session/logout", json=payload).status_code == 204
    assert client.post("/api/v1/auth/session/logout", json=payload).status_code == 204

    refresh_response = client.post("/api/v1/auth/session/refresh", json=payload)
    assert refresh_response.status_code == 401


def test_public_registration_route_is_not_available(client: TestClient) -> None:
    response = client.post("/api/v1/auth/register", json={})

    assert response.status_code == 404
    assert response.json() == {
        "code": 10010,
        "data": None,
        "message": "Resource not found",
    }


def test_invalid_credentials_return_401_and_bearer_challenge(
    client: TestClient,
    account_factory: AccountFactory,
) -> None:
    account = account_factory.create()

    response = client.post(
        "/api/v1/auth/login/access-token",
        data={"username": account.user.email, "password": secrets.token_urlsafe(24)},
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
    assert response.json()["code"] == 10002
    assert response.json()["data"] is None


def test_login_rejects_oversized_credentials(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login/access-token",
        data={"username": "x" * 256, "password": "x" * 129},
    )

    assert response.status_code == 401
    assert response.json()["code"] == 10002


def test_inactive_user_cannot_log_in(
    client: TestClient,
    account_factory: AccountFactory,
) -> None:
    account = account_factory.create(is_active=False)

    response = client.post(
        "/api/v1/auth/login/access-token",
        data={"username": account.user.email, "password": account.password},
    )

    assert response.status_code == 403
    assert response.json()["code"] == 10004


def test_missing_token_uses_unified_error_contract(client: TestClient) -> None:
    response = client.get("/api/v1/users/me")

    assert response.status_code == 401
    assert response.json()["code"] == 10001
    assert response.json()["data"] is None
    assert response.headers["X-Request-ID"]


def test_malformed_token_uses_bearer_challenge(client: TestClient) -> None:
    response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer not-a-jwt"},
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
    assert response.json()["code"] == 10001
