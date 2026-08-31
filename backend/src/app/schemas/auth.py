from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.schemas.common import RequestModel, ResponseModel
from app.schemas.user import EmailField, SensitivePasswordField


class AccessTokenResponse(BaseModel):
    # token 仍会按 OAuth2 契约序列化返回; repr=False 仅避免调试输出意外泄漏。
    access_token: Annotated[str, Field(repr=False)]
    # 使用 Literal 防止业务代码构造非标准 token type。
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class SessionLoginRequest(RequestModel):
    email: EmailField
    password: SensitivePasswordField


class AuthTokensData(ResponseModel):
    access_token: Annotated[str, Field(repr=False)]
    access_expires_at: int
    refresh_token: Annotated[str, Field(repr=False)]
    refresh_expires_at: int


RefreshTokenField = Annotated[str, Field(min_length=32, max_length=512, repr=False)]


class SessionRefreshRequest(RequestModel):
    refresh_token: RefreshTokenField
