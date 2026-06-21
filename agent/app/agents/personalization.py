"""Personalization specialist: profile + recipient + level -> EmailDraft.

High-personalization writing benefits from a stronger model (the default), but the
caller can choose any OpenRouter model. The three levels produce visibly different
output, per the spec.
"""

from __future__ import annotations

from ..config import get_settings
from ..llm import build_model, generate_structured
from ..schemas import EmailDraft, PersonalizationLevel, Recipient, StructuredProfile

LEVEL_GUIDANCE: dict[PersonalizationLevel, str] = {
    PersonalizationLevel.low: (
        "LOW personalization: a clean, professional template. Use the recipient's name "
        "and organization, and one line about the sender's background. Keep it generic "
        "enough to reuse; do not reference the recipient's specific work."
    ),
    PersonalizationLevel.medium: (
        "MEDIUM personalization: tailor to the recipient's role and organization and the "
        "sender's most relevant 1-2 strengths. Reference the recipient's general area of "
        "work if available, but you need not cite specifics."
    ),
    PersonalizationLevel.high: (
        "HIGH personalization: reference the recipient's SPECIFIC work (from their work "
        "summary) and articulate concretely how the sender's background, skills, and "
        "notable work align with it. This should read as if written by hand for this one "
        "person. If the recipient's work summary is missing, personalize as deeply as the "
        "available facts allow without fabricating."
    ),
}

SYSTEM_PROMPT = (
    "You are an expert cold-outreach copywriter for students and early-career "
    "professionals. Write a single, genuine outreach email that earns a reply.\n\n"
    "Hard rules:\n"
    "- Be specific and concise. Short paragraphs. Plain-text-leaning; no HTML, no images.\n"
    "- A clear, non-spammy subject line. Avoid ALL CAPS, excessive punctuation, and "
    "phrases like 'guaranteed', 'free', 'act now'.\n"
    "- One clear, low-friction ask (e.g. a brief call or a pointer), not a hard sell.\n"
    "- Never fabricate facts about the sender or recipient. Only use what is provided.\n"
    "- Do not include tracking links. Keep links to those in the sender's profile if relevant.\n"
    "- Sign off with the sender's name. Leave attachment mentions natural if relevant "
    "(the platform attaches the resume separately)."
)


def _facts_block(profile: StructuredProfile, recipient: Recipient) -> str:
    return (
        "SENDER PROFILE (JSON):\n"
        f"{profile.model_dump_json(indent=2, exclude_none=True)}\n\n"
        "RECIPIENT (JSON):\n"
        f"{recipient.model_dump_json(indent=2, exclude_none=True)}"
    )


def generate_email(
    profile: StructuredProfile,
    recipient: Recipient,
    level: PersonalizationLevel = PersonalizationLevel.medium,
    model: str | None = None,
    extra_instructions: str | None = None,
) -> EmailDraft:
    settings = get_settings()
    # Lower temperature for low/medium (more template-like), a touch higher for high.
    temperature = 0.7 if level == PersonalizationLevel.high else 0.5
    llm = build_model(model, settings.default_personalization_model, temperature=temperature)

    user = (
        f"{LEVEL_GUIDANCE[level]}\n\n"
        f"{_facts_block(profile, recipient)}"
    )
    if extra_instructions:
        user += f"\n\nADDITIONAL INSTRUCTIONS FROM THE SENDER:\n{extra_instructions}"

    return generate_structured(llm, system=SYSTEM_PROMPT, user=user, schema=EmailDraft)
