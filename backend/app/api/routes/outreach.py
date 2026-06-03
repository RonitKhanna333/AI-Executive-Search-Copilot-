"""Outreach generation routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, require_write
from app.services.outreach_service import OutreachService
from app.schemas.outreach import OutreachRequest, OutreachResponse
from app.models.user import User

router = APIRouter(prefix="/outreach")


@router.post("/generate", response_model=OutreachResponse)
async def generate_outreach(
    request: OutreachRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write),
):
    """
    Generate personalized outreach for a candidate.
    
    Types: email, linkedin, followup
    """
    svc = OutreachService(db)
    return await svc.generate(request)
