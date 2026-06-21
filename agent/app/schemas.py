"""Pydantic schemas: the structured profile, the canonical recipient schema, and
the request/response models for the agent endpoints.

The recipient schema is defined in full now (per the spec) even though Milestone 1
only uses single, manually-entered recipients — later milestones (DB upload, schema
mapping, verification, scheduling) inherit it unchanged.
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Structured profile (output of the Resume Analyzer)
# ---------------------------------------------------------------------------
class EducationItem(BaseModel):
    institution: str | None = None
    degree: str | None = None
    field: str | None = None
    year: str | None = None


class ExperienceItem(BaseModel):
    organization: str | None = None
    title: str | None = None
    duration: str | None = None
    summary: str | None = None


class StructuredProfile(BaseModel):
    """The resume distilled into structure used to drive personalization."""

    name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    headline: str | None = Field(default=None, description="One-line professional summary")
    summary: str | None = Field(default=None, description="2-3 sentence narrative summary")
    seniority: str | None = Field(
        default=None, description="e.g. undergrad / grad student / early-career / senior"
    )
    domains: list[str] = Field(default_factory=list, description="Fields/industries")
    skills: list[str] = Field(default_factory=list)
    research_interests: list[str] = Field(default_factory=list)
    notable_work: list[str] = Field(
        default_factory=list, description="Papers, projects, achievements worth referencing"
    )
    education: list[EducationItem] = Field(default_factory=list)
    experience: list[ExperienceItem] = Field(default_factory=list)
    links: list[str] = Field(default_factory=list, description="Portfolio, GitHub, Scholar, etc.")


# ---------------------------------------------------------------------------
# Canonical recipient schema
# ---------------------------------------------------------------------------
class VerificationStatus(StrEnum):
    unverified = "unverified"
    valid = "valid"
    risky = "risky"
    invalid = "invalid"


class Recipient(BaseModel):
    name: str | None = None
    role: str | None = None
    org: str | None = None
    email: str | None = None
    domain_category: str | None = Field(
        default=None, description="professor / company / university / b-school / other"
    )
    work_summary: str | None = Field(
        default=None, description="Recipient's research/work used for high personalization"
    )
    source: str | None = None
    verification_status: VerificationStatus = VerificationStatus.unverified
    timezone: str | None = None


# ---------------------------------------------------------------------------
# Personalization
# ---------------------------------------------------------------------------
class PersonalizationLevel(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class EmailDraft(BaseModel):
    subject: str = Field(description="Concise, specific subject line — no spammy phrasing")
    body: str = Field(description="Plain-text-leaning email body, ready to send")


# ---------------------------------------------------------------------------
# Endpoint request/response models
# ---------------------------------------------------------------------------
class ResumeAnalyzeResponse(BaseModel):
    profile: StructuredProfile
    model: str


class EmailGenerateRequest(BaseModel):
    profile: StructuredProfile
    recipient: Recipient
    level: PersonalizationLevel = PersonalizationLevel.medium
    model: str | None = Field(
        default=None, description="OpenRouter model id; falls back to default"
    )
    extra_instructions: str | None = Field(
        default=None, description="Optional user steering for tone/content"
    )


class EmailGenerateResponse(BaseModel):
    subject: str
    body: str
    level: PersonalizationLevel
    model: str


class HealthResponse(BaseModel):
    status: str
    version: str
    openrouter_configured: bool
    deepagents_available: bool
