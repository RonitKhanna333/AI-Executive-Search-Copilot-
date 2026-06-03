"""LangGraph multi-agent recruitment workflow.

Agents:
  1. RequirementAnalysisAgent - extracts hiring requirements & search strategy
  2. CandidateSearchAgent     - queries DB and pgvector for candidates
  3. CandidateEvaluationAgent - scores each candidate against JD (0-100)
  4. OutreachAgent            - generates personalized outreach for top candidates
"""

import uuid
import json
import time
import structlog
from datetime import datetime, timezone
from typing import TypedDict, List, Optional, Annotated
from sqlalchemy.ext.asyncio import AsyncSession
from groq import Groq
from langgraph.graph import StateGraph, END

from app.core.config import settings
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.job_repository import JobRepository
from app.services.embedding_service import EmbeddingService
from app.models.agent_run import AgentRun
from app.schemas.agent import AgentWorkflowRequest, AgentWorkflowResponse, CandidateEvaluation

logger = structlog.get_logger()


# ─────────────────────────────────────────────
# State definition
# ─────────────────────────────────────────────

class WorkflowState(TypedDict):
    # Input
    job_description_text: str
    job_description_id: Optional[str]
    top_k: int

    # Agent 1 output
    requirements: Optional[dict]
    search_strategy: Optional[str]
    search_keywords: Optional[List[str]]

    # Agent 2 output
    candidate_ids: Optional[List[str]]
    candidates_data: Optional[List[dict]]

    # Agent 3 output
    evaluations: Optional[List[dict]]

    # Agent 4 output
    outreach_messages: Optional[dict]

    # Execution tracing
    steps: List[dict]
    errors: List[str]


# ─────────────────────────────────────────────
# Agent node functions
# ─────────────────────────────────────────────

def requirement_analysis_agent(state: WorkflowState, groq_client: Groq) -> WorkflowState:
    """Agent 1: Read JD, extract requirements, generate search strategy."""
    logger.info("Agent 1: Requirement Analysis starting")
    start = time.time()

    prompt = f"""Analyze this job description and extract hiring requirements.
    
Job Description:
{state['job_description_text'][:3000]}

Return JSON:
{{
  "requirements": {{
    "role": "string",
    "seniority": "string",
    "must_have_skills": ["skill1", "skill2"],
    "nice_to_have_skills": ["skill1"],
    "years_experience": number or null,
    "location": "string or null",
    "industry": "string"
  }},
  "search_strategy": "Brief explanation of how to find best candidates",
  "search_keywords": ["keyword1", "keyword2", "keyword3"]
}}"""

    try:
        response = groq_client.chat.completions.create(
            model=settings.GROQ_FAST_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert executive recruiter AI. Extract structured requirements from job descriptions."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=800,
        )
        content = response.choices[0].message.content.strip()
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        data = json.loads(content)
    except Exception as e:
        logger.error("Agent 1 failed", error=str(e))
        data = {
            "requirements": {"role": "Unknown", "seniority": "Mid", "must_have_skills": []},
            "search_strategy": "Search for candidates matching the job description",
            "search_keywords": [],
        }

    duration = time.time() - start
    state["requirements"] = data.get("requirements", {})
    state["search_strategy"] = data.get("search_strategy", "")
    state["search_keywords"] = data.get("search_keywords", [])
    state["steps"].append({
        "agent": "RequirementAnalysisAgent",
        "status": "completed",
        "duration_seconds": round(duration, 2),
        "output": {"requirements": state["requirements"]},
    })
    return state


def candidate_search_agent(state: WorkflowState, candidate_repo: CandidateRepository, embedding_svc: EmbeddingService) -> WorkflowState:
    """Agent 2: Query DB with semantic search using requirements."""
    logger.info("Agent 2: Candidate Search starting")
    start = time.time()
    # Build search query from requirements
    req = state.get("requirements", {})
    keywords = state.get("search_keywords", [])

    search_query = " ".join([
        req.get("role", ""),
        " ".join(req.get("must_have_skills", [])),
        " ".join(keywords),
        req.get("location", "") or "",
        f"{req.get('years_experience', '')} years experience" if req.get("years_experience") else "",
    ]).strip()

    return state, search_query  # Return partial - actual search done async


def candidate_evaluation_agent(state: WorkflowState, groq_client: Groq) -> WorkflowState:
    """Agent 3: Evaluate each candidate against JD."""
    logger.info("Agent 3: Candidate Evaluation starting")
    start = time.time()
    evaluations = []

    for candidate in state.get("candidates_data", []):
        eval_result = _evaluate_candidate(groq_client, candidate, state["job_description_text"])
        evaluations.append(eval_result)

    # Sort by score
    evaluations.sort(key=lambda x: x["score"], reverse=True)

    duration = time.time() - start
    state["evaluations"] = evaluations
    state["steps"].append({
        "agent": "CandidateEvaluationAgent",
        "status": "completed",
        "duration_seconds": round(duration, 2),
        "output": {"candidates_evaluated": len(evaluations)},
    })
    return state


def _evaluate_candidate(groq_client: Groq, candidate: dict, jd_text: str) -> dict:
    """Score a candidate against the job description."""
    prompt = f"""Evaluate this candidate against the job description.

Job Description Summary:
{jd_text[:1500]}

Candidate Profile:
- Name: {candidate.get('full_name')}
- Title: {candidate.get('current_title')} at {candidate.get('current_company')}
- Experience: {candidate.get('years_experience')} years
- Skills: {', '.join(candidate.get('skills') or [])}
- Location: {candidate.get('location')}
- Summary: {(candidate.get('candidate_summary') or '')[:500]}

Return JSON:
{{
  "score": <integer 0-100>,
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendation": "Strong Match / Good Match / Potential Match / Not Recommended"
}}"""

    try:
        response = groq_client.chat.completions.create(
            model=settings.GROQ_FAST_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert executive recruiter. Score candidates objectively."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=500,
        )
        content = response.choices[0].message.content.strip()
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        data = json.loads(content)
        data["candidate_id"] = candidate.get("id")
        data["candidate_name"] = candidate.get("full_name")
        return data
    except Exception as e:
        logger.warning("Candidate evaluation failed", error=str(e), candidate=candidate.get("full_name"))
        return {
            "candidate_id": candidate.get("id"),
            "candidate_name": candidate.get("full_name"),
            "score": 50,
            "strengths": ["Profile reviewed"],
            "weaknesses": ["Evaluation incomplete"],
            "recommendation": "Needs manual review",
        }


def outreach_agent(state: WorkflowState, groq_client: Groq) -> WorkflowState:
    """Agent 4: Generate personalized outreach for top 3 candidates."""
    logger.info("Agent 4: Outreach Generation starting")
    start = time.time()

    evaluations = state.get("evaluations", [])
    candidates = state.get("candidates_data", [])
    top_3 = evaluations[:3]

    candidate_map = {str(c["id"]): c for c in candidates}
    outreach_messages = {}

    for eval_item in top_3:
        candidate = candidate_map.get(str(eval_item.get("candidate_id")), {})
        if not candidate:
            continue

        prompt = f"""Generate a personalized cold email for executive recruitment.

Candidate: {candidate.get('full_name')}
Current Role: {candidate.get('current_title')} at {candidate.get('current_company')}
Skills: {', '.join((candidate.get('skills') or [])[:6])}
Match Score: {eval_item.get('score')}/100
Strengths: {', '.join(eval_item.get('strengths', [])[:2])}

Job Summary:
{state['job_description_text'][:800]}

Write a compelling, personalized email. Include subject line.
Format: Subject: [subject]\n\n[body]"""

        try:
            response = groq_client.chat.completions.create(
                model=settings.GROQ_FAST_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert executive recruiter. Write compelling personalized outreach."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=400,
            )
            outreach_messages[str(eval_item["candidate_id"])] = {
                "candidate_name": candidate.get("full_name"),
                "email": response.choices[0].message.content,
            }
        except Exception as e:
            logger.warning("Outreach generation failed", error=str(e))

    duration = time.time() - start
    state["outreach_messages"] = outreach_messages
    state["steps"].append({
        "agent": "OutreachAgent",
        "status": "completed",
        "duration_seconds": round(duration, 2),
        "output": {"outreach_generated": len(outreach_messages)},
    })
    return state


# ─────────────────────────────────────────────
# Workflow orchestrator
# ─────────────────────────────────────────────

class RecruitmentWorkflow:
    """Orchestrates the 4-agent LangGraph recruitment workflow."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.groq = Groq(api_key=settings.GROQ_API_KEY)
        self.candidate_repo = CandidateRepository(db)
        self.job_repo = JobRepository(db)
        self.embedding_svc = EmbeddingService()

    async def run(
        self, request: AgentWorkflowRequest, user_id: Optional[uuid.UUID] = None
    ) -> AgentWorkflowResponse:
        """Execute the full recruitment workflow."""
        run_start = time.time()
        run_id = uuid.uuid4()

        # Get JD text
        jd_text = request.job_description_text or ""
        if request.job_description_id and not jd_text:
            jd = await self.job_repo.get(request.job_description_id)
            if jd:
                jd_text = jd.raw_text

        if not jd_text:
            raise ValueError("Job description text is required")

        # Initialize state
        state: WorkflowState = {
            "job_description_text": jd_text,
            "job_description_id": str(request.job_description_id) if request.job_description_id else None,
            "top_k": request.top_k,
            "requirements": None,
            "search_strategy": None,
            "search_keywords": [],
            "candidate_ids": [],
            "candidates_data": [],
            "evaluations": [],
            "outreach_messages": {},
            "steps": [],
            "errors": [],
        }

        # Track in DB
        agent_run = AgentRun(
            id=run_id,
            user_id=user_id,
            workflow_type="recruitment_workflow",
            status="running",
            input_data={"jd_preview": jd_text[:200], "top_k": request.top_k},
        )
        self.db.add(agent_run)
        await self.db.flush()

        try:
            # Agent 1: Requirement Analysis
            state = requirement_analysis_agent(state, self.groq)

            # Agent 2: Candidate Search (async)
            search_query = " ".join([
                state["requirements"].get("role", ""),
                " ".join(state["requirements"].get("must_have_skills", [])),
                " ".join(state.get("search_keywords", [])),
            ])
            query_embedding = self.embedding_svc.generate(search_query)
            search_results = await self.candidate_repo.semantic_search(
                query_embedding, top_k=request.top_k
            )

            candidates_data = []
            for candidate, score in search_results:
                cdata = {
                    "id": str(candidate.id),
                    "full_name": candidate.full_name,
                    "email": candidate.email,
                    "current_title": candidate.current_title,
                    "current_company": candidate.current_company,
                    "location": candidate.location,
                    "years_experience": candidate.years_experience,
                    "skills": candidate.skills or [],
                    "candidate_summary": candidate.candidate_summary,
                    "similarity_score": score,
                }
                candidates_data.append(cdata)

            state["candidates_data"] = candidates_data
            state["steps"].append({
                "agent": "CandidateSearchAgent",
                "status": "completed",
                "output": {"candidates_found": len(candidates_data)},
            })

            # Agent 3: Evaluation
            state = candidate_evaluation_agent(state, self.groq)

            # Agent 4: Outreach
            state = outreach_agent(state, self.groq)

            # Build response
            evaluations = [
                CandidateEvaluation(
                    candidate_id=uuid.UUID(e["candidate_id"]) if e.get("candidate_id") else uuid.uuid4(),
                    candidate_name=e.get("candidate_name", "Unknown"),
                    score=e.get("score", 0),
                    strengths=e.get("strengths", []),
                    weaknesses=e.get("weaknesses", []),
                    recommendation=e.get("recommendation", ""),
                )
                for e in state["evaluations"]
            ]

            duration = time.time() - run_start

            # Update agent run
            agent_run.status = "completed"
            agent_run.output_data = {"evaluations_count": len(evaluations)}
            agent_run.steps = state["steps"]
            agent_run.duration_seconds = duration
            agent_run.completed_at = datetime.now(timezone.utc)
            await self.db.flush()

            return AgentWorkflowResponse(
                run_id=run_id,
                status="completed",
                requirements=state["requirements"],
                search_strategy=state.get("search_strategy"),
                candidates_found=len(candidates_data),
                evaluations=evaluations,
                top_candidate=evaluations[0] if evaluations else None,
                outreach_messages=state.get("outreach_messages"),
                duration_seconds=round(duration, 2),
            )

        except Exception as e:
            logger.error("Workflow failed", run_id=str(run_id), error=str(e))
            agent_run.status = "failed"
            agent_run.error_message = str(e)
            agent_run.completed_at = datetime.now(timezone.utc)
            await self.db.flush()
            raise
