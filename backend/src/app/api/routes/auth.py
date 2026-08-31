from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.dependencies.auth import AuthServiceDep
from app.schemas.auth import (
    AccessTokenResponse,
    AuthTokensData,
    SessionLoginRequest,
    SessionRefreshRequest,
)
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/session")
def create_session(
    request: SessionLoginRequest,
    service: AuthServiceDep,
) -> ApiResponse[AuthTokensData]:
    tokens = service.create_session(email=str(request.email), password=request.password)
    return ApiResponse(data=tokens)


@router.post("/session/refresh")
def refresh_session(
    request: SessionRefreshRequest,
    service: AuthServiceDep,
) -> ApiResponse[AuthTokensData]:
    tokens = service.refresh_session(refresh_token=request.refresh_token)
    return ApiResponse(data=tokens)


@router.post("/session/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_session(
    request: SessionRefreshRequest,
    service: AuthServiceDep,
) -> None:
    service.revoke_session(refresh_token=request.refresh_token)


@router.post("/login/access-token")
def login_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    service: AuthServiceDep,
) -> AccessTokenResponse:
    result = service.login(email=form_data.username, password=form_data.password)
    return AccessTokenResponse(
        access_token=result.access_token,
        expires_in=result.expires_in,
    )
