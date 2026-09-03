import secrets
from typing import cast

import pytest
from sqlalchemy.exc import IntegrityError

from app.db.session import DatabaseSessionManager
from app.repositories.user import DuplicateUserRecordError, UserRepository


def test_only_email_unique_violation_is_classified_as_duplicate(
    database_manager: DatabaseSessionManager,
    reset_database: None,
) -> None:
    del reset_database
    password_hash = secrets.token_urlsafe(32)

    with database_manager.session_scope() as session:
        UserRepository(session).create(
            email="duplicate-constraint@example.com",
            full_name=None,
            hashed_password=password_hash,
            is_active=True,
            is_superuser=False,
        )
        session.commit()

    with (
        pytest.raises(DuplicateUserRecordError),
        database_manager.session_scope() as session,
    ):
        UserRepository(session).create(
            email="duplicate-constraint@example.com",
            full_name=None,
            hashed_password=password_hash,
            is_active=True,
            is_superuser=False,
        )

    with pytest.raises(IntegrityError), database_manager.session_scope() as session:
        UserRepository(session).create(
            email=cast(str, None),
            full_name=None,
            hashed_password=password_hash,
            is_active=True,
            is_superuser=False,
        )
