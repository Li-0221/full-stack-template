from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.auth_session import AuthSession


@dataclass(frozen=True, slots=True)
class AuthSessionRecordCreate:
    user_id: UUID
    refresh_token_hash: str = field(repr=False)
    expires_at: datetime


class AuthSessionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, data: AuthSessionRecordCreate) -> AuthSession:
        auth_session = AuthSession(
            user_id=data.user_id,
            refresh_token_hash=data.refresh_token_hash,
            expires_at=data.expires_at,
        )
        self.session.add(auth_session)
        self.session.flush()
        return auth_session

    def get_by_refresh_token_hash_for_update(self, refresh_token_hash: str) -> AuthSession | None:
        statement = (
            select(AuthSession)
            .where(AuthSession.refresh_token_hash == refresh_token_hash)
            .with_for_update()
        )
        return self.session.scalar(statement)

    def revoke(self, auth_session: AuthSession, *, revoked_at: datetime) -> None:
        auth_session.revoked_at = revoked_at
        self.session.flush()

    def revoke_all_for_user(self, user_id: UUID, *, revoked_at: datetime) -> None:
        statement = (
            update(AuthSession)
            .where(
                AuthSession.user_id == user_id,
                AuthSession.revoked_at.is_(None),
            )
            .values(revoked_at=revoked_at)
        )
        self.session.execute(statement)
        self.session.flush()
