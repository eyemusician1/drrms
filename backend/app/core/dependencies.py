from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from app.core.security import decode_token
from app.models.officer import Officer
from app.models.token_blacklist import TokenBlacklist

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login", auto_error=False
)


async def get_current_officer_from_token(token: str) -> Officer:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    blacklisted = await TokenBlacklist.find_one(TokenBlacklist.token == token)
    if blacklisted:
        raise credentials_exception
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception
    officer = await Officer.find_one(Officer.email == payload.get("sub"))
    if not officer or not officer.is_active:
        raise credentials_exception
    return officer


async def get_current_officer(token: str = Depends(oauth2_scheme)) -> Officer:
    return await get_current_officer_from_token(token)


async def require_admin(officer: Officer = Depends(get_current_officer)) -> Officer:
    if officer.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )
    return officer


async def get_current_officer_optional(token: str = Depends(oauth2_scheme_optional)):
    if not token:
        return None
    try:
        return await get_current_officer_from_token(token)
    except HTTPException:
        return None


async def get_current_officer_sse(token: str | None = Query(None)) -> Officer:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token"
        )
    return await get_current_officer_from_token(token)
