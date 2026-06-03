"""Candidate and CandidateEmbedding models."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import String, Integer, Float, Text, DateTime, ARRAY, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from app.core.database import Base
from app.core.config import settings


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    years_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    skills: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True, default=list)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    education: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    resume_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    resume_file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    candidate_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", index=True)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tags: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    embedding = relationship(
        "CandidateEmbedding", back_populates="candidate", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Candidate(id={self.id}, name={self.full_name})>"


class CandidateEmbedding(Base):
    __tablename__ = "candidate_embeddings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    embedding: Mapped[list] = mapped_column(
        Vector(settings.EMBEDDING_DIMENSION), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    candidate = relationship("Candidate", back_populates="embedding")

    def __repr__(self) -> str:
        return f"<CandidateEmbedding(candidate_id={self.candidate_id})>"
