"""Job Description routes."""

import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, require_write
from app.services.job_service import JobService
from app.schemas.job_description import (
    JobDescriptionCreate, JobDescriptionResponse, JobAnalysisResult
)
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/jobs")


class AnalyzeTextRequest(BaseModel):
    text: str


@router.post("/analyze", response_model=JobAnalysisResult)
async def analyze_job_description(
    data: AnalyzeTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze raw job description text and extract structured requirements (no save)."""
    svc = JobService(db)
    return await svc.analyze_jd_only(data.text)


@router.post("", response_model=JobDescriptionResponse, status_code=201)
async def create_job(
    data: JobDescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write),
):
    """Analyze and save a job description."""
    svc = JobService(db)
    return await svc.analyze_and_create(data)


@router.get("", response_model=list)
async def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all job descriptions."""
    svc = JobService(db)
    return await svc.list_jobs(skip=skip, limit=limit)


@router.get("/{job_id}", response_model=JobDescriptionResponse)
async def get_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = JobService(db)
    return await svc.get_job(job_id)


@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write),
):
    svc = JobService(db)
    await svc.delete_job(job_id)
