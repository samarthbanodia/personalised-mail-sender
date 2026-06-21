"""Resume text extraction from uploaded files (PDF / DOCX / plain text)."""

from __future__ import annotations

import io


class ResumeExtractionError(ValueError):
    """Raised when a resume's text cannot be extracted."""


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def _extract_docx(data: bytes) -> str:
    import docx  # python-docx

    document = docx.Document(io.BytesIO(data))
    return "\n".join(p.text for p in document.paragraphs)


def extract_text(data: bytes, filename: str | None = None, content_type: str | None = None) -> str:
    """Best-effort plain-text extraction from resume bytes.

    Dispatch by extension/content-type, then fall back to UTF-8 decoding.
    """
    name = (filename or "").lower()
    ctype = (content_type or "").lower()

    try:
        if name.endswith(".pdf") or "pdf" in ctype:
            text = _extract_pdf(data)
        elif name.endswith(".docx") or "wordprocessingml" in ctype:
            text = _extract_docx(data)
        elif name.endswith(".doc"):
            raise ResumeExtractionError(
                "Legacy .doc files are not supported — please upload a PDF or .docx."
            )
        else:
            text = data.decode("utf-8", errors="ignore")
    except ResumeExtractionError:
        raise
    except Exception as err:  # noqa: BLE001 - surface a clean message to the API caller
        raise ResumeExtractionError(f"Could not read resume file: {err}") from err

    text = text.strip()
    if not text:
        raise ResumeExtractionError("No readable text found in the uploaded resume.")
    return text
