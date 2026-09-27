"""Normalize input before language detection and analysis."""

from __future__ import annotations

from portable_agent.models import FixRequest


SUPPORTED_LANGUAGES = ("c", "cpp", "python", "java")


def normalize_request(request: FixRequest) -> FixRequest:
    code = request.code.replace("\r\n", "\n").replace("\r", "\n")
    if not code.strip():
        raise ValueError("Code cannot be empty.")

    language = request.language.strip().lower() if request.language else None
    aliases = {"py": "python", "c++": "cpp", "cc": "cpp", "h++": "cpp"}
    language = aliases.get(language, language)
    if language and language not in SUPPORTED_LANGUAGES:
        supported = ", ".join(SUPPORTED_LANGUAGES)
        raise ValueError(f"Unsupported language '{request.language}'. Use: {supported}.")
    return FixRequest(code=code, language=language, error=request.error, use_ai=request.use_ai)