"""Document and Company Brain schemas."""

import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: uuid.UUID
    title: str
    file_name: str
    file_type: str
    file_size: Optional[int] = None
    category: Optional[str] = None
    chunk_count: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentChunkResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    chunk_index: int
    content: str
    metadata: Optional[dict] = None

    model_config = {"from_attributes": True}


class CompanyBrainChatRequest(BaseModel):
    message: str
    session_id: Optional[uuid.UUID] = None
    top_k: int = 5


class SourceCitation(BaseModel):
    document_id: uuid.UUID
    document_title: str
    chunk_content: str
    relevance_score: float


class CompanyBrainChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    session_id: uuid.UUID
