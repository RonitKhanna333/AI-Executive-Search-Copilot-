"""Company Brain (RAG) routes."""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, require_write
from app.services.document_service import DocumentService
from app.schemas.document import (
    DocumentResponse, CompanyBrainChatRequest, CompanyBrainChatResponse
)
from app.models.user import User

router = APIRouter(prefix="/company-brain")


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    category: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write),
):
    """
    Upload a document (PDF, DOCX, TXT, MD) to the Company Brain.
    
    The document is chunked, embedded, and stored in pgvector for RAG retrieval.
    """
    svc = DocumentService(db)
    return await svc.upload_document(file, category, current_user.id)


@router.post("/chat", response_model=CompanyBrainChatResponse)
async def chat_with_brain(
    request: CompanyBrainChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Chat with the Company Brain using RAG.
    
    Example: "What is our executive search process for VP Engineering roles?"
    """
    svc = DocumentService(db)
    return await svc.chat(request, current_user.id)


@router.get("/documents", response_model=list)
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all indexed documents."""
    svc = DocumentService(db)
    return await svc.list_documents()


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write),
):
    """Delete a document and all its chunks."""
    svc = DocumentService(db)
    await svc.delete_document(document_id)
