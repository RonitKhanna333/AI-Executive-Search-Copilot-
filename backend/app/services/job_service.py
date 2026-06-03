"""Job Description analysis service using Groq."""

import json
import uuid
import structlog
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from groq import Groq

from app.repositories.job_repository import JobRepository
from app.models.job_description import JobDescription
from app.schemas.job_description import JobDescriptionCreate, JobDescriptionResponse, JobAnalysisResult
from app.core.config import settings

logger = structlog.get_logger()

JD_ANALYSIS_PROMPT = """Analyze the following job description and extract structured information.
Return ONLY valid JSON matching exactly this schema:
{{
  "role": "string - job title/role",
  "seniority": "string - e.g. Junior/Mid/Senior/Staff/Principal/VP/C-level",
  "required_skills": ["list of required technical skills"],
  "preferred_skills": ["list of nice-to-have skills"],
  "years_experience": integer or null,
  "location": "string or null",
  "industry": "string or null",
  "keywords": ["important keywords for search"],
  "salary_range": {{"min": number, "max": number, "currency": "string"}} or null
}}

Job Description:
{jd_text}"""


class JobService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = JobRepository(db)
        self.client = Groq(api_key=settings.GROQ_API_KEY)

    async def analyze_and_create(self, data: JobDescriptionCreate) -> JobDescriptionResponse:
        """Analyze JD with AI and store result."""
        analysis = await self._analyze_jd(data.raw_text)

        jd = JobDescription(
            title=data.title,
            raw_text=data.raw_text,
            company_name=data.company_name,
            role=analysis.role,
            seniority=analysis.seniority,
            required_skills=analysis.required_skills,
            preferred_skills=analysis.preferred_skills,
            years_experience=analysis.years_experience,
            location=analysis.location,
            industry=analysis.industry,
            keywords=analysis.keywords,
            salary_range=analysis.salary_range,
        )
        jd = await self.repo.create(jd)
        logger.info("Job description analyzed", jd_id=str(jd.id))
        return JobDescriptionResponse.model_validate(jd)

    async def analyze_jd_only(self, text: str) -> JobAnalysisResult:
        """Analyze JD text without saving to DB."""
        return await self._analyze_jd(text)

    async def get_job(self, job_id: uuid.UUID) -> JobDescriptionResponse:
        jd = await self.repo.get(job_id)
        if not jd:
            raise HTTPException(status_code=404, detail="Job description not found")
        return JobDescriptionResponse.model_validate(jd)

    async def list_jobs(self, skip: int = 0, limit: int = 50) -> list:
        jobs = await self.repo.get_all(skip=skip, limit=limit)
        return [JobDescriptionResponse.model_validate(j) for j in jobs]

    async def delete_job(self, job_id: uuid.UUID) -> bool:
        deleted = await self.repo.delete(job_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Job not found")
        return True

    async def _analyze_jd(self, jd_text: str) -> JobAnalysisResult:
        """Use Groq to extract structured data from job description."""
        try:
            response = self.client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert recruiter AI. Extract structured information from job descriptions. Return only valid JSON.",
                    },
                    {
                        "role": "user",
                        "content": JD_ANALYSIS_PROMPT.format(jd_text=jd_text[:4000]),
                    },
                ],
                temperature=0.1,
                max_tokens=1000,
            )

            content = response.choices[0].message.content.strip()
            # Strip markdown code block if present
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            data = json.loads(content)
            return JobAnalysisResult(**data)

        except json.JSONDecodeError as e:
            logger.error("JD analysis JSON parse error", error=str(e))
            # Return minimal fallback
            return JobAnalysisResult(
                role="Unknown",
                seniority="Mid",
                required_skills=[],
                preferred_skills=[],
                keywords=[],
            )
        except Exception as e:
            logger.error("JD analysis failed", error=str(e))
            raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")
