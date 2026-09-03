from datetime import UTC, datetime
from uuid import UUID

from app.core.security import hash_password, verify_password
from app.db.session import DatabaseSessionManager
from app.exceptions import (
    EmailAlreadyExistsError,
    InvalidCurrentPasswordError,
    SelfAdministrationError,
    UserNotFoundError,
)
from app.repositories.auth_session import AuthSessionRepository
from app.repositories.user import DuplicateUserRecordError, UserRepository
from app.schemas.common import PageData
from app.schemas.user import UserData


class UserService:
    def __init__(self, *, manager: DatabaseSessionManager) -> None:
        self.manager = manager

    def create_user(
        self,
        *,
        email: str,
        full_name: str | None,
        password: str,
        is_active: bool,
        is_superuser: bool,
    ) -> UserData:
        with self.manager.session_scope() as session:
            repository = UserRepository(session)
            try:
                user = repository.create(
                    email=email.strip().casefold(),
                    full_name=full_name,
                    hashed_password=hash_password(password),
                    is_active=is_active,
                    is_superuser=is_superuser,
                )
                session.commit()
            except DuplicateUserRecordError:
                session.rollback()
                raise EmailAlreadyExistsError from None
            return UserData.model_validate(user, from_attributes=True)

    def get_user(self, *, user_id: UUID) -> UserData:
        with self.manager.session_scope() as session:
            user = UserRepository(session).get_by_id(user_id)
            if user is None:
                raise UserNotFoundError
            return UserData.model_validate(user, from_attributes=True)

    def list_users(
        self,
        *,
        page: int,
        page_size: int,
    ) -> PageData[UserData]:
        with self.manager.session_scope() as session:
            items, total = UserRepository(session).list_page(
                offset=(page - 1) * page_size,
                limit=page_size,
            )
            return PageData(
                items=[UserData.model_validate(user, from_attributes=True) for user in items],
                total=total,
                page=page,
                page_size=page_size,
            )

    def update_current_user(
        self,
        *,
        actor: UserData,
        email: str,
        full_name: str | None,
    ) -> UserData:
        with self.manager.session_scope() as session:
            repository = UserRepository(session)
            user = repository.get_by_id(actor.id)
            if user is None:
                raise UserNotFoundError
            try:
                repository.replace(
                    user=user,
                    email=email.strip().casefold(),
                    full_name=full_name,
                    hashed_password=None,
                    is_active=user.is_active,
                    is_superuser=user.is_superuser,
                )
                session.commit()
            except DuplicateUserRecordError:
                session.rollback()
                raise EmailAlreadyExistsError from None
            return UserData.model_validate(user, from_attributes=True)

    def change_current_user_password(
        self,
        *,
        actor: UserData,
        current_password: str,
        new_password: str,
    ) -> None:
        with self.manager.session_scope() as session:
            repository = UserRepository(session)
            user = repository.get_by_id_for_update(actor.id)
            if user is None:
                raise UserNotFoundError
            if not verify_password(current_password, user.hashed_password):
                raise InvalidCurrentPasswordError
            repository.change_password(
                user=user,
                hashed_password=hash_password(new_password),
            )
            AuthSessionRepository(session).revoke_all_for_user(
                user.id,
                revoked_at=datetime.now(UTC),
            )
            session.commit()

    def update_user_as_admin(
        self,
        *,
        actor_id: UUID,
        user_id: UUID,
        email: str,
        full_name: str | None,
        password: str | None,
        is_active: bool,
        is_superuser: bool,
    ) -> UserData:
        if actor_id == user_id:
            raise SelfAdministrationError

        hashed_password = hash_password(password) if password is not None else None
        with self.manager.session_scope() as session:
            repository = UserRepository(session)
            user = repository.get_by_id(user_id)
            if user is None:
                raise UserNotFoundError
            try:
                repository.replace(
                    user=user,
                    email=email.strip().casefold(),
                    full_name=full_name,
                    hashed_password=hashed_password,
                    is_active=is_active,
                    is_superuser=is_superuser,
                )
                if password is not None or not is_active:
                    AuthSessionRepository(session).revoke_all_for_user(
                        user.id,
                        revoked_at=datetime.now(UTC),
                    )
                session.commit()
            except DuplicateUserRecordError:
                session.rollback()
                raise EmailAlreadyExistsError from None
            return UserData.model_validate(user, from_attributes=True)

    def delete_user(
        self,
        *,
        actor_id: UUID,
        user_id: UUID,
    ) -> None:
        if actor_id == user_id:
            raise SelfAdministrationError

        with self.manager.session_scope() as session:
            repository = UserRepository(session)
            user = repository.get_by_id(user_id)
            if user is None:
                raise UserNotFoundError
            repository.delete(user)
            session.commit()
