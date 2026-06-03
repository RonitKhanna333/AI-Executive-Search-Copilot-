"""Authentication routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.services.auth_service import AuthService
from app.schemas.auth import UserCreate, UserLogin, TokenResponse, TokenRefresh, UserResponse
from app.models.user import User

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user and return access tokens."""
    svc = AuthService(db)
    return await svc.register(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login and return access tokens."""
    svc = AuthService(db)
    return await svc.login(data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: TokenRefresh, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token."""
    svc = AuthService(db)
    return await svc.refresh_token(data.refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return UserResponse.model_validate(current_user)
