"""Planner-orchestrator scaffold (deepagents).

The spec calls for a planner-orchestrator with specialist subagents rather than one
mega-agent. Milestone 1's API endpoints call the specialists directly (fast,
deterministic, easy to validate), but the orchestrator below registers those same
specialists as deepagents subagents so later milestones — which need genuine
multi-step planning (curate -> verify -> personalize across a batch, schedule, etc.)
— can route through it without re-architecting.

The deepagents import is guarded so a missing/changed dependency never breaks the
core service; ``deepagents_available()`` reports status (surfaced at /health).
"""

from __future__ import annotations

from typing import Any

from ..config import get_settings
from ..llm import build_model
from ..schemas import PersonalizationLevel, Recipient, StructuredProfile
from .personalization import generate_email
from .resume_analyzer import analyze_resume

try:  # pragma: no cover - import guard
    from deepagents import create_deep_agent

    _DEEPAGENTS_IMPORT_ERROR: Exception | None = None
except Exception as err:  # noqa: BLE001
    create_deep_agent = None  # type: ignore[assignment]
    _DEEPAGENTS_IMPORT_ERROR = err


def deepagents_available() -> bool:
    return create_deep_agent is not None


ORCHESTRATOR_INSTRUCTIONS = (
    "You are the orchestrator for a personalized cold-outreach platform. Plan the work "
    "and delegate to specialist subagents: use 'resume-analyzer' to turn resume text into "
    "a structured profile, and 'personalization' to draft a tailored email for a recipient. "
    "Never fabricate facts; keep the human in the loop for final approval."
)


def build_orchestrator(model: str | None = None) -> Any:
    """Construct the deepagents planner-orchestrator wired to the M1 specialists.

    Returns a deep agent ready for ``.invoke(...)``. Raises if deepagents is missing.
    """
    if create_deep_agent is None:  # pragma: no cover
        raise RuntimeError(
            f"deepagents is not available: {_DEEPAGENTS_IMPORT_ERROR}. "
            "Install it (see requirements.txt) to use the orchestrator."
        )

    settings = get_settings()
    chat_model = build_model(model, settings.default_personalization_model)

    def analyze_resume_tool(resume_text: str) -> dict:
        """Extract a structured profile from resume text."""
        return analyze_resume(resume_text).model_dump()

    def generate_email_tool(profile: dict, recipient: dict, level: str = "medium") -> dict:
        """Draft a personalized outreach email for a recipient."""
        return generate_email(
            StructuredProfile.model_validate(profile),
            Recipient.model_validate(recipient),
            PersonalizationLevel(level),
        ).model_dump()

    subagents = [
        {
            "name": "resume-analyzer",
            "description": "Turns resume text into a structured profile.",
            "system_prompt": (
                "Extract an accurate structured profile from the provided resume text."
            ),
            "tools": [analyze_resume_tool],
        },
        {
            "name": "personalization",
            "description": "Drafts a personalized outreach email for one recipient.",
            "system_prompt": (
                "Write a genuine, specific outreach email using the sender profile "
                "and recipient."
            ),
            "tools": [generate_email_tool],
        },
    ]

    return create_deep_agent(
        model=chat_model,
        tools=[analyze_resume_tool, generate_email_tool],
        system_prompt=ORCHESTRATOR_INSTRUCTIONS,
        subagents=subagents,
    )
