import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 - auto-refresh or logout
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token, user } = res.data;
          useAuthStore.getState().setAuth(access_token, refresh_token, user);
          original.headers.Authorization = `Bearer ${access_token}`;
          return api(original);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = "/login";
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─── API helpers ─────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { email: string; full_name: string; password: string; role?: string }) =>
    api.post("/auth/register", data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
};

export const candidatesApi = {
  list: (params?: { page?: number; page_size?: number; status?: string }) =>
    api.get("/candidates", { params }).then((r) => r.data),
  get: (id: string) => api.get(`/candidates/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post("/candidates", data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/candidates/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/candidates/${id}`),
  search: (query: string, top_k = 10) =>
    api.post("/candidates/search", { query, top_k }).then((r) => r.data),
  uploadResume: (file: File, candidateId?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (candidateId) form.append("candidate_id", candidateId);
    return api.post("/candidates/upload/resume", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
  uploadCsv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/candidates/upload/csv", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
};

export const jobsApi = {
  analyze: (text: string) =>
    api.post("/jobs/analyze", { text }).then((r) => r.data),
  create: (data: { title: string; raw_text: string; company_name?: string }) =>
    api.post("/jobs", data).then((r) => r.data),
  list: () => api.get("/jobs").then((r) => r.data),
  get: (id: string) => api.get(`/jobs/${id}`).then((r) => r.data),
  delete: (id: string) => api.delete(`/jobs/${id}`),
};

export const companyBrainApi = {
  upload: (file: File, category?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (category) form.append("category", category);
    return api.post("/company-brain/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
  chat: (message: string, sessionId?: string) =>
    api.post("/company-brain/chat", { message, session_id: sessionId }).then((r) => r.data),
  listDocuments: () => api.get("/company-brain/documents").then((r) => r.data),
  deleteDocument: (id: string) => api.delete(`/company-brain/documents/${id}`),
};

export const agentApi = {
  runWorkflow: (data: {
    job_description_id?: string;
    job_description_text?: string;
    top_k?: number;
  }) => api.post("/agent/workflow", data).then((r) => r.data),
  listRuns: () => api.get("/agent/runs").then((r) => r.data),
  getRun: (id: string) => api.get(`/agent/runs/${id}`).then((r) => r.data),
};

export const dashboardApi = {
  getMetrics: () => api.get("/dashboard/metrics").then((r) => r.data),
};

export const outreachApi = {
  generate: (data: {
    candidate_id: string;
    job_description_id?: string;
    job_description_text?: string;
    outreach_type?: string;
    tone?: string;
  }) => api.post("/outreach/generate", data).then((r) => r.data),
};

export const copilotApi = {
  chat: (message: string, sessionId?: string) =>
    api.post("/copilot/chat", { message, session_id: sessionId }).then((r) => r.data),
  listSessions: () => api.get("/copilot/sessions").then((r) => r.data),
  getMessages: (sessionId: string) =>
    api.get(`/copilot/sessions/${sessionId}/messages`).then((r) => r.data),
};

export const sqlApi = {
  query: (question: string) =>
    api.post("/sql/query", { question }).then((r) => r.data),
};
