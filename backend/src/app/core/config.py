from functools import lru_cache
from typing import Annotated

from pydantic import Field, HttpUrl, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DATABASE_URL_DRIVER_ERROR = "database_url must use postgresql+psycopg"


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_", extra="ignore")

    name: str = "Full Stack Template API"
    api_v1_prefix: str = "/api/v1"
    secret_key: Annotated[SecretStr, Field(min_length=32)]
    # 防止配置为立即失效或意外长期有效的 access token, 最长允许一天。
    access_token_expire_minutes: Annotated[int, Field(gt=0, le=1440)] = 30
    refresh_token_expire_days: Annotated[int, Field(gt=0, le=90)] = 7
    cors_origins: tuple[HttpUrl, ...] = (
        HttpUrl("http://localhost:5176"),
        HttpUrl("http://localhost:3000"),
    )

    @property
    def cors_origin_values(self) -> tuple[str, ...]:
        return tuple(str(origin).rstrip("/") for origin in self.cors_origins)


class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_", extra="ignore")

    database_url: SecretStr

    @field_validator("database_url")
    @classmethod
    def require_psycopg_url(cls, value: SecretStr) -> SecretStr:
        if not value.get_secret_value().startswith("postgresql+psycopg://"):
            raise ValueError(DATABASE_URL_DRIVER_ERROR)
        return value

    @property
    def url(self) -> str:
        return self.database_url.get_secret_value()


@lru_cache
def get_app_settings() -> AppSettings:
    # Pylance 无法识别 BaseSettings 的环境变量数据源, 运行时仍会校验必填配置。
    return AppSettings()  # pyright: ignore[reportCallIssue]


@lru_cache
def get_database_settings() -> DatabaseSettings:
    # Pylance 无法识别 BaseSettings 的环境变量数据源, 运行时仍会校验必填配置。
    return DatabaseSettings()  # pyright: ignore[reportCallIssue]
