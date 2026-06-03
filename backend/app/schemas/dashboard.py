"""Dashboard schemas."""

from typing import List, Optional
from pydantic import BaseModel


class MetricResponse(BaseModel):
    name: str
    value: float
    change: Optional[float] = None
    change_percent: Optional[float] = None


class RecruitmentMetrics(BaseModel):
    total_candidates: int
    active_candidates: int
    interviews_scheduled: int
    hires_completed: int
    candidates_added_this_month: int


class AIMetrics(BaseModel):
    ai_searches_executed: int
    outreach_generated: int
    documents_indexed: int
    agent_runs_total: int


class BusinessMetrics(BaseModel):
    response_rate: float
    interview_conversion_rate: float
    time_to_fill_days: float


class ChartDataPoint(BaseModel):
    label: str
    value: float


class DashboardMetricsResponse(BaseModel):
    recruitment: RecruitmentMetrics
    ai: AIMetrics
    business: BusinessMetrics
    candidates_by_status: List[ChartDataPoint]
    candidates_over_time: List[ChartDataPoint]
    top_skills: List[ChartDataPoint]
