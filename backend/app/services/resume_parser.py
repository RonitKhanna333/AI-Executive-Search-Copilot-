"""Resume parsing service - extracts structured data from PDF/DOCX."""

import re
import structlog
from typing import Optional
import pdfplumber
import docx
import io

logger = structlog.get_logger()

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}")
LINKEDIN_RE = re.compile(r"linkedin\.com/in/[\w-]+")
GITHUB_RE = re.compile(r"github\.com/[\w-]+")

COMMON_SKILLS = [
    "Python", "JavaScript", "TypeScript", "Java", "Go", "Rust", "C++", "C#",
    "React", "Vue", "Angular", "Node.js", "FastAPI", "Django", "Flask",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform",
    "Machine Learning", "Deep Learning", "NLP", "LLM", "RAG", "LangChain",
    "Vector Database", "pgvector", "Pinecone", "Weaviate",
    "Git", "CI/CD", "Agile", "Scrum", "REST API", "GraphQL",
    "SQL", "NoSQL", "Data Engineering", "MLOps", "DevOps",
]


class ResumeParser:
    """Parse resumes and extract structured candidate data."""

    async def parse(self, content: bytes, file_ext: str) -> dict:
        """Parse resume file and return structured data."""
        text = self._extract_text(content, file_ext)

        return {
            "resume_text": text,
            "email": self._extract_email(text),
            "phone": self._extract_phone(text),
            "linkedin_url": self._extract_linkedin(text),
            "github_url": self._extract_github(text),
            "skills": self._extract_skills(text),
            "full_name": self._extract_name(text),
            "location": self._extract_location(text),
            "current_title": self._extract_title(text),
            "years_experience": self._estimate_experience(text),
        }

    def _extract_text(self, content: bytes, file_ext: str) -> str:
        try:
            if file_ext == "pdf":
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    return "\n".join(
                        page.extract_text() or "" for page in pdf.pages
                    )
            elif file_ext == "docx":
                doc = docx.Document(io.BytesIO(content))
                return "\n".join(para.text for para in doc.paragraphs)
            else:
                return content.decode("utf-8", errors="replace")
        except Exception as e:
            logger.warning("Resume text extraction failed", error=str(e))
            return ""

    def _extract_email(self, text: str) -> Optional[str]:
        match = EMAIL_RE.search(text)
        return match.group(0).lower() if match else None

    def _extract_phone(self, text: str) -> Optional[str]:
        match = PHONE_RE.search(text)
        return match.group(0) if match else None

    def _extract_linkedin(self, text: str) -> Optional[str]:
        match = LINKEDIN_RE.search(text)
        return f"https://www.{match.group(0)}" if match else None

    def _extract_github(self, text: str) -> Optional[str]:
        match = GITHUB_RE.search(text)
        return f"https://{match.group(0)}" if match else None

    def _extract_skills(self, text: str) -> list:
        text_lower = text.lower()
        return [skill for skill in COMMON_SKILLS if skill.lower() in text_lower]

    def _extract_name(self, text: str) -> str:
        """Attempt to extract name from first line."""
        lines = [l.strip() for l in text.strip().split("\n") if l.strip()]
        if lines:
            first = lines[0]
            # If first line looks like a name (no special chars, short)
            if len(first) < 60 and not any(c in first for c in ["@", "http", "+"]):
                return first
        return "Unknown Candidate"

    def _extract_title(self, text: str) -> Optional[str]:
        title_keywords = [
            "Engineer", "Developer", "Manager", "Director", "Lead", "Architect",
            "Designer", "Analyst", "Scientist", "Consultant", "VP", "CTO", "CEO",
        ]
        lines = text.split("\n")[:20]
        for line in lines:
            line = line.strip()
            if any(kw in line for kw in title_keywords) and len(line) < 100:
                return line
        return None

    def _extract_location(self, text: str) -> Optional[str]:
        location_patterns = [
            r"(?:Location|Based in|Location:)\s*([A-Za-z\s,]+)",
            r"([A-Za-z\s]+,\s*(?:Singapore|USA|UK|India|UAE|Dubai|London|New York|San Francisco))",
        ]
        for pattern in location_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    def _estimate_experience(self, text: str) -> Optional[int]:
        patterns = [
            r"(\d+)\+?\s*years?\s+(?:of\s+)?experience",
            r"experience\s*:?\s*(\d+)\+?\s*years?",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return int(match.group(1))
        return None
