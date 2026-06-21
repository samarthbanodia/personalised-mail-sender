"""Structured-generation tests using a fake LLM (no network)."""

from types import SimpleNamespace

import pytest

from app.llm import _extract_json, generate_structured
from app.schemas import EmailDraft


class FakeLLM:
    """Returns queued responses; mimics ChatOpenAI.invoke -> message.content."""

    def __init__(self, contents):
        self._contents = list(contents)

    def invoke(self, _messages):
        return SimpleNamespace(content=self._contents.pop(0))


def test_extract_json_handles_code_fence():
    raw = 'Sure!\n```json\n{"subject": "Hi", "body": "there"}\n```\nthanks'
    assert '"subject"' in _extract_json(raw)


def test_extract_json_handles_bare_object():
    raw = 'prefix {"subject": "Hi", "body": "there"} suffix'
    assert _extract_json(raw).strip().startswith("{")


def test_generate_structured_parses_valid_json():
    llm = FakeLLM(['{"subject": "Hello", "body": "World"}'])
    out = generate_structured(llm, system="s", user="u", schema=EmailDraft)
    assert isinstance(out, EmailDraft)
    assert out.subject == "Hello"


def test_generate_structured_repairs_then_succeeds():
    llm = FakeLLM(["not json at all", '{"subject": "Fixed", "body": "B"}'])
    out = generate_structured(llm, system="s", user="u", schema=EmailDraft)
    assert out.subject == "Fixed"


def test_generate_structured_gives_up_after_retries():
    llm = FakeLLM(["nope", "still nope"])
    with pytest.raises(ValueError):
        generate_structured(llm, system="s", user="u", schema=EmailDraft, max_repair_retries=1)
