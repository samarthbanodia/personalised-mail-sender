"""Resume Analyzer specialist: resume text -> StructuredProfile.

A focused, mechanical extraction task — a cheap model is the sensible default. Never
invents facts; missing information stays null/empty.
"""

from __future__ import annotations

from ..config import get_settings
from ..llm import build_model, generate_structured
from ..schemas import StructuredProfile

SYSTEM_PROMPT = (
    "You are a meticulous resume analyst. Extract a structured professional profile "
    "from the resume text provided. Capture skills, research interests, domains, "
    "seniority, education, experience, and any notable work (papers, projects, "
    "achievements) that could be referenced in a personalized outreach email. "
    "Extract only what is present in the text. Do not infer, embellish, or fabricate."
)


def analyze_resume(resume_text: str, model: str | None = None) -> StructuredProfile:
    settings = get_settings()
    llm = build_model(model, settings.default_resume_model, temperature=0.1)
    return generate_structured(
        llm,
        system=SYSTEM_PROMPT,
        user=f"Resume text:\n\n{resume_text}",
        schema=StructuredProfile,
    )
