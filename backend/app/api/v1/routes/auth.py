from datetime import datetime, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.core.dependencies import get_current_officer, get_current_officer_optional, oauth2_scheme
from app.core.rate_limiter import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.models.officer import Officer
from app.models.token_blacklist import TokenBlacklist


router = APIRouter()


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: Optional[Literal["Admin", "Officer"]] = None


class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/login")
@limiter.limit(f"{settings.AUTH_RATE_LIMIT_PER_MINUTE}/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    officer = await Officer.find_one(Officer.email == form_data.username)
    if officer and officer.locked_until and officer.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked until {officer.locked_until.strftime('%H:%M:%S')}"
        )
    if not officer or not verify_password(form_data.password, officer.hashed_password):
        if officer:
            officer.failed_login_attempts += 1
            if officer.failed_login_attempts >= 5:
                officer.locked_until = datetime.utcnow() + timedelta(minutes=15)
            await officer.save()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    officer.failed_login_attempts = 0
    officer.locked_until = None
    officer.last_login = datetime.utcnow()
    await officer.save()
    access_token = create_access_token({"sub": officer.email, "role": officer.role})
    refresh_token = create_refresh_token({"sub": officer.email})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": officer.role
    }


@router.post("/refresh")
async def refresh_token(payload: RefreshRequest):
    blacklisted = await TokenBlacklist.find_one(TokenBlacklist.token == payload.refresh_token)
    if blacklisted:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    token_data = decode_token(payload.refresh_token)
    if not token_data or token_data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    officer = await Officer.find_one(Officer.email == token_data.get("sub"))
    if not officer or not officer.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Officer not found")

    access_token = create_access_token({"sub": officer.email, "role": officer.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": officer.role,
    }

@router.post("/logout")
async def logout(
    current_officer: Officer = Depends(get_current_officer),
    token: str = Depends(oauth2_scheme)
):
    expires_at = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    await TokenBlacklist(token=token, expires_at=expires_at).insert()
    return {"message": "Logged out successfully"}

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_officer(
    payload: RegisterRequest,
    current_officer: Officer | None = Depends(get_current_officer_optional)
):
    existing_officers = await Officer.find_all().count()
    if existing_officers > 0 and (not current_officer or current_officer.role != "Admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")

    role = payload.role or ("Admin" if existing_officers == 0 else "Officer")

    is_strong, msg = validate_password_strength(payload.password)
    if not is_strong:
        raise HTTPException(status_code=400, detail=msg)
    existing = await Officer.find_one(Officer.email == payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    officer = Officer(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=role,
    )
    await officer.insert()
    return {"message": f"Officer {payload.full_name} registered successfully", "role": officer.role}

@router.get("/me")
async def me(current_officer: Officer = Depends(get_current_officer)):
    return {
        "id": str(current_officer.id),
        "full_name": current_officer.full_name,
        "email": current_officer.email,
        "role": current_officer.role,
        "last_login": current_officer.last_login
    }
