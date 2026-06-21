"""FastAPI entrypoint for the agent service.

Endpoints (Milestone 1):
  GET  /health           - liveness + capability report
  POST /resume/analyze   - resume file (or raw text) -> structured profile
  POST /email/generate   - profile + recipient + level -> personalized draft
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .agents import analyze_resume, generate_email
from .agents.orchestrator import deepagents_available
from .config import get_settings
from .llm import LLMNotConfiguredError
from .resume import ResumeExtractionError, extract_text
from .schemas import (
    EmailGenerateRequest,
    EmailGenerateResponse,
    HealthResponse,
    ResumeAnalyzeResponse,
)

logger = logging.getLogger("mailer.agent")

settings = get_settings()
app = FastAPI(title=settings.app_title + " — Agent", version=__version__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=__version__,
        openrouter_configured=bool(settings.openrouter_api_key),
        deepagents_available=deepagents_available(),
    )


@app.post("/resume/analyze", response_model=ResumeAnalyzeResponse)
async def resume_analyze(
    file: Annotated[UploadFile | None, File()] = None,
    text: Annotated[str | None, Form()] = None,
    model: Annotated[str | None, Form()] = None,
) -> ResumeAnalyzeResponse:
    """Analyze a resume. Provide either an uploaded ``file`` or raw ``text``."""
    if file is not None:
        try:
            data = await file.read()
            resume_text = extract_text(data, file.filename, file.content_type)
        except ResumeExtractionError as err:
            raise HTTPException(status_code=422, detail=str(err)) from err
    elif text and text.strip():
        resume_text = text.strip()
    else:
        raise HTTPException(status_code=422, detail="Provide a resume `file` or `text`.")

    try:
        profile = analyze_resume(resume_text, model=model)
    except LLMNotConfiguredError as err:
        raise HTTPException(status_code=503, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=502, detail=f"Analysis failed: {err}") from err

    used_model = model or settings.default_resume_model
    return ResumeAnalyzeResponse(profile=profile, model=used_model)


@app.post("/email/generate", response_model=EmailGenerateResponse)
def email_generate(req: EmailGenerateRequest) -> EmailGenerateResponse:
    try:
        draft = generate_email(
            req.profile,
            req.recipient,
            level=req.level,
            model=req.model,
            extra_instructions=req.extra_instructions,
        )
    except LLMNotConfiguredError as err:
        raise HTTPException(status_code=503, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=502, detail=f"Generation failed: {err}") from err

    used_model = req.model or settings.default_personalization_model
    return EmailGenerateResponse(
        subject=draft.subject,
        body=draft.body,
        level=req.level,
        model=used_model,
    )
