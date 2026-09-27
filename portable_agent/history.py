"""Bounded, atomic JSON history for local and single-instance deployments."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
from threading import Lock
from uuid import uuid4

from portable_agent.config import history_limit, history_path
from portable_agent.models import FixResult


class HistoryStore:
    def __init__(self, path: Path | None = None, limit: int | None = None) -> None:
        self.path = path or history_path()
        self.limit = limit or history_limit()
        self._lock = Lock()

    def add(self, result: FixResult, original_code: str) -> str:
        entry_id = uuid4().hex
        entry = {
            "id": entry_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "language": result.language,
            "changed": result.changed,
            "issues": [issue.to_dict() for issue in result.issues],
            "original_code": original_code,
            "fixed_code": result.fixed_code,
            "explanation": result.explanation,
        }
        with self._lock:
            entries = self.list()
            entries.insert(0, entry)
            self._write(entries[: self.limit])
        return entry_id

    def list(self) -> list[dict[str, object]]:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except (FileNotFoundError, OSError, json.JSONDecodeError):
            return []

    def _write(self, entries: list[dict[str, object]]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=self.path.parent, delete=False) as handle:
            json.dump(entries, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
            temporary = Path(handle.name)
        temporary.replace(self.path)