import json
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URI: str
    DB_NAME: str = "drrms_db"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    APP_ENV: str = "development"
    APP_NAME: str = "DRRMS API"
    APP_VERSION: str = "1.0.0"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173"]
    RATE_LIMIT_PER_MINUTE: int = 100
    AUTH_RATE_LIMIT_PER_MINUTE: int = 10
    SECURE_HEADERS: bool = True
    ADMIN_EMAIL: str = "admin@cics.com"
    ADMIN_PASSWORD: str = "itd110admin"
    ADMIN_FULL_NAME: str = "System Admin"

    @field_validator("JWT_SECRET")
    @classmethod
    def jwt_secret_must_be_strong(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
        return v

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            raw = v.strip()
            if not raw:
                return []
            if raw.startswith("["):
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError as exc:
                    raise ValueError(
                        "ALLOWED_ORIGINS must be a JSON array or comma-separated list"
                    ) from exc
                if not isinstance(parsed, list):
                    raise ValueError(
                        "ALLOWED_ORIGINS must be a JSON array or comma-separated list"
                    )
                return parsed
            return [origin.strip() for origin in raw.split(",") if origin.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
