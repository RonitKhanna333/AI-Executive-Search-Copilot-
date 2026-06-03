"""Job Description schemas."""

import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class JobDescriptionCreate(BaseModel):
    title: str
    raw_text: str
    company_name: Optional[str] = None


class JobDescriptionUpdate(BaseModel):
    title: Optional[str] = None
    raw_text: Optional[str] = None
    company_name: Optional[str] = None
    status: Optional[str] = None


class JobAnalysisResult(BaseModel):
    role: str
    seniority: str
    required_skills: List[str]
    preferred_skills: List[str]
    years_experience: Optional[int] = None
    location: Optional[str] = None
    industry: Optional[str] = None
    keywords: List[str]
    salary_range: Optional[dict] = None


class JobDescriptionResponse(BaseModel):
    id: uuid.UUID
    title: str
    raw_text: str
    role: Optional[str] = None
    seniority: Optional[str] = None
    required_skills: Optional[List[str]] = []
    preferred_skills: Optional[List[str]] = []
    years_experience: Optional[int] = None
    location: Optional[str] = None
    industry: Optional[str] = None
    keywords: Optional[List[str]] = []
    salary_range: Optional[dict] = None
    company_name: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
