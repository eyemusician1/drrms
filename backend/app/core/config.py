from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List

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

    @field_validator("JWT_SECRET")
    @classmethod
    def jwt_secret_must_be_strong(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
        return v

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
