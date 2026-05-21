from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.routes import (
    affected_areas,
    auth,
    disasters,
    evacuation,
    geocode,
    relief,
    reports,
    stream,
    teams,
    warnings,
)
from app.core.config import settings
from app.core.database import init_db
from app.core.logger import logger
from app.core.rate_limiter import limiter
from app.middleware.request_logger import RequestLoggerMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting DRRMS API...")
    await init_db()
    logger.info("DRRMS API ready.")
    yield
    logger.info("DRRMS API shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Disaster Risk Reduction Management System API",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs" if not settings.is_production else None,
    redoc_url="/api/redoc" if not settings.is_production else None,
    openapi_url="/api/openapi.json" if not settings.is_production else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(RequestLoggerMiddleware)
if settings.SECURE_HEADERS:
    app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-Total-Count"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(disasters.router, prefix="/api/v1/disasters", tags=["Disasters"])
app.include_router(
    affected_areas.router, prefix="/api/v1/affected-areas", tags=["Affected Areas"]
)
app.include_router(teams.router, prefix="/api/v1/teams", tags=["Response Teams"])
app.include_router(
    evacuation.router, prefix="/api/v1/evacuation", tags=["Evacuation Centers"]
)
app.include_router(relief.router, prefix="/api/v1/relief", tags=["Relief Operations"])
app.include_router(warnings.router, prefix="/api/v1/warnings", tags=["Early Warnings"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(geocode.router, prefix="/api/v1/geocode", tags=["Geocoding"])
app.include_router(stream.router, prefix="/api/v1/stream", tags=["Realtime"])


@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }
