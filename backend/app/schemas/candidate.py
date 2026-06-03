"""Candidate schemas."""

import uuid
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr


class CandidateCreate(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    current_company: Optional[str] = None
    current_title: Optional[str] = None
    years_experience: Optional[int] = None
    skills: Optional[List[str]] = []
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    education: Optional[dict] = None
    resume_text: Optional[str] = None
    candidate_summary: Optional[str] = None
    source: Optional[str] = "manual"
    tags: Optional[List[str]] = []


class CandidateUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    current_company: Optional[str] = None
    current_title: Optional[str] = None
    years_experience: Optional[int] = None
    skills: Optional[List[str]] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    education: Optional[dict] = None
    resume_text: Optional[str] = None
    candidate_summary: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None


class CandidateResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    current_company: Optional[str] = None
    current_title: Optional[str] = None
    years_experience: Optional[int] = None
    skills: Optional[List[str]] = []
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    education: Optional[dict] = None
    resume_text: Optional[str] = None
    resume_file_path: Optional[str] = None
    candidate_summary: Optional[str] = None
    status: str
    source: Optional[str] = None
    tags: Optional[List[str]] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CandidateSearchRequest(BaseModel):
    query: str
    top_k: int = 10
    filters: Optional[dict] = None


class CandidateSearchResult(BaseModel):
    candidate: CandidateResponse
    similarity_score: float
    explanation: str


class CandidateListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[CandidateResponse]
