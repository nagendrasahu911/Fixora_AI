"""Detect C, C++, Python, or Java without executing submitted code."""

from __future__ import annotations

from dataclasses import dataclass
import re

from portable_agent.models import Language


@dataclass(frozen=True)
class Detection:
    language: Language
    confidence: float
    reason: str


def detect_language(code: str, requested: str | None = None) -> Detection:
    if requested:
        return Detection(requested, 1.0, "Language supplied by the caller")  # type: ignore[arg-type]

    scores: dict[Language, int] = {"c": 0, "cpp": 0, "python": 0, "java": 0}
    if re.search(r"^\s*(from\s+\w+\s+import|import\s+\w+|def\s+\w+|class\s+\w+\s*\:)", code, re.MULTILINE):
        scores["python"] += 4
    if re.search(r"#include\s*[<\"](?:iostream|vector|string|map|algorithm)", code):
        scores["cpp"] += 5
    if re.search(r"\b(std::|using\s+namespace\s+std|cout\s*<<|cin\s*>>)", code):
        scores["cpp"] += 3
    if re.search(r"#include\s*[<\"](?:stdio|stdlib|string)\.h[>\"]|\bprintf\s*\(", code):
        scores["c"] += 4
    if re.search(r"\bpublic\s+(?:final\s+)?class\s+\w+|System\.out\.|import\s+java\.", code):
        scores["java"] += 5

    language, score = max(scores.items(), key=lambda item: item[1])
    if score == 0:
        return Detection("python", 0.2, "No distinctive markers; Python is the safest default")
    confidence = min(0.99, 0.45 + score * 0.1)
    return Detection(language, confidence, f"Matched {score} language markers")