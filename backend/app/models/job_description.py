"""Job Description model."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, DateTime, JSON, ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)

    # AI-extracted fields
    role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    seniority: Mapped[str | None] = mapped_column(String(100), nullable=True)
    required_skills: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True, default=list)
    preferred_skills: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True, default=list)
    years_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    keywords: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True, default=list)
    salary_range: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(String(50), default="active", index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<JobDescription(id={self.id}, title={self.title})>"
