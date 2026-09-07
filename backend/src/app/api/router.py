from fastapi import APIRouter

from app.api.routes import auth, health, users
from app.schemas.common import ErrorResponse

api_router = APIRouter(responses={500: {"model": ErrorResponse}})
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(users.admin_router)
