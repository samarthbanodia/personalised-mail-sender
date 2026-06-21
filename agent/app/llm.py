"""OpenRouter-backed LLM access.

Everything is model-agnostic: callers pass an OpenRouter model id (e.g.
``openai/gpt-4o-mini`` or ``anthropic/claude-3.5-sonnet``) and we route it through
OpenRouter via a LangChain ``ChatOpenAI`` client pointed at the OpenRouter base URL.

``generate_structured`` does provider-agnostic structured extraction: it asks the
model for JSON matching a Pydantic schema, then parses + validates with one repair
retry. This works across all OpenRouter models, including those without native
function-calling/JSON-mode support.
"""

from __future__ import annotations

import json
import re
from typing import TypeVar

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, ValidationError

from .config import get_settings

T = TypeVar("T", bound=BaseModel)


class LLMNotConfiguredError(RuntimeError):
    """Raised when no OpenRouter API key is available."""


def build_model(model: str | None, default: str, *, temperature: float = 0.4) -> ChatOpenAI:
    settings = get_settings()
    if not settings.openrouter_api_key:
        raise LLMNotConfiguredError(
            "OPENROUTER_API_KEY is not set. Add it to agent/.env (see .env.example)."
        )
    return ChatOpenAI(
        model=model or default,
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
        temperature=temperature,
        timeout=settings.request_timeout_seconds,
        default_headers={
            "HTTP-Referer": settings.app_referer,
            "X-Title": settings.app_title,
        },
    )


def _extract_json(text: str) -> str:
    """Pull the first JSON object out of a model response (handles code fences)."""
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        return fenced.group(1)
    # Fall back to the outermost balanced braces.
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    return text


def generate_structured(
    llm: ChatOpenAI,
    *,
    system: str,
    user: str,
    schema: type[T],
    max_repair_retries: int = 1,
) -> T:
    """Generate an instance of ``schema`` from the model, validating the JSON."""
    schema_json = json.dumps(schema.model_json_schema(), indent=2)
    instruction = (
        f"{system}\n\n"
        "Respond with a SINGLE JSON object and nothing else — no prose, no code fences. "
        "It must conform to this JSON Schema:\n"
        f"{schema_json}\n"
        "Omit unknown fields or use null; never invent facts."
    )

    messages = [SystemMessage(content=instruction), HumanMessage(content=user)]
    last_error: Exception | None = None

    for _ in range(max_repair_retries + 1):
        response = llm.invoke(messages)
        raw = response.content if isinstance(response.content, str) else str(response.content)
        try:
            data = json.loads(_extract_json(raw))
            return schema.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as err:
            last_error = err
            messages.append(response)
            messages.append(
                HumanMessage(
                    content=(
                        "That was not valid JSON for the schema. Error:\n"
                        f"{err}\n\nReturn ONLY the corrected JSON object."
                    )
                )
            )

    raise ValueError(f"Model did not return schema-valid JSON: {last_error}")
