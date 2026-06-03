"""AI Executive Search Copilot - Main Application Entry Point"""

import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import engine, Base
from app.core.logging import setup_logging
from app.api.routes import (
    auth,
    candidates,
    jobs,
    company_brain,
    agent,
    dashboard,
    outreach,
    sql_query,
    copilot,
)

setup_logging()
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - startup and shutdown events."""
    logger.info("Starting AI Executive Search Copilot", version="1.0.0")
    # Create upload directories
    os.makedirs("uploads/resumes", exist_ok=True)
    os.makedirs("uploads/documents", exist_ok=True)
    yield
    logger.info("Shutting down AI Executive Search Copilot")


app = FastAPI(
    title="AI Executive Search Copilot",
    description="Production-grade AI-powered recruitment intelligence platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Routers
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX, tags=["Authentication"])
app.include_router(candidates.router, prefix=API_PREFIX, tags=["Candidates"])
app.include_router(jobs.router, prefix=API_PREFIX, tags=["Job Descriptions"])
app.include_router(company_brain.router, prefix=API_PREFIX, tags=["Company Brain"])
app.include_router(agent.router, prefix=API_PREFIX, tags=["Agent Workflow"])
app.include_router(dashboard.router, prefix=API_PREFIX, tags=["Dashboard"])
app.include_router(outreach.router, prefix=API_PREFIX, tags=["Outreach"])
app.include_router(sql_query.router, prefix=API_PREFIX, tags=["SQL Query"])
app.include_router(copilot.router, prefix=API_PREFIX, tags=["Recruiter Copilot"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "AI Executive Search Copilot", "version": "1.0.0"}


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "AI Executive Search Copilot API",
        "docs": "/docs",
        "health": "/health",
    }
