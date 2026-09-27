"""Small configuration surface shared by CLI and API deployments."""

from __future__ import annotations

import os
from pathlib import Path


def history_path() -> Path:
    configured = os.environ.get("FIXORA_HISTORY_FILE")
    if configured:
        return Path(configured).expanduser()
    return Path.home() / ".fixora" / "history.json"


def history_limit() -> int:
    try:
        return max(1, min(1000, int(os.environ.get("FIXORA_HISTORY_LIMIT", "100"))))
    except ValueError:
        return 100


def ai_base_url() -> str:
    return os.environ.get("FIXORA_AI_BASE_URL", "https://api.openai.com/v1").rstrip("/")


def ai_model() -> str:
    return os.environ.get("FIXORA_AI_MODEL", "gpt-4o-mini")