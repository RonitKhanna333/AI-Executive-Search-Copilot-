"""Authentication and authorization service."""

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserCreate, UserLogin, TokenResponse, UserResponse

logger = structlog.get_logger()


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register(self, user_data: UserCreate) -> TokenResponse:
        existing = await self.user_repo.get_by_email(user_data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hash_password(user_data.password),
            role=user_data.role,
            is_verified=True,  # Auto-verify in dev; add email flow in prod
        )
        user = await self.user_repo.create(user)
        logger.info("User registered", user_id=str(user.id), email=user.email)

        return self._build_token_response(user)

    async def login(self, credentials: UserLogin) -> TokenResponse:
        user = await self.user_repo.get_by_email(credentials.email)
        if not user or not verify_password(credentials.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )
        logger.info("User logged in", user_id=str(user.id))
        return self._build_token_response(user)

    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        user = await self.user_repo.get(payload["sub"])
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        return self._build_token_response(user)

    async def get_current_user(self, token: str) -> User:
        payload = decode_token(token)
        user = await self.user_repo.get(payload["sub"])
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found")
        return user

    def _build_token_response(self, user: User) -> TokenResponse:
        return TokenResponse(
            access_token=create_access_token(str(user.id)),
            refresh_token=create_refresh_token(str(user.id)),
            user=UserResponse.model_validate(user),
        )
