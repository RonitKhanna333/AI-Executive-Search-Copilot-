"""Candidate management service."""

import io
import csv
import uuid
import structlog
from typing import List, Optional, Tuple
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.candidate_repository import CandidateRepository
from app.services.embedding_service import EmbeddingService
from app.services.resume_parser import ResumeParser
from app.models.candidate import Candidate
from app.schemas.candidate import (
    CandidateCreate, CandidateUpdate, CandidateResponse,
    CandidateSearchRequest, CandidateSearchResult,
)
from app.core.config import settings

logger = structlog.get_logger()


class CandidateService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = CandidateRepository(db)
        self.embedding_svc = EmbeddingService()
        self.parser = ResumeParser()

    async def create_candidate(self, data: CandidateCreate) -> CandidateResponse:
        if data.email:
            existing = await self.repo.get_by_email(data.email)
            if existing:
                raise HTTPException(status_code=409, detail="Candidate with this email already exists")

        candidate = Candidate(**data.model_dump())
        candidate = await self.repo.create(candidate)

        # Generate and store embedding
        await self._generate_embedding(candidate)

        logger.info("Candidate created", candidate_id=str(candidate.id))
        return CandidateResponse.model_validate(candidate)

    async def get_candidate(self, candidate_id: uuid.UUID) -> CandidateResponse:
        candidate = await self.repo.get(candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return CandidateResponse.model_validate(candidate)

    async def list_candidates(
        self, skip: int = 0, limit: int = 50, status: Optional[str] = None
    ) -> Tuple[int, List[CandidateResponse]]:
        filters = {}
        if status:
            filters["status"] = status
        total = await self.repo.count(**filters)
        candidates = await self.repo.get_all(skip=skip, limit=limit, **filters)
        return total, [CandidateResponse.model_validate(c) for c in candidates]

    async def update_candidate(
        self, candidate_id: uuid.UUID, data: CandidateUpdate
    ) -> CandidateResponse:
        candidate = await self.repo.get(candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        update_data = data.model_dump(exclude_none=True)
        candidate = await self.repo.update(candidate, **update_data)

        # Re-generate embedding if profile changed
        if any(k in update_data for k in ["skills", "current_title", "resume_text", "candidate_summary"]):
            await self._generate_embedding(candidate)

        return CandidateResponse.model_validate(candidate)

    async def delete_candidate(self, candidate_id: uuid.UUID) -> bool:
        deleted = await self.repo.delete(candidate_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return True

    async def semantic_search(self, request: CandidateSearchRequest) -> List[CandidateSearchResult]:
        """Search candidates using semantic similarity."""
        query_embedding = self.embedding_svc.generate(request.query)
        results = await self.repo.semantic_search(query_embedding, top_k=request.top_k)

        search_results = []
        for candidate, score in results:
            explanation = self._generate_explanation(candidate, request.query, score)
            search_results.append(
                CandidateSearchResult(
                    candidate=CandidateResponse.model_validate(candidate),
                    similarity_score=round(score, 4),
                    explanation=explanation,
                )
            )
        return search_results

    async def upload_resume(self, file: UploadFile, candidate_id: Optional[uuid.UUID] = None) -> CandidateResponse:
        """Parse PDF/DOCX resume and create/update candidate."""
        content = await file.read()
        file_ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""

        if file_ext not in ["pdf", "docx", "txt"]:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        parsed = await self.parser.parse(content, file_ext)

        if candidate_id:
            candidate = await self.repo.get(candidate_id)
            if not candidate:
                raise HTTPException(status_code=404, detail="Candidate not found")
            update_data = {k: v for k, v in parsed.items() if v is not None}
            candidate = await self.repo.update(candidate, **update_data)
        else:
            candidate_data = CandidateCreate(
                full_name=parsed.get("full_name", "Unknown"),
                email=parsed.get("email"),
                phone=parsed.get("phone"),
                location=parsed.get("location"),
                current_company=parsed.get("current_company"),
                current_title=parsed.get("current_title"),
                years_experience=parsed.get("years_experience"),
                skills=parsed.get("skills", []),
                resume_text=parsed.get("resume_text", ""),
                source="resume_upload",
            )
            return await self.create_candidate(candidate_data)

        await self._generate_embedding(candidate)
        return CandidateResponse.model_validate(candidate)

    async def upload_csv(self, file: UploadFile) -> dict:
        """Bulk import candidates from CSV."""
        content = await file.read()
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))

        created = 0
        errors = []
        for i, row in enumerate(reader):
            try:
                skills = [s.strip() for s in row.get("skills", "").split(",") if s.strip()]
                candidate_data = CandidateCreate(
                    full_name=row.get("full_name", ""),
                    email=row.get("email") or None,
                    phone=row.get("phone") or None,
                    location=row.get("location") or None,
                    current_company=row.get("current_company") or None,
                    current_title=row.get("current_title") or None,
                    years_experience=int(row["years_experience"]) if row.get("years_experience") else None,
                    skills=skills,
                    linkedin_url=row.get("linkedin_url") or None,
                    source="csv_import",
                )
                await self.create_candidate(candidate_data)
                created += 1
            except Exception as e:
                errors.append({"row": i + 2, "error": str(e)})

        return {"created": created, "errors": errors, "total_rows": created + len(errors)}

    async def _generate_embedding(self, candidate: Candidate):
        """Generate and store embedding for a candidate."""
        text = self.embedding_svc.build_candidate_text(candidate)
        embedding = self.embedding_svc.generate(text)
        await self.repo.upsert_embedding(candidate.id, embedding)

    def _generate_explanation(self, candidate: Candidate, query: str, score: float) -> str:
        skills_match = []
        query_lower = query.lower()
        if candidate.skills:
            skills_match = [s for s in candidate.skills if s.lower() in query_lower]

        parts = [f"Similarity score: {score:.1%}."]
        if candidate.current_title:
            parts.append(f"Current role: {candidate.current_title}")
        if candidate.location and any(loc in query_lower for loc in [candidate.location.lower()]):
            parts.append(f"Located in {candidate.location}")
        if skills_match:
            parts.append(f"Matching skills: {', '.join(skills_match[:5])}")
        return " | ".join(parts)
