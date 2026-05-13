from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logger import logger
import time

class RequestLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        duration = (time.time() - start) * 1000
        logger.info(
            f"{request.method} {request.url.path} "
            f"- {response.status_code} - {duration:.1f}ms"
        )
        return response
