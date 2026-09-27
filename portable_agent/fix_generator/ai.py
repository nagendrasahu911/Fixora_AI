"""Optional OpenAI-compatible refinement hook; never required by the core."""

from __future__ import annotations

import json
import os
from urllib import request

from portable_agent.config import ai_base_url, ai_model
from portable_agent.models import Language


def refine_with_ai(code: str, language: Language, issues: list[dict[str, object]]) -> tuple[str, str] | None:
    """Return `(fixed_code, explanation)` when opt-in credentials are configured."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
    payload = {
        "model": ai_model(),
        "temperature": 0,
        "messages": [
            {"role": "system", "content": "Fix code conservatively. Return JSON with fixed_code and explanation."},
            {"role": "user", "content": json.dumps({"language": language, "code": code, "issues": issues})},
        ],
        "response_format": {"type": "json_object"},
    }
    req = request.Request(
        f"{ai_base_url()}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
        content = body["choices"][0]["message"]["content"]
        result = json.loads(content)
        fixed_code = result.get("fixed_code")
        explanation = result.get("explanation")
        if isinstance(fixed_code, str) and isinstance(explanation, str):
            return fixed_code, explanation
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError):
        return None
    return None