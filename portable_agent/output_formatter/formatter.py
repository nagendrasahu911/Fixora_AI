"""Stable output formatting kept separate from the repair engine."""

from __future__ import annotations

import json

from portable_agent.models import FixResult


def format_json(result: FixResult) -> str:
    return json.dumps(result.to_dict(), indent=2, ensure_ascii=False)


def format_text(result: FixResult) -> str:
    lines = [f"Language: {result.language}", f"Changed: {'yes' if result.changed else 'no'}", ""]
    lines.append("Issues:")
    if result.issues:
        for issue in result.issues:
            location = f" (line {issue.line})" if issue.line else ""
            lines.append(f"- [{issue.category}] {issue.message}{location}")
    else:
        lines.append("- No issues detected")
    lines.extend(["", "Explanation:", result.explanation, "", "Fixed code:", result.fixed_code.rstrip()])
    if result.history_id:
        lines.extend(["", f"History: {result.history_id}"])
    return "\n".join(lines)