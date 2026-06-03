"""Recruiter Copilot Chat - unified AI assistant route."""

import uuid
import json
import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from groq import Groq

from app.core.database import get_db
from app.api.deps import get_current_user
from app.repositories.chat_repository import ChatRepository
from app.repositories.candidate_repository import CandidateRepository
from app.services.candidate_service import CandidateService
from app.services.outreach_service import OutreachService
from app.schemas.chat import CopilotChatRequest, CopilotChatResponse
from app.schemas.candidate import CandidateSearchRequest
from app.models.chat import ChatSession, ChatMessage
from app.models.user import User
from app.core.config import settings

router = APIRouter(prefix="/copilot")
logger = structlog.get_logger()

SYSTEM_PROMPT = """You are the AI Executive Search Copilot - a powerful recruitment intelligence assistant.

You can help with:
1. Finding candidates - semantic search across the candidate database
2. Ranking candidates - evaluating and scoring candidates
3. Generating outreach - personalized emails and LinkedIn messages
4. Summarizing candidates - creating professional summaries
5. Answering recruitment questions - process, best practices, strategies

When a user asks to find candidates, search, or any recruitment task, respond with a JSON action:
{
  "intent": "search_candidates | generate_outreach | summarize | answer | rank",
  "action_data": {...},
  "response": "Your conversational response to the user"
}

For general questions, just respond normally without JSON.
Be concise, professional, and actionable."""


@router.post("/chat", response_model=CopilotChatResponse)
async def copilot_chat(
    request: CopilotChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recruiter Copilot - unified AI assistant.
    
    Examples:
    - "Find AI engineers in Dubai"
    - "Generate outreach for candidate {id}"
    - "Summarize candidate {name}"
    - "What is the best hiring process for VP Engineering?"
    """
    chat_repo = ChatRepository(db)
    groq_client = Groq(api_key=settings.GROQ_API_KEY)

    # Get or create session
    if request.session_id:
        session = await chat_repo.get(request.session_id)
        if not session:
            session = await _create_session(chat_repo, current_user.id)
    else:
        session = await _create_session(chat_repo, current_user.id)

    # Get conversation history
    history = await chat_repo.get_messages(session.id, limit=10)

    # Build messages
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history[-6:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.message})

    # Get AI response
    response = groq_client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        temperature=0.5,
        max_tokens=1200,
    )
    ai_content = response.choices[0].message.content

    # Parse intent and handle actions
    intent = None
    action_data = {}
    final_response = ai_content

    try:
        if "{" in ai_content and '"intent"' in ai_content:
            # Try to parse JSON response
            json_start = ai_content.index("{")
            json_end = ai_content.rindex("}") + 1
            parsed = json.loads(ai_content[json_start:json_end])
            intent = parsed.get("intent")
            action_data = parsed.get("action_data", {})
            final_response = parsed.get("response", ai_content)

            # Execute intent action
            if intent == "search_candidates":
                query = action_data.get("query", request.message)
                candidate_svc = CandidateService(db)
                results = await candidate_svc.semantic_search(
                    CandidateSearchRequest(query=query, top_k=5)
                )
                action_data["results"] = [
                    {
                        "name": r.candidate.full_name,
                        "title": r.candidate.current_title,
                        "company": r.candidate.current_company,
                        "score": r.similarity_score,
                    }
                    for r in results
                ]
                if results:
                    final_response += f"\n\nFound {len(results)} matching candidates."

    except (json.JSONDecodeError, ValueError):
        pass  # Use raw response

    # Save messages
    user_msg = ChatMessage(session_id=session.id, role="user", content=request.message)
    ai_msg = ChatMessage(session_id=session.id, role="assistant", content=final_response)
    await chat_repo.add_message(user_msg)
    await chat_repo.add_message(ai_msg)

    return CopilotChatResponse(
        response=final_response,
        session_id=session.id,
        intent=intent,
        data=action_data if action_data else None,
    )


@router.get("/sessions")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List copilot chat sessions for current user."""
    chat_repo = ChatRepository(db)
    sessions = await chat_repo.get_sessions_by_user(current_user.id, session_type="copilot")
    return sessions


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all messages in a copilot chat session."""
    chat_repo = ChatRepository(db)
    return await chat_repo.get_messages(session_id)


async def _create_session(chat_repo: ChatRepository, user_id: uuid.UUID) -> ChatSession:
    session = ChatSession(user_id=user_id, session_type="copilot")
    return await chat_repo.create(session)
