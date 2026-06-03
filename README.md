# AI Executive Search Copilot

A production-grade, full-stack AI recruitment intelligence platform powered by Groq, LangGraph, pgvector, and React.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│  Login │ Dashboard │ Candidates │ Jobs │ Brain │ Chat │ Analytics│
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API (Axios + React Query)
┌───────────────────────────▼─────────────────────────────────────┐
│                    FastAPI Backend                               │
│  Auth │ Candidates │ Jobs │ CompanyBrain │ Agent │ SQL │ Copilot │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐│
│  │  Repository │  │   Services   │  │   LangGraph 4 Agents    ││
│  │   Pattern   │  │    Layer     │  │ Req→Search→Eval→Outreach ││
│  └─────────────┘  └──────────────┘  └─────────────────────────┘│
└───────────────────────────┬─────────────────────────────────────┘
                            │ SQLAlchemy async
┌───────────────────────────▼─────────────────────────────────────┐
│                   PostgreSQL + pgvector                          │
│  users │ candidates │ candidate_embeddings │ job_descriptions    │
│  documents │ document_chunks │ chat_sessions │ chat_messages     │
│  agent_runs │ dashboard_metrics                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, shadcn/ui, React Query, Recharts |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| Database | PostgreSQL 16 + pgvector (cosine similarity search) |
| AI / LLM | Groq API (llama3-70b-8192), SentenceTransformers |
| Agents | LangGraph (4-agent workflow) |
| Auth | JWT (access + refresh tokens), RBAC (admin/recruiter/viewer) |
| Deployment | Docker, Docker Compose |

---

## Features

| # | Feature | Status |
|---|---|---|
| 1 | Candidate Intelligence Database (semantic search) | ✅ |
| 2 | Job Description AI Analyzer | ✅ |
| 3 | Multi-Agent Recruitment Workflow (LangGraph) | ✅ |
| 4 | Company Brain RAG system | ✅ |
| 5 | Recruiter Copilot Chat | ✅ |
| 6 | Leadership Dashboard | ✅ |
| 7 | Natural Language → SQL | ✅ |
| 8 | Outreach Generator (email/LinkedIn/follow-up) | ✅ |
| 9 | REST API (9 feature areas) | ✅ |
| 10 | Database Schema (10 tables + pgvector) | ✅ |
| 11 | Full UI (8 pages) | ✅ |
| 12 | Clean Architecture + Tests + Docker | ✅ |

---

## Quick Start

### 1. Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- A free [Groq API key](https://console.groq.com)

### 2. Clone and configure

```bash
git clone <repo-url>
cd ai-executive-search-copilot

# Copy and edit environment variables
cp .env.example .env
```

Edit `.env`:
```env
GROQ_API_KEY=gsk_your_key_here
SECRET_KEY=any-random-32-character-string-here
POSTGRES_PASSWORD=choose_a_password
```

### 3. Start with Docker Compose

```bash
docker-compose up --build
```

First run takes ~3–5 minutes (downloads images, installs deps, downloads ML model).

### 4. Initialize the database

```bash
# In a second terminal, once containers are running:
docker exec aesc_backend alembic upgrade head
```

### 5. Access the application

| Service | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **API Docs (ReDoc)** | http://localhost:8000/redoc |
| **Health Check** | http://localhost:8000/health |

### 6. Create your first user

Via the UI at http://localhost:3000 — click "Sign up".

Or via the API:
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "full_name": "Admin User",
    "password": "yourpassword",
    "role": "admin"
  }'
```

---

## Local Development (without Docker)

### Backend

```bash
cd backend

python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

# Create .env with your local PostgreSQL details
cp ../.env.example .env

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # → http://localhost:5173
```

### Run tests

```bash
cd backend
pip install aiosqlite pytest-asyncio
pytest tests/ -v
```

---

## Project Structure

```
├── docker-compose.yml
├── .env.example
├── README.md
│
├── backend/
│   ├── main.py                      # FastAPI app entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── alembic/                     # Database migrations
│   │   ├── env.py
│   │   └── versions/001_initial_schema.py
│   └── app/
│       ├── core/
│       │   ├── config.py            # Pydantic Settings
│       │   ├── database.py          # Async SQLAlchemy engine
│       │   ├── security.py          # JWT + RBAC
│       │   └── logging.py           # Structured logging (structlog)
│       ├── models/                  # SQLAlchemy ORM models
│       │   ├── user.py
│       │   ├── candidate.py         # + CandidateEmbedding (pgvector)
│       │   ├── job_description.py
│       │   ├── document.py          # + DocumentChunk (pgvector)
│       │   ├── chat.py
│       │   ├── agent_run.py
│       │   └── dashboard.py
│       ├── schemas/                 # Pydantic request/response models
│       ├── repositories/            # Repository pattern (data access)
│       │   ├── base.py              # Generic CRUD BaseRepository
│       │   ├── candidate_repository.py
│       │   ├── document_repository.py
│       │   └── ...
│       ├── services/                # Business logic
│       │   ├── auth_service.py
│       │   ├── candidate_service.py
│       │   ├── embedding_service.py # SentenceTransformers
│       │   ├── job_service.py       # Groq JD analysis
│       │   ├── document_service.py  # RAG pipeline
│       │   ├── outreach_service.py  # Groq outreach generation
│       │   ├── dashboard_service.py
│       │   └── resume_parser.py     # PDF/DOCX parser
│       ├── agents/
│       │   └── workflow.py          # LangGraph 4-agent pipeline
│       └── api/routes/              # FastAPI routers
│           ├── auth.py
│           ├── candidates.py
│           ├── jobs.py
│           ├── company_brain.py
│           ├── agent.py
│           ├── dashboard.py
│           ├── outreach.py
│           ├── sql_query.py
│           └── copilot.py
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx                  # Router
│       ├── main.tsx
│       ├── types/index.ts           # TypeScript types
│       ├── lib/
│       │   ├── api.ts               # Axios API client (all endpoints)
│       │   └── utils.ts
│       ├── store/authStore.ts       # Zustand auth state
│       ├── hooks/useToast.ts
│       ├── components/
│       │   ├── layout/              # Sidebar, Header, Layout
│       │   ├── ui/                  # shadcn/ui primitives
│       │   └── common/              # StatCard, EmptyState, LoadingSpinner
│       └── pages/
│           ├── Login.tsx
│           ├── Dashboard.tsx        # Metrics + charts
│           ├── Candidates.tsx       # List + semantic search + CSV/resume upload
│           ├── CandidateDetail.tsx  # Profile + outreach generator
│           ├── JobAnalyzer.tsx      # JD analysis + 4-agent workflow
│           ├── CompanyBrain.tsx     # RAG chat interface
│           ├── RecruiterChat.tsx    # Unified AI copilot + NL-SQL
│           └── Analytics.tsx       # Full analytics with recharts
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/candidates` | Create candidate |
| GET | `/api/v1/candidates` | List candidates |
| GET | `/api/v1/candidates/{id}` | Get candidate |
| PATCH | `/api/v1/candidates/{id}` | Update candidate |
| DELETE | `/api/v1/candidates/{id}` | Delete candidate |
| POST | `/api/v1/candidates/search` | Semantic search |
| POST | `/api/v1/candidates/upload/resume` | Parse resume |
| POST | `/api/v1/candidates/upload/csv` | Bulk import |
| POST | `/api/v1/jobs/analyze` | Analyze JD (no save) |
| POST | `/api/v1/jobs` | Analyze + save JD |
| GET | `/api/v1/jobs` | List JDs |
| POST | `/api/v1/company-brain/upload` | Upload document |
| POST | `/api/v1/company-brain/chat` | RAG chat |
| GET | `/api/v1/company-brain/documents` | List documents |
| POST | `/api/v1/agent/workflow` | Run 4-agent workflow |
| GET | `/api/v1/agent/runs` | List agent runs |
| GET | `/api/v1/dashboard/metrics` | Dashboard metrics |
| POST | `/api/v1/outreach/generate` | Generate outreach |
| POST | `/api/v1/sql/query` | NL → SQL query |
| POST | `/api/v1/copilot/chat` | Copilot chat |

---

## User Roles

| Role | Permissions |
|---|---|
| `admin` | Full access — all operations |
| `recruiter` | Create/edit candidates, run workflows, generate outreach |
| `viewer` | Read-only access to all data |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ | Groq API key from console.groq.com |
| `SECRET_KEY` | ✅ | JWT signing secret (min 32 chars) |
| `POSTGRES_USER` | ✅ | PostgreSQL username |
| `POSTGRES_PASSWORD` | ✅ | PostgreSQL password |
| `POSTGRES_DB` | ✅ | Database name |
| `ENVIRONMENT` | ❌ | `development` or `production` |
| `ALLOWED_ORIGINS` | ❌ | Comma-separated CORS origins |
| `GROQ_MODEL` | ❌ | Groq model (default: `llama3-70b-8192`) |

---

## Stopping the application

```bash
docker-compose down          # Stop containers
docker-compose down -v       # Stop and remove all data volumes
```
