"""Shared, serializable data contracts for every Fixora interface."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

Language = Literal["c", "cpp", "python", "java"]


@dataclass(frozen=True)
class Issue:
    category: str
    message: str
    severity: str = "warning"
    line: int | None = None
    rule: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class FixRequest:
    code: str
    language: str | None = None
    error: str | None = None
    use_ai: bool = False


@dataclass
class FixResult:
    language: Language
    fixed_code: str
    explanation: str
    issues: list[Issue] = field(default_factory=list)
    changed: bool = False
    confidence: float = 0.0
    history_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "language": self.language,
            "fixed_code": self.fixed_code,
            "explanation": self.explanation,
            "issues": [issue.to_dict() for issue in self.issues],
            "changed": self.changed,
            "confidence": self.confidence,
            "history_id": self.history_id,
        }