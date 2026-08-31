from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from secrets import token_urlsafe

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.db.session import DatabaseSessionManager
from app.exceptions import AuthenticationRequiredError, InactiveUserError, InvalidCredentialsError
from app.repositories.auth_session import AuthSessionRecordCreate, AuthSessionRepository
from app.repositories.user import UserRepository
from app.schemas.auth import AuthTokensData
from app.schemas.user import UserData

MAX_LOGIN_EMAIL_LENGTH = 255
MAX_LOGIN_PASSWORD_LENGTH = 128
# 用户不存在时仍执行一次 Argon2 校验, 降低“账号存在/不存在”的响应时序差异。
# 该哈希只在每个进程启动时生成一次, 不对应任何真实账号。
UNMATCHED_PASSWORD_HASH = hash_password(token_urlsafe(32))


@dataclass(frozen=True, slots=True)
class AccessTokenResult:
    # repr=False 不改变返回值, 只避免内部调试输出完整 JWT。
    access_token: str = field(repr=False)
    expires_in: int


@dataclass(frozen=True, slots=True)
class LoginUserFacts:
    user: UserData
    # 登录校验需要真实哈希, 但不应让 dataclass repr 带出它。
    hashed_password: str = field(repr=False)


class AuthService:
    def __init__(
        self,
        *,
        manager: DatabaseSessionManager,
        secret_key: str,
        access_token_expire_minutes: int,
        refresh_token_expire_days: int,
    ) -> None:
        self.manager = manager
        self.secret_key = secret_key
        self.access_token_expire_minutes = access_token_expire_minutes
        self.refresh_token_expire_days = refresh_token_expire_days

    def login(self, *, email: str, password: str) -> AccessTokenResult:
        facts = self.authenticate_credentials(email=email, password=password)
        access_token = create_access_token(
            subject=facts.user.id,
            secret_key=self.secret_key,
            expires_minutes=self.access_token_expire_minutes,
        )
        return AccessTokenResult(
            access_token=access_token,
            expires_in=self.access_token_expire_minutes * 60,
        )

    def authenticate_credentials(self, *, email: str, password: str) -> LoginUserFacts:
        # OAuth2 表单本身没有长度上限, 必须在进入数据库查询和 Argon2 前限制资源消耗。
        if (
            not email
            or len(email) > MAX_LOGIN_EMAIL_LENGTH
            or not password
            or len(password) > MAX_LOGIN_PASSWORD_LENGTH
        ):
            raise InvalidCredentialsError

        normalized_email = email.strip().casefold()
        facts: LoginUserFacts | None = None
        # Session 只负责读取登录事实; 昂贵的 Argon2 校验在 Session 关闭后执行。
        with self.manager.session_scope() as session:
            user = UserRepository(session).get_by_email(normalized_email)
            if user is not None:
                facts = LoginUserFacts(
                    user=UserData.model_validate(user, from_attributes=True),
                    hashed_password=user.hashed_password,
                )

        candidate_hash = facts.hashed_password if facts is not None else UNMATCHED_PASSWORD_HASH
        password_matches = verify_password(password, candidate_hash)
        # 无论账号不存在还是密码错误, 都对外返回同一个稳定错误。
        if facts is None or not password_matches:
            raise InvalidCredentialsError
        if not facts.user.is_active:
            raise InactiveUserError

        return facts

    def create_session(self, *, email: str, password: str) -> AuthTokensData:
        facts = self.authenticate_credentials(email=email, password=password)
        issued_at = datetime.now(UTC)
        access_expires_at = issued_at + timedelta(minutes=self.access_token_expire_minutes)
        refresh_expires_at = issued_at + timedelta(days=self.refresh_token_expire_days)
        access_token = create_access_token(
            subject=facts.user.id,
            secret_key=self.secret_key,
            expires_minutes=self.access_token_expire_minutes,
        )
        refresh_token = create_refresh_token()
        record = AuthSessionRecordCreate(
            user_id=facts.user.id,
            refresh_token_hash=hash_refresh_token(refresh_token),
            expires_at=refresh_expires_at,
        )
        with self.manager.session_scope() as session:
            AuthSessionRepository(session).create(record)
            session.commit()
        return AuthTokensData(
            access_token=access_token,
            access_expires_at=int(access_expires_at.timestamp() * 1000),
            refresh_token=refresh_token,
            refresh_expires_at=int(refresh_expires_at.timestamp() * 1000),
        )

    def refresh_session(self, *, refresh_token: str) -> AuthTokensData:
        issued_at = datetime.now(UTC)
        refresh_token_hash = hash_refresh_token(refresh_token)
        rotated_refresh_token = create_refresh_token()
        rotated_refresh_expires_at = issued_at + timedelta(days=self.refresh_token_expire_days)
        with self.manager.session_scope() as session:
            repository = AuthSessionRepository(session)
            auth_session = repository.get_by_refresh_token_hash_for_update(refresh_token_hash)
            if (
                auth_session is None
                or auth_session.revoked_at is not None
                or auth_session.expires_at <= issued_at
            ):
                raise AuthenticationRequiredError
            user = UserRepository(session).get_by_id(auth_session.user_id)
            if user is None or not user.is_active:
                raise AuthenticationRequiredError
            repository.revoke(auth_session, revoked_at=issued_at)
            repository.create(
                AuthSessionRecordCreate(
                    user_id=user.id,
                    refresh_token_hash=hash_refresh_token(rotated_refresh_token),
                    expires_at=rotated_refresh_expires_at,
                )
            )
            session.commit()

        access_expires_at = issued_at + timedelta(minutes=self.access_token_expire_minutes)
        access_token = create_access_token(
            subject=user.id,
            secret_key=self.secret_key,
            expires_minutes=self.access_token_expire_minutes,
        )
        return AuthTokensData(
            access_token=access_token,
            access_expires_at=int(access_expires_at.timestamp() * 1000),
            refresh_token=rotated_refresh_token,
            refresh_expires_at=int(rotated_refresh_expires_at.timestamp() * 1000),
        )

    def revoke_session(self, *, refresh_token: str) -> None:
        revoked_at = datetime.now(UTC)
        refresh_token_hash = hash_refresh_token(refresh_token)
        with self.manager.session_scope() as session:
            repository = AuthSessionRepository(session)
            auth_session = repository.get_by_refresh_token_hash_for_update(refresh_token_hash)
            if auth_session is not None and auth_session.revoked_at is None:
                repository.revoke(auth_session, revoked_at=revoked_at)
                session.commit()

    def authenticate_access_token(self, token: str) -> UserData:
        claims = decode_access_token(token=token, secret_key=self.secret_key)
        if claims is None:
            raise AuthenticationRequiredError

        with self.manager.session_scope() as session:
            user = UserRepository(session).get_by_id(claims.sub)
            if user is None:
                raise AuthenticationRequiredError
            if not user.is_active:
                raise InactiveUserError
            return UserData.model_validate(user, from_attributes=True)
