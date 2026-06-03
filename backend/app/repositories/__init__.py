from app.repositories.base import BaseRepository
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.job_repository import JobRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.chat_repository import ChatRepository
from app.repositories.user_repository import UserRepository

__all__ = [
    "BaseRepository",
    "CandidateRepository",
    "JobRepository",
    "DocumentRepository",
    "ChatRepository",
    "UserRepository",
]
