"""High-level orchestration shared by the CLI, API, and future adapters."""

from __future__ import annotations

from portable_agent.error_analyzer import analyze
from portable_agent.fix_generator import generate_rule_based_fix
from portable_agent.fix_generator.ai import refine_with_ai
from portable_agent.history import HistoryStore
from portable_agent.input_handler import normalize_request
from portable_agent.language_detector import detect_language
from portable_agent.models import FixRequest, FixResult, Language


class FixoraAgent:
    def __init__(self, history: HistoryStore | None = None) -> None:
        self.history = history or HistoryStore()

    def fix(self, request: FixRequest, save_history: bool = True) -> FixResult:
        normalized = normalize_request(request)
        detection = detect_language(normalized.code, normalized.language)
        language = detection.language
        issues = analyze(normalized.code, language, normalized.error)
        fixed_code, changes = generate_rule_based_fix(normalized.code, language, issues)

        explanation_parts = changes[:]
        if not explanation_parts:
            explanation_parts.append("No safe automatic transformation was identified; the original code was preserved.")

        if normalized.use_ai:
            ai_result = refine_with_ai(normalized.code, language, [issue.to_dict() for issue in issues])
            if ai_result:
                fixed_code, ai_explanation = ai_result
                explanation_parts.append("Optional AI refinement was applied after the rule-based analysis.")
                explanation_parts.append(ai_explanation)

        result = FixResult(
            language=language,
            fixed_code=fixed_code,
            explanation=" ".join(explanation_parts),
            issues=issues,
            changed=fixed_code != normalized.code,
            confidence=detection.confidence,
        )
        if save_history:
            result.history_id = self.history.add(result, normalized.code)
        return result