"""Schema validation tests — no network/LLM required."""

from app.schemas import (
    EmailDraft,
    PersonalizationLevel,
    Recipient,
    StructuredProfile,
    VerificationStatus,
)


def test_structured_profile_defaults_are_empty():
    profile = StructuredProfile()
    assert profile.name is None
    assert profile.skills == []
    assert profile.education == []


def test_structured_profile_parses_nested():
    profile = StructuredProfile.model_validate(
        {
            "name": "Ada Lovelace",
            "skills": ["math", "computing"],
            "education": [{"institution": "X", "degree": "BSc"}],
            "notable_work": ["First algorithm"],
        }
    )
    assert profile.name == "Ada Lovelace"
    assert profile.education[0].institution == "X"
    assert "computing" in profile.skills


def test_recipient_defaults_verification_status():
    r = Recipient(name="Dr. Smith", org="MIT")
    assert r.verification_status == VerificationStatus.unverified


def test_email_draft_requires_fields():
    draft = EmailDraft(subject="Hello", body="World")
    assert draft.subject == "Hello"


def test_personalization_level_enum():
    assert PersonalizationLevel("high") == PersonalizationLevel.high


def test_schemas_emit_json_schema():
    # generate_structured depends on this not throwing.
    assert "properties" in StructuredProfile.model_json_schema()
    assert "properties" in EmailDraft.model_json_schema()
