"""Outreach message generation service."""

import uuid
import structlog
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from groq import Groq

from app.repositories.candidate_repository import CandidateRepository
from app.repositories.job_repository import JobRepository
from app.schemas.outreach import OutreachRequest, OutreachResponse
from app.core.config import settings

logger = structlog.get_logger()

EMAIL_PROMPT = """Write a personalized cold recruitment email from a recruiter to a candidate.

Candidate Profile:
- Name: {name}
- Current Role: {current_title} at {current_company}
- Location: {location}
- Skills: {skills}
- Experience: {years_experience} years

Job Opportunity:
{job_info}

Requirements:
- Professional and personalized tone
- Reference specific skills that match
- Clear call to action
- Under 200 words
- Subject line included

Format:
Subject: [subject line here]

[email body]"""

LINKEDIN_PROMPT = """Write a personalized LinkedIn InMail message from a recruiter to a candidate.

Candidate Profile:
- Name: {name}  
- Current Role: {current_title} at {current_company}
- Skills: {skills}

Job Opportunity:
{job_info}

Requirements:
- Conversational, professional tone
- Mention a specific detail showing you reviewed their profile
- Under 150 words
- No subject line needed"""

FOLLOWUP_PROMPT = """Write a professional follow-up message for a recruitment outreach.

Candidate: {name}
Role: {current_title} at {current_company}
Job: {job_info}
Follow-up type: {outreach_type}

Requirements:
- Reference the initial outreach
- Add new value or urgency
- Under 100 words
- Professional tone"""


class OutreachService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.candidate_repo = CandidateRepository(db)
        self.job_repo = JobRepository(db)
        self.groq = Groq(api_key=settings.GROQ_API_KEY)

    async def generate(self, request: OutreachRequest) -> OutreachResponse:
        """Generate personalized outreach message."""
        candidate = await self.candidate_repo.get(request.candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        job_info = ""
        if request.job_description_id:
            jd = await self.job_repo.get(request.job_description_id)
            if jd:
                job_info = f"Role: {jd.title}\nRequired Skills: {', '.join(jd.required_skills or [])}\nSeniority: {jd.seniority}"
        elif request.job_description_text:
            job_info = request.job_description_text[:1000]
        else:
            job_info = "Executive search opportunity"

        params = {
            "name": candidate.full_name,
            "current_title": candidate.current_title or "Professional",
            "current_company": candidate.current_company or "their company",
            "location": candidate.location or "your area",
            "skills": ", ".join((candidate.skills or [])[:8]),
            "years_experience": candidate.years_experience or "several",
            "job_info": job_info,
            "outreach_type": request.outreach_type,
        }

        if request.outreach_type == "email":
            prompt = EMAIL_PROMPT.format(**params)
        elif request.outreach_type == "linkedin":
            prompt = LINKEDIN_PROMPT.format(**params)
        else:
            prompt = FOLLOWUP_PROMPT.format(**params)

        response = self.groq.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert executive recruiter. Write compelling, personalized outreach messages.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=600,
        )

        content = response.choices[0].message.content

        # Extract subject for emails
        subject = None
        message_body = content
        if request.outreach_type == "email" and "Subject:" in content:
            lines = content.split("\n")
            for i, line in enumerate(lines):
                if line.startswith("Subject:"):
                    subject = line.replace("Subject:", "").strip()
                    message_body = "\n".join(lines[i + 2:]).strip()
                    break

        return OutreachResponse(
            subject=subject,
            message=message_body,
            outreach_type=request.outreach_type,
            candidate_name=candidate.full_name,
            personalization_notes=f"Generated for {candidate.full_name} based on their {candidate.current_title} profile",
        )
