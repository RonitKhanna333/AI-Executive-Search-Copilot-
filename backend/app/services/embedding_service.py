"""Embedding generation service using SentenceTransformers."""

import structlog
from functools import lru_cache
from typing import List
from sentence_transformers import SentenceTransformer
from app.core.config import settings

logger = structlog.get_logger()


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    """Load embedding model once and cache it."""
    logger.info("Loading embedding model", model=settings.EMBEDDING_MODEL)
    return SentenceTransformer(settings.EMBEDDING_MODEL)


class EmbeddingService:
    """Service for generating text embeddings."""

    def __init__(self):
        self.model = get_model()

    def generate(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        if not text or not text.strip():
            return [0.0] * settings.EMBEDDING_DIMENSION
        embedding = self.model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
        return embedding.tolist()

    def generate_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts efficiently."""
        if not texts:
            return []
        embeddings = self.model.encode(
            texts, convert_to_numpy=True, normalize_embeddings=True, batch_size=32
        )
        return embeddings.tolist()

    def build_candidate_text(self, candidate) -> str:
        """Build searchable text from candidate profile."""
        parts = []
        if candidate.full_name:
            parts.append(candidate.full_name)
        if candidate.current_title:
            parts.append(candidate.current_title)
        if candidate.current_company:
            parts.append(f"at {candidate.current_company}")
        if candidate.location:
            parts.append(f"based in {candidate.location}")
        if candidate.skills:
            parts.append(f"Skills: {', '.join(candidate.skills)}")
        if candidate.years_experience:
            parts.append(f"{candidate.years_experience} years experience")
        if candidate.candidate_summary:
            parts.append(candidate.candidate_summary)
        if candidate.resume_text:
            # Truncate resume to avoid token limits
            parts.append(candidate.resume_text[:2000])
        return " | ".join(parts)
