"""Candidate management routes."""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, require_write
from app.services.candidate_service import CandidateService
from app.schemas.candidate import (
    CandidateCreate, CandidateUpdate, CandidateResponse,
    CandidateSearchRequest, CandidateSearchResult, CandidateListResponse
)
from app.models.user import User

router = APIRouter(prefix="/candidates")


@router.post("", response_model=CandidateResponse, status_code=201)
async def create_candidate(
    data: CandidateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write),
):
    """Create a new candidate manually."""
    svc = CandidateService(db)
    return await svc.create_candidate(data)


@router.get("", response_model=CandidateListResponse)
async def list_candidates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all candidates with pagination."""
    skip = (page - 1) * page_size
    svc = CandidateService(db)
    total, candidates = await svc.list_candidates(skip=skip, limit=page_size, status=status)
    return CandidateListResponse(total=total, page=page, page_size=page_size, items=candidates)


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific candidate by ID."""
    svc = CandidateService(db)
    return await svc.get_candidate(candidate_id)


@router.patch("/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(
    candidate_id: uuid.UUID,
    data: CandidateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write),
):
    """Update candidate profile."""
    svc = CandidateService(db)
    return await svc.update_candidate(candidate_id, data)


@router.delete("/{candidate_id}", status_code=204)
async def delete_candidate(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write),
):
    """Delete a candidate."""
    svc = CandidateService(db)
    await svc.delete_candidate(candidate_id)


@router.post("/search", response_model=list)
async def search_candidates(
    request: CandidateSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Semantic search for candidates.
    
    Example: "Find senior Python engineers with RAG experience in Singapore"
    """
    svc = CandidateService(db)
    return await svc.semantic_search(request)


@router.post("/upload/resume", response_model=CandidateResponse, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    candidate_id: Optional[uuid.UUID] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write),
):
    """Upload and parse a PDF/DOCX resume to create or update a candidate."""
    svc = CandidateService(db)
    return await svc.upload_resume(file, candidate_id)


@router.post("/upload/csv")
async def upload_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write),
):
    """Bulk import candidates from a CSV file."""
    svc = CandidateService(db)
    return await svc.upload_csv(file)
