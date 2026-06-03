"""Company Brain document processing and RAG service."""

import os
import uuid
import json
import structlog
from typing import List
from pathlib import Path
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from groq import Groq

from app.repositories.document_repository import DocumentRepository
from app.repositories.chat_repository import ChatRepository
from app.services.embedding_service import EmbeddingService
from app.services.resume_parser import ResumeParser
from app.models.document import Document, DocumentChunk
from app.models.chat import ChatSession, ChatMessage
from app.schemas.document import (
    DocumentResponse, CompanyBrainChatRequest, CompanyBrainChatResponse, SourceCitation
)
from app.core.config import settings

logger = structlog.get_logger()


class DocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.doc_repo = DocumentRepository(db)
        self.chat_repo = ChatRepository(db)
        self.embedding_svc = EmbeddingService()
        self.parser = ResumeParser()
        self.groq = Groq(api_key=settings.GROQ_API_KEY)

    async def upload_document(
        self, file: UploadFile, category: Optional[str] = None, user_id: Optional[uuid.UUID] = None
    ) -> DocumentResponse:
        """Upload and index a document for RAG."""
        content = await file.read()
        file_ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""

        if file_ext not in ["pdf", "docx", "txt", "md"]:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        # Save file
        save_dir = Path(settings.UPLOAD_DIR) / "documents"
        save_dir.mkdir(parents=True, exist_ok=True)
        file_id = uuid.uuid4()
        file_path = save_dir / f"{file_id}.{file_ext}"
        file_path.write_bytes(content)

        # Extract text
        text = await self.parser._extract_text(content, file_ext)
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from document")

        # Create document record
        doc = Document(
            title=file.filename.rsplit(".", 1)[0],
            file_name=file.filename,
            file_path=str(file_path),
            file_type=file_ext,
            file_size=len(content),
            content=text,
            category=category,
            status="processing",
        )
        doc = await self.doc_repo.create(doc)

        # Chunk and embed
        await self._process_document(doc, text)

        logger.info("Document uploaded and indexed", doc_id=str(doc.id))
        return DocumentResponse.model_validate(doc)

    async def chat(
        self, request: CompanyBrainChatRequest, user_id: uuid.UUID
    ) -> CompanyBrainChatResponse:
        """RAG-powered chat with company brain."""
        # Get or create session
        if request.session_id:
            session = await self.chat_repo.get(request.session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Chat session not found")
        else:
            session = ChatSession(
                user_id=user_id,
                title=request.message[:50],
                session_type="company_brain",
            )
            session = await self.chat_repo.create(session)

        # Get conversation history
        history = await self.chat_repo.get_messages(session.id, limit=10)

        # Embed query and retrieve chunks
        query_embedding = self.embedding_svc.generate(request.message)
        chunk_results = await self.doc_repo.semantic_search_chunks(
            query_embedding, top_k=request.top_k
        )

        # Build context
        context_parts = []
        sources = []
        for chunk, score in chunk_results:
            context_parts.append(f"[Source: {chunk.document_id}]\n{chunk.content}")
            sources.append(
                SourceCitation(
                    document_id=chunk.document_id,
                    document_title=chunk.metadata.get("document_title", "Unknown") if chunk.metadata else "Unknown",
                    chunk_content=chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content,
                    relevance_score=round(score, 4),
                )
            )

        context = "\n\n---\n\n".join(context_parts)

        # Build messages for Groq
        messages = [
            {
                "role": "system",
                "content": f"""You are the Company Brain AI assistant. You answer questions using the company's internal documents.
                
Available Context:
{context}

Instructions:
- Answer based on the provided context
- If information is not in the context, say so clearly
- Always cite your sources
- Be concise and professional""",
            }
        ]

        # Add history
        for msg in history[-6:]:  # Last 3 exchanges
            messages.append({"role": msg.role, "content": msg.content})

        messages.append({"role": "user", "content": request.message})

        # Get AI response
        response = self.groq.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=1500,
        )
        answer = response.choices[0].message.content

        # Save messages
        user_msg = ChatMessage(session_id=session.id, role="user", content=request.message)
        ai_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=answer,
            sources=[s.model_dump() for s in sources],
        )
        await self.chat_repo.add_message(user_msg)
        await self.chat_repo.add_message(ai_msg)

        return CompanyBrainChatResponse(
            answer=answer, sources=sources, session_id=session.id
        )

    async def list_documents(self) -> List[DocumentResponse]:
        docs = await self.doc_repo.get_all(limit=200)
        return [DocumentResponse.model_validate(d) for d in docs]

    async def delete_document(self, doc_id: uuid.UUID) -> bool:
        deleted = await self.doc_repo.delete(doc_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Document not found")
        return True

    async def _process_document(self, doc: Document, text: str):
        """Chunk document and generate embeddings."""
        chunks = self._chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)

        chunk_objects = []
        for i, chunk_text in enumerate(chunks):
            embedding = self.embedding_svc.generate(chunk_text)
            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=i,
                content=chunk_text,
                embedding=embedding,
                metadata={"document_title": doc.title, "chunk_index": i},
            )
            chunk_objects.append(chunk)

        await self.doc_repo.create_chunks_bulk(chunk_objects)
        doc.chunk_count = len(chunk_objects)
        doc.status = "indexed"
        await self.doc_repo.update(doc, chunk_count=len(chunk_objects), status="indexed")

    def _chunk_text(self, text: str, chunk_size: int, overlap: int) -> List[str]:
        """Split text into overlapping chunks."""
        words = text.split()
        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i : i + chunk_size])
            chunks.append(chunk)
            i += chunk_size - overlap
        return chunks if chunks else [text]


# Fix missing Optional import
from typing import Optional
