"""Agent workflow schemas."""

import uuid
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel


class CandidateEvaluation(BaseModel):
    candidate_id: uuid.UUID
    candidate_name: str
    score: int
    strengths: List[str]
    weaknesses: List[str]
    recommendation: str


class AgentWorkflowRequest(BaseModel):
    job_description_id: Optional[uuid.UUID] = None
    job_description_text: Optional[str] = None
    top_k: int = 10


class AgentWorkflowResponse(BaseModel):
    run_id: uuid.UUID
    status: str
    requirements: Optional[dict] = None
    search_strategy: Optional[str] = None
    candidates_found: int
    evaluations: List[CandidateEvaluation]
    top_candidate: Optional[CandidateEvaluation] = None
    outreach_messages: Optional[dict] = None
    duration_seconds: Optional[float] = None


class AgentRunResponse(BaseModel):
    id: uuid.UUID
    workflow_type: str
    status: str
    input_data: Optional[dict] = None
    output_data: Optional[dict] = None
    steps: Optional[list] = None
    error_message: Optional[str] = None
    duration_seconds: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
