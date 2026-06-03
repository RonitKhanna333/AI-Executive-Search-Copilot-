"""Outreach generation schemas."""

import uuid
from typing import Optional
from pydantic import BaseModel


class OutreachRequest(BaseModel):
    candidate_id: uuid.UUID
    job_description_id: Optional[uuid.UUID] = None
    job_description_text: Optional[str] = None
    outreach_type: str = "email"  # email, linkedin, followup
    tone: str = "professional"  # professional, casual, urgent


class OutreachResponse(BaseModel):
    subject: Optional[str] = None
    message: str
    outreach_type: str
    candidate_name: str
    personalization_notes: str
