import pytest
from pydantic import ValidationError
from sqlalchemy import func, select

from app.db.session import DatabaseSessionManager
from app.models.user import User
from app.services.user import UserService


def test_invalid_public_user_data_rolls_back_before_commit(
    database_manager: DatabaseSessionManager,
    reset_database: None,
) -> None:
    del reset_database
    with pytest.raises(ValidationError):
        UserService(manager=database_manager).create_user(
            email="not-an-email",
            full_name=None,
            password="valid-test-password",
            is_active=True,
            is_superuser=True,
        )
    with database_manager.session_scope() as session:
        assert session.scalar(select(func.count()).select_from(User)) == 0
