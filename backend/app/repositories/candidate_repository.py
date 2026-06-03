"""Candidate repository with semantic search support."""

from typing import Optional, List, Tuple
from uuid import UUID
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, text
from sqlalchemy.orm import selectinload
from pgvector.sqlalchemy import Vector

from app.repositories.base import BaseRepository
from app.models.candidate import Candidate, CandidateEmbedding

logger = structlog.get_logger()


class CandidateRepository(BaseRepository[Candidate]):
    def __init__(self, db: AsyncSession):
        super().__init__(Candidate, db)

    async def get_with_embedding(self, candidate_id: UUID) -> Optional[Candidate]:
        result = await self.db.execute(
            select(Candidate)
            .options(selectinload(Candidate.embedding))
            .where(Candidate.id == candidate_id)
        )
        return result.scalar_one_or_none()

    async def get_all_with_embeddings(self, skip: int = 0, limit: int = 100) -> List[Candidate]:
        result = await self.db.execute(
            select(Candidate)
            .options(selectinload(Candidate.embedding))
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def semantic_search(
        self, query_embedding: List[float], top_k: int = 10
    ) -> List[Tuple[Candidate, float]]:
        """Search candidates using cosine similarity on embeddings."""
        embedding_vector = str(query_embedding)

        query = (
            select(
                Candidate,
                (1 - CandidateEmbedding.embedding.cosine_distance(query_embedding)).label("similarity"),
            )
            .join(CandidateEmbedding, Candidate.id == CandidateEmbedding.candidate_id)
            .where(Candidate.status == "active")
            .order_by(
                CandidateEmbedding.embedding.cosine_distance(query_embedding)
            )
            .limit(top_k)
        )

        result = await self.db.execute(query)
        rows = result.all()
        return [(row[0], float(row[1])) for row in rows]

    async def search_by_text(self, query: str, limit: int = 20) -> List[Candidate]:
        """Full-text search on candidate fields."""
        search_term = f"%{query.lower()}%"
        result = await self.db.execute(
            select(Candidate)
            .where(
                or_(
                    func.lower(Candidate.full_name).like(search_term),
                    func.lower(Candidate.current_company).like(search_term),
                    func.lower(Candidate.current_title).like(search_term),
                    func.lower(Candidate.location).like(search_term),
                    func.lower(Candidate.resume_text).like(search_term),
                )
            )
            .limit(limit)
        )
        return list(result.scalars().all())

    async def upsert_embedding(
        self, candidate_id: UUID, embedding_vector: List[float]
    ) -> CandidateEmbedding:
        """Create or update candidate embedding."""
        result = await self.db.execute(
            select(CandidateEmbedding).where(
                CandidateEmbedding.candidate_id == candidate_id
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.embedding = embedding_vector
            await self.db.flush()
            return existing
        else:
            embedding = CandidateEmbedding(
                candidate_id=candidate_id, embedding=embedding_vector
            )
            self.db.add(embedding)
            await self.db.flush()
            await self.db.refresh(embedding)
            return embedding

    async def get_by_email(self, email: str) -> Optional[Candidate]:
        result = await self.db.execute(
            select(Candidate).where(Candidate.email == email)
        )
        return result.scalar_one_or_none()

    async def get_stats(self) -> dict:
        total = await self.count()
        active = await self.count(status="active")
        return {
            "total": total,
            "active": active,
            "inactive": total - active,
        }
