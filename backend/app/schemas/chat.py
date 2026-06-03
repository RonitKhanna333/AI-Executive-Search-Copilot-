"""Chat session and message schemas."""

import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ChatSessionCreate(BaseModel):
    title: str = "New Chat"
    session_type: str = "copilot"


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    title: str
    session_type: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatMessageCreate(BaseModel):
    role: str
    content: str
    metadata: Optional[dict] = None


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    metadata: Optional[dict] = None
    sources: Optional[list] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CopilotChatRequest(BaseModel):
    message: str
    session_id: Optional[uuid.UUID] = None


class CopilotChatResponse(BaseModel):
    response: str
    session_id: uuid.UUID
    intent: Optional[str] = None
    data: Optional[dict] = None
