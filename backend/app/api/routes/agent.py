"""Multi-agent recruitment workflow routes."""

import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user, require_write
from app.agents.workflow import RecruitmentWorkflow
from app.models.agent_run import AgentRun
from app.schemas.agent import AgentWorkflowRequest, AgentWorkflowResponse, AgentRunResponse
from app.models.user import User

router = APIRouter(prefix="/agent")


@router.post("/workflow", response_model=AgentWorkflowResponse)
async def run_workflow(
    request: AgentWorkflowRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_write),
):
    """
    Run the full 4-agent recruitment workflow:
    1. Requirement Analysis Agent
    2. Candidate Search Agent  
    3. Candidate Evaluation Agent
    4. Outreach Agent
    """
    workflow = RecruitmentWorkflow(db)
    return await workflow.run(request, current_user.id)


@router.get("/runs", response_model=list)
async def list_agent_runs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List recent agent workflow runs."""
    result = await db.execute(
        select(AgentRun)
        .where(AgentRun.user_id == current_user.id)
        .order_by(AgentRun.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    runs = result.scalars().all()
    return [AgentRunResponse.model_validate(r) for r in runs]


@router.get("/runs/{run_id}", response_model=AgentRunResponse)
async def get_agent_run(
    run_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details of a specific agent run including execution trace."""
    result = await db.execute(select(AgentRun).where(AgentRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Agent run not found")
    return AgentRunResponse.model_validate(run)
