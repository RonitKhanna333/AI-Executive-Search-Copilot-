"""Dashboard metrics model."""

import uuid
from datetime import datetime, timezone, date
from sqlalchemy import String, Integer, Float, DateTime, Date, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class DashboardMetric(Base):
    __tablename__ = "dashboard_metrics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    metric_category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # recruitment, ai, business
    dimension: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recorded_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self) -> str:
        return f"<DashboardMetric(name={self.metric_name}, value={self.metric_value})>"
