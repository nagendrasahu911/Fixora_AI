# Fixora AI Portable Agent Plan

## Outcome
Deliver a production-ready, portable Fixora AI codebase that keeps the existing web dashboard and adds reusable local modules for C, C++, Python, and Java, plus a CLI, a Python REST API, history, tests, and documentation.

## User-facing work
- Add a modular Python agent with language detection, input normalization, error analysis, rule-based fixes, optional AI hook, and JSON/text output formatting.
- Add `fixora` CLI commands for files and direct code, with fixed code and explanations in terminal.
- Add FastAPI `POST /fix-code` returning fixed code, explanation, detected language, issues, and history metadata.
- Add basic persistent JSON history shared by CLI/API, with bounded entries and safe file handling.
- Keep the web app’s existing editor, language dropdown, native execution, graphing, projects, and AI actions intact; add a documented API integration path without replacing the current browser experience.
- Rewrite README with architecture, setup, web/CLI/API usage, examples, and test commands.

## Technical details
- Use only Python standard library for the core agent; FastAPI/Pydantic are optional API dependencies in `requirements.txt`.
- Organize reusable code under `portable_agent/` modules: `input_handler/`, `language_detector/`, `error_analyzer/`, `fix_generator/`, `output_formatter/`.
- Add `portable_agent/cli.py`, `portable_agent/api.py`, `portable_agent/config.py`, and `tests/` with deterministic sample cases for all four languages.
- Make language detection explicit when supplied and conservative when auto-detecting; never claim a fix when the analyzer has no safe transformation.
- Record the modular Python boundary and JSON REST contract in `AGENTS.md`.
