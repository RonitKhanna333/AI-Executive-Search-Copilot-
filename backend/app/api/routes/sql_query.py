"""Natural Language to SQL query routes."""

import re
import json
import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from groq import Groq

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.sql_query import SQLQueryRequest, SQLQueryResponse
from app.core.config import settings
from app.models.user import User

router = APIRouter(prefix="/sql")
logger = structlog.get_logger()

# Schema context for Groq
DB_SCHEMA = """
Tables:
- candidates(id, full_name, email, phone, location, current_company, current_title, 
  years_experience, skills TEXT[], linkedin_url, github_url, resume_text, 
  candidate_summary, status, source, tags TEXT[], created_at, updated_at)
- job_descriptions(id, title, raw_text, role, seniority, required_skills TEXT[], 
  preferred_skills TEXT[], years_experience, location, industry, keywords TEXT[], 
  company_name, status, created_at)
- documents(id, title, file_name, file_type, category, chunk_count, status, created_at)
- agent_runs(id, workflow_type, status, duration_seconds, created_at)
- users(id, email, full_name, role, is_active, created_at)
"""

# Destructive SQL patterns to block
BLOCKED_PATTERNS = [
    r"\bDROP\b", r"\bDELETE\b", r"\bTRUNCATE\b", r"\bUPDATE\b",
    r"\bINSERT\b", r"\bALTER\b", r"\bCREATE\b", r"\bGRANT\b",
    r"\bREVOKE\b", r"\bEXECUTE\b", r"\b--\b",
]


def is_safe_sql(sql: str) -> bool:
    sql_upper = sql.upper()
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, sql_upper, re.IGNORECASE):
            return False
    return sql_upper.strip().startswith("SELECT")


@router.post("/query", response_model=SQLQueryResponse)
async def natural_language_query(
    request: SQLQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Convert natural language question to SQL and execute it.
    
    Examples:
    - "Show candidates added in the last 30 days"
    - "List candidates with more than 5 years experience"
    - "Which skills are most common among senior engineers?"
    """
    groq_client = Groq(api_key=settings.GROQ_API_KEY)

    prompt = f"""Convert this question to a PostgreSQL SELECT query.

Database Schema:
{DB_SCHEMA}

Rules:
- Only generate SELECT queries
- Use proper PostgreSQL syntax
- For array fields (skills, tags), use ANY() or = ANY()
- Limit results to 100 rows maximum
- Return ONLY the SQL query, nothing else

Question: {request.question}"""

    try:
        response = groq_client.chat.completions.create(
            model=settings.GROQ_FAST_MODEL,
            messages=[
                {"role": "system", "content": "You are a PostgreSQL expert. Generate safe SELECT queries only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=500,
        )
        
        sql = response.choices[0].message.content.strip()
        # Strip markdown if present
        if "```" in sql:
            sql = sql.split("```")[1]
            if sql.lower().startswith("sql"):
                sql = sql[3:]
        sql = sql.strip()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SQL generation failed: {str(e)}")

    # Security check
    if not is_safe_sql(sql):
        raise HTTPException(status_code=400, detail="Generated query is not a safe SELECT statement")

    # Execute query
    try:
        result = await db.execute(text(sql))
        rows = result.fetchall()
        columns = list(result.keys()) if rows else []
        data = [dict(zip(columns, row)) for row in rows]

        explanation = f"Found {len(data)} result(s) for: '{request.question}'"

        return SQLQueryResponse(
            question=request.question,
            generated_sql=sql,
            results=data,
            row_count=len(data),
            explanation=explanation,
            columns=columns,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")
