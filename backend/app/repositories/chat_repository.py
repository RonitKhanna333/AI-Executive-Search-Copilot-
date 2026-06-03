"""Chat session and message repository."""

from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.repositories.base import BaseRepository
from app.models.chat import ChatSession, ChatMessage


class ChatRepository(BaseRepository[ChatSession]):
    def __init__(self, db: AsyncSession):
        super().__init__(ChatSession, db)

    async def get_sessions_by_user(
        self, user_id: UUID, session_type: Optional[str] = None
    ) -> List[ChatSession]:
        query = (
            select(ChatSession)
            .where(ChatSession.user_id == user_id, ChatSession.is_active == True)
            .order_by(ChatSession.updated_at.desc())
        )
        if session_type:
            query = query.where(ChatSession.session_type == session_type)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_with_messages(self, session_id: UUID) -> Optional[ChatSession]:
        result = await self.db.execute(
            select(ChatSession)
            .options(selectinload(ChatSession.messages))
            .where(ChatSession.id == session_id)
        )
        return result.scalar_one_or_none()

    async def get_messages(self, session_id: UUID, limit: int = 50) -> List[ChatMessage]:
        result = await self.db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def add_message(self, message: ChatMessage) -> ChatMessage:
        self.db.add(message)
        await self.db.flush()
        await self.db.refresh(message)
        return message
