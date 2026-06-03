// ─── Auth ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "recruiter" | "viewer";
  is_active: boolean;
  is_verified: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

// ─── Candidates ─────────────────────────────────────────────────────────────

export interface Candidate {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  location?: string;
  current_company?: string;
  current_title?: string;
  years_experience?: number;
  skills: string[];
  linkedin_url?: string;
  github_url?: string;
  education?: Record<string, unknown>;
  resume_text?: string;
  resume_file_path?: string;
  candidate_summary?: string;
  status: "active" | "inactive" | "interview" | "hired" | "rejected";
  source?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CandidateListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Candidate[];
}

export interface CandidateSearchResult {
  candidate: Candidate;
  similarity_score: number;
  explanation: string;
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export interface JobDescription {
  id: string;
  title: string;
  raw_text: string;
  role?: string;
  seniority?: string;
  required_skills: string[];
  preferred_skills: string[];
  years_experience?: number;
  location?: string;
  industry?: string;
  keywords: string[];
  salary_range?: { min: number; max: number; currency: string };
  company_name?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface JobAnalysisResult {
  role: string;
  seniority: string;
  required_skills: string[];
  preferred_skills: string[];
  years_experience?: number;
  location?: string;
  industry?: string;
  keywords: string[];
  salary_range?: { min: number; max: number; currency: string };
}

// ─── Company Brain ───────────────────────────────────────────────────────────

export interface Document {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  category?: string;
  chunk_count: number;
  status: "processing" | "indexed" | "failed";
  created_at: string;
}

export interface SourceCitation {
  document_id: string;
  document_title: string;
  chunk_content: string;
  relevance_score: number;
}

export interface CompanyBrainChatResponse {
  answer: string;
  sources: SourceCitation[];
  session_id: string;
}

// ─── Agent ───────────────────────────────────────────────────────────────────

export interface CandidateEvaluation {
  candidate_id: string;
  candidate_name: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface AgentWorkflowResponse {
  run_id: string;
  status: string;
  requirements?: Record<string, unknown>;
  search_strategy?: string;
  candidates_found: number;
  evaluations: CandidateEvaluation[];
  top_candidate?: CandidateEvaluation;
  outreach_messages?: Record<string, { candidate_name: string; email: string }>;
  duration_seconds?: number;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  recruitment: {
    total_candidates: number;
    active_candidates: number;
    interviews_scheduled: number;
    hires_completed: number;
    candidates_added_this_month: number;
  };
  ai: {
    ai_searches_executed: number;
    outreach_generated: number;
    documents_indexed: number;
    agent_runs_total: number;
  };
  business: {
    response_rate: number;
    interview_conversion_rate: number;
    time_to_fill_days: number;
  };
  candidates_by_status: Array<{ label: string; value: number }>;
  candidates_over_time: Array<{ label: string; value: number }>;
  top_skills: Array<{ label: string; value: number }>;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  sources?: SourceCitation[];
  created_at: string;
}

export interface CopilotChatResponse {
  response: string;
  session_id: string;
  intent?: string;
  data?: Record<string, unknown>;
}

// ─── Outreach ────────────────────────────────────────────────────────────────

export interface OutreachResponse {
  subject?: string;
  message: string;
  outreach_type: string;
  candidate_name: string;
  personalization_notes: string;
}
