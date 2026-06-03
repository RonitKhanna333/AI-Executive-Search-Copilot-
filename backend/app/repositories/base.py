"""Generic base repository implementing common CRUD operations."""

from typing import Generic, TypeVar, Type, Optional, List, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import DeclarativeBase

ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):
    """Generic repository with standard CRUD operations."""

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get(self, id: UUID) -> Optional[ModelType]:
        result = await self.db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_all(
        self, skip: int = 0, limit: int = 100, **filters
    ) -> List[ModelType]:
        query = select(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key) and value is not None:
                query = query.where(getattr(self.model, key) == value)
        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, **filters) -> int:
        query = select(func.count()).select_from(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key) and value is not None:
                query = query.where(getattr(self.model, key) == value)
        result = await self.db.execute(query)
        return result.scalar_one()

    async def create(self, obj: ModelType) -> ModelType:
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def update(self, obj: ModelType, **kwargs) -> ModelType:
        for key, value in kwargs.items():
            if hasattr(obj, key):
                setattr(obj, key, value)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, id: UUID) -> bool:
        obj = await self.get(id)
        if obj:
            await self.db.delete(obj)
            await self.db.flush()
            return True
        return False

    async def exists(self, **filters) -> bool:
        query = select(func.count()).select_from(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key):
                query = query.where(getattr(self.model, key) == value)
        result = await self.db.execute(query)
        return result.scalar_one() > 0
