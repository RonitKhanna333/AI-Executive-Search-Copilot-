"""Application configuration using Pydantic Settings."""

from typing import List
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Executive Search Copilot"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "supersecretkey-change-in-production-minimum-32-characters"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://aesc_user:aesc_password@localhost:5432/aesc_db"
    SYNC_DATABASE_URL: str = "postgresql://aesc_user:aesc_password@localhost:5432/aesc_db"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # AI
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama3-70b-8192"
    GROQ_FAST_MODEL: str = "llama3-8b-8192"

    # Embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384

    # RAG
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    TOP_K_RETRIEVAL: int = 5

    # File uploads
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_RESUME_EXTENSIONS: List[str] = [".pdf", ".docx", ".txt"]
    ALLOWED_DOCUMENT_EXTENSIONS: List[str] = [".pdf", ".docx", ".txt", ".md"]

    # Optional integrations
    GMAIL_CLIENT_ID: str = ""
    GMAIL_CLIENT_SECRET: str = ""
    SLACK_BOT_TOKEN: str = ""
    NOTION_API_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
