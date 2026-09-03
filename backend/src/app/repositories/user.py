from uuid import UUID

from psycopg.errors import UniqueViolation
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User

USER_EMAIL_UNIQUE_DATABASE_NAME = "ix_users_email"


def is_email_unique_violation(error: IntegrityError) -> bool:
    return (
        isinstance(error.orig, UniqueViolation)
        and error.orig.diag.constraint_name == USER_EMAIL_UNIQUE_DATABASE_NAME
    )


class DuplicateUserRecordError(Exception):
    """Raised when the database rejects a duplicate user email."""


class UserRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, user_id: UUID) -> User | None:
        return self.session.get(User, user_id)

    def get_by_id_for_update(self, user_id: UUID) -> User | None:
        statement = select(User).where(User.id == user_id).with_for_update()
        return self.session.scalar(statement)

    def get_by_email(self, email: str) -> User | None:
        statement = select(User).where(User.email == email)
        return self.session.scalar(statement)

    def list_page(self, *, offset: int, limit: int) -> tuple[list[User], int]:
        statement = select(User).order_by(User.created_at.desc(), User.id.desc())
        count_statement = select(func.count()).select_from(User)
        items = list(self.session.scalars(statement.offset(offset).limit(limit)).all())
        total = self.session.scalar(count_statement) or 0
        return items, total

    def create(
        self,
        *,
        email: str,
        full_name: str | None,
        hashed_password: str,
        is_active: bool,
        is_superuser: bool,
    ) -> User:
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            is_active=is_active,
            is_superuser=is_superuser,
        )
        self.session.add(user)
        try:
            self.session.flush()
        except IntegrityError as error:
            if is_email_unique_violation(error):
                raise DuplicateUserRecordError from error
            raise
        return user

    def replace(
        self,
        *,
        user: User,
        email: str,
        full_name: str | None,
        hashed_password: str | None,
        is_active: bool,
        is_superuser: bool,
    ) -> User:
        user.email = email
        user.full_name = full_name
        if hashed_password is not None:
            user.hashed_password = hashed_password
        user.is_active = is_active
        user.is_superuser = is_superuser

        try:
            self.session.flush()
        except IntegrityError as error:
            if is_email_unique_violation(error):
                raise DuplicateUserRecordError from error
            raise
        return user

    def change_password(self, *, user: User, hashed_password: str) -> None:
        user.hashed_password = hashed_password
        self.session.flush()

    def delete(self, user: User) -> None:
        self.session.delete(user)
        self.session.flush()
