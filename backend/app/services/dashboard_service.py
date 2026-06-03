"""Dashboard metrics service."""

import structlog
from datetime import date, timedelta, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.repositories.candidate_repository import CandidateRepository
from app.repositories.document_repository import DocumentRepository
from app.models.candidate import Candidate
from app.models.agent_run import AgentRun
from app.models.document import Document
from app.schemas.dashboard import (
    DashboardMetricsResponse, RecruitmentMetrics, AIMetrics,
    BusinessMetrics, ChartDataPoint
)

logger = structlog.get_logger()


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.candidate_repo = CandidateRepository(db)
        self.doc_repo = DocumentRepository(db)

    async def get_metrics(self) -> DashboardMetricsResponse:
        """Aggregate and return all dashboard metrics."""
        recruitment = await self._get_recruitment_metrics()
        ai_metrics = await self._get_ai_metrics()
        business = await self._get_business_metrics()
        by_status = await self._get_candidates_by_status()
        over_time = await self._get_candidates_over_time()
        top_skills = await self._get_top_skills()

        return DashboardMetricsResponse(
            recruitment=recruitment,
            ai=ai_metrics,
            business=business,
            candidates_by_status=by_status,
            candidates_over_time=over_time,
            top_skills=top_skills,
        )

    async def _get_recruitment_metrics(self) -> RecruitmentMetrics:
        total = await self.candidate_repo.count()
        active = await self.candidate_repo.count(status="active")
        interviews = await self.candidate_repo.count(status="interview")
        hired = await self.candidate_repo.count(status="hired")

        # This month
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        result = await self.db.execute(
            select(func.count(Candidate.id)).where(
                Candidate.created_at >= thirty_days_ago
            )
        )
        month_added = result.scalar_one() or 0

        return RecruitmentMetrics(
            total_candidates=total,
            active_candidates=active,
            interviews_scheduled=interviews,
            hires_completed=hired,
            candidates_added_this_month=month_added,
        )

    async def _get_ai_metrics(self) -> AIMetrics:
        result = await self.db.execute(
            select(func.count(AgentRun.id))
            .where(AgentRun.workflow_type == "recruitment_workflow")
        )
        searches = result.scalar_one() or 0

        result2 = await self.db.execute(
            select(func.count(AgentRun.id))
            .where(AgentRun.workflow_type == "outreach")
        )
        outreach = result2.scalar_one() or 0

        docs_indexed = await self.doc_repo.count_indexed()

        result3 = await self.db.execute(select(func.count(AgentRun.id)))
        total_runs = result3.scalar_one() or 0

        return AIMetrics(
            ai_searches_executed=searches,
            outreach_generated=outreach,
            documents_indexed=docs_indexed,
            agent_runs_total=total_runs,
        )

    async def _get_business_metrics(self) -> BusinessMetrics:
        # Placeholder calculations - in production these would use actual tracking data
        return BusinessMetrics(
            response_rate=34.5,
            interview_conversion_rate=28.0,
            time_to_fill_days=42.0,
        )

    async def _get_candidates_by_status(self) -> list:
        result = await self.db.execute(
            select(Candidate.status, func.count(Candidate.id).label("count"))
            .group_by(Candidate.status)
        )
        rows = result.all()
        return [ChartDataPoint(label=row[0], value=row[1]) for row in rows]

    async def _get_candidates_over_time(self) -> list:
        """Candidates added in last 12 months, by month."""
        result = await self.db.execute(
            text("""
                SELECT TO_CHAR(created_at, 'Mon YYYY') as month,
                       COUNT(*) as count
                FROM candidates
                WHERE created_at >= NOW() - INTERVAL '12 months'
                GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
                ORDER BY DATE_TRUNC('month', created_at)
            """)
        )
        rows = result.all()
        return [ChartDataPoint(label=row[0], value=row[1]) for row in rows]

    async def _get_top_skills(self) -> list:
        """Top 10 most common skills across candidates."""
        result = await self.db.execute(
            text("""
                SELECT skill, COUNT(*) as count
                FROM candidates, UNNEST(skills) AS skill
                GROUP BY skill
                ORDER BY count DESC
                LIMIT 10
            """)
        )
        rows = result.all()
        return [ChartDataPoint(label=row[0], value=row[1]) for row in rows]
