"""Specialist subagents for the planner-orchestrator.

Milestone 1 ships two specialists — the Resume Analyzer and the Personalization
agent. They are the source of truth for their tasks and are used both directly by
the API endpoints and as tools by the deepagents orchestrator (see orchestrator.py),
which later milestones route multi-step flows through.
"""

from .personalization import generate_email
from .resume_analyzer import analyze_resume

__all__ = ["analyze_resume", "generate_email"]
