"""Dashboard metrics routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import DashboardMetricsResponse
from app.models.user import User

router = APIRouter(prefix="/dashboard")


@router.get("/metrics", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get comprehensive dashboard metrics:
    - Recruitment: total/active candidates, interviews, hires
    - AI: searches, outreach, documents indexed
    - Business: response rate, conversion, time-to-fill
    - Charts: candidates by status, over time, top skills
    """
    svc = DashboardService(db)
    return await svc.get_metrics()
