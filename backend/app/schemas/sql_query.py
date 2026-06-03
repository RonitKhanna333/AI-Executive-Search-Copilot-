"""Natural Language to SQL schemas."""

from typing import Optional, List, Any
from pydantic import BaseModel


class SQLQueryRequest(BaseModel):
    question: str


class SQLQueryResponse(BaseModel):
    question: str
    generated_sql: str
    results: List[dict]
    row_count: int
    explanation: str
    columns: List[str]
