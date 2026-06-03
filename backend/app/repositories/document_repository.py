"""Document repository for Company Brain RAG."""

from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.repositories.base import BaseRepository
from app.models.document import Document, DocumentChunk


class DocumentRepository(BaseRepository[Document]):
    def __init__(self, db: AsyncSession):
        super().__init__(Document, db)

    async def get_with_chunks(self, document_id: UUID) -> Optional[Document]:
        result = await self.db.execute(
            select(Document)
            .options(selectinload(Document.chunks))
            .where(Document.id == document_id)
        )
        return result.scalar_one_or_none()

    async def semantic_search_chunks(
        self, query_embedding: List[float], top_k: int = 5
    ) -> List[Tuple[DocumentChunk, float]]:
        """Retrieve top-k document chunks by cosine similarity."""
        query = (
            select(
                DocumentChunk,
                (1 - DocumentChunk.embedding.cosine_distance(query_embedding)).label("similarity"),
            )
            .where(DocumentChunk.embedding.is_not(None))
            .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
            .limit(top_k)
        )
        result = await self.db.execute(query)
        rows = result.all()
        return [(row[0], float(row[1])) for row in rows]

    async def create_chunk(self, chunk: DocumentChunk) -> DocumentChunk:
        self.db.add(chunk)
        await self.db.flush()
        await self.db.refresh(chunk)
        return chunk

    async def create_chunks_bulk(self, chunks: List[DocumentChunk]) -> List[DocumentChunk]:
        for chunk in chunks:
            self.db.add(chunk)
        await self.db.flush()
        return chunks

    async def get_indexed_documents(self) -> List[Document]:
        result = await self.db.execute(
            select(Document)
            .where(Document.status == "indexed")
            .order_by(Document.created_at.desc())
        )
        return list(result.scalars().all())

    async def count_indexed(self) -> int:
        return await self.count(status="indexed")
