"""Endpoint tests via FastAPI TestClient (no network/LLM)."""

from fastapi.testclient import TestClient

from app import main
from app.main import app
from app.schemas import StructuredProfile

client = TestClient(app)


def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "openrouter_configured" in body
    assert "deepagents_available" in body


def test_resume_analyze_requires_input():
    resp = client.post("/resume/analyze")
    assert resp.status_code == 422


def test_resume_analyze_with_text(monkeypatch):
    monkeypatch.setattr(
        main, "analyze_resume", lambda text, model=None: StructuredProfile(name="Test User")
    )
    resp = client.post("/resume/analyze", data={"text": "Some resume text"})
    assert resp.status_code == 200
    assert resp.json()["profile"]["name"] == "Test User"


def test_email_generate_without_key_returns_503():
    # No OPENROUTER_API_KEY in the test environment -> build_model raises -> 503.
    payload = {
        "profile": {"name": "A"},
        "recipient": {"name": "Dr. B", "org": "MIT"},
        "level": "high",
    }
    resp = client.post("/email/generate", json=payload)
    assert resp.status_code in (502, 503)
