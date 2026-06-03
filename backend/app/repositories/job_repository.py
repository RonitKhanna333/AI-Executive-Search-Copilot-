"""Job Description repository."""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.repositories.base import BaseRepository
from app.models.job_description import JobDescription


class JobRepository(BaseRepository[JobDescription]):
    def __init__(self, db: AsyncSession):
        super().__init__(JobDescription, db)

    async def get_active_jobs(self) -> List[JobDescription]:
        result = await self.db.execute(
            select(JobDescription)
            .where(JobDescription.status == "active")
            .order_by(JobDescription.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_recent(self, limit: int = 10) -> List[JobDescription]:
        result = await self.db.execute(
            select(JobDescription)
            .order_by(JobDescription.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
