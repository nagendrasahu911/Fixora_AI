"""Conservative source transformations with explanations for each change."""

from __future__ import annotations

import re

from portable_agent.models import Issue, Language


def generate_rule_based_fix(code: str, language: Language, issues: list[Issue]) -> tuple[str, list[str]]:
    fixed = code
    changes: list[str] = []

    if language == "python":
        fixed, changes = _fix_python(fixed, changes)
    elif language == "c":
        fixed, changes = _fix_c(fixed, changes)
    elif language == "cpp":
        fixed, changes = _fix_cpp(fixed, changes)
    else:
        fixed, changes = _fix_java(fixed, changes)
    return fixed, changes


def _prepend_once(code: str, statement: str) -> tuple[str, bool]:
    if re.search(rf"^\s*{re.escape(statement)}\s*$", code, re.MULTILINE):
        return code, False
    return statement + "\n" + code, True


def _fix_python(code: str, changes: list[str]) -> tuple[str, list[str]]:
    if re.search(r"\bnp\.", code) and not re.search(r"import\s+numpy\s+as\s+np", code):
        code, changed = _prepend_once(code, "import numpy as np")
        if changed:
            changes.append("Added the missing NumPy import.")
    if re.search(r"\bplt\.", code) and not re.search(r"import\s+matplotlib\.pyplot\s+as\s+plt", code):
        code, changed = _prepend_once(code, "import matplotlib.pyplot as plt")
        if changed:
            changes.append("Added the missing Matplotlib pyplot import.")
    lines = []
    for line in code.splitlines():
        stripped = line.strip()
        if re.match(r"^(def|class|if|elif|else|for|while|try|except|finally|with)\b", stripped) and not stripped.endswith((":", "\\")):
            line = line.rstrip() + ":"
            changes.append(f"Added a missing block colon to `{stripped[:40]}`.")
        lines.append(line)
    code = "\n".join(lines)
    if re.search(r"\btotal\s*/\s*len\(number\)\b", code) and re.search(r"\bnumbers\b", code):
        code = re.sub(r"\blen\(number\)", "len(numbers)", code)
        changes.append("Corrected the collection variable name from `number` to `numbers`.")
    return code.rstrip() + "\n", _unique_changes(changes)


def _fix_c(code: str, changes: list[str]) -> tuple[str, list[str]]:
    if re.search(r"\b(?:printf|scanf|puts)\s*\(", code) and "#include <stdio.h>" not in code:
        code, changed = _prepend_once(code, "#include <stdio.h>")
        if changed:
            changes.append("Added the missing stdio header.")
    return _add_statement_semicolons(code, changes, "C"), _unique_changes(changes)


def _fix_cpp(code: str, changes: list[str]) -> tuple[str, list[str]]:
    if re.search(r"\b(?:cout|cin)\b|std::", code) and "#include <iostream>" not in code:
        code, changed = _prepend_once(code, "#include <iostream>")
        if changed:
            changes.append("Added the missing iostream header.")
    return _add_statement_semicolons(code, changes, "C++"), _unique_changes(changes)


def _fix_java(code: str, changes: list[str]) -> tuple[str, list[str]]:
    lines = []
    for line in code.splitlines():
        if "System.out." in line and not line.strip().endswith(";"):
            line = line.rstrip() + ";"
            changes.append("Added a missing semicolon to a Java output statement.")
        lines.append(line)
    return "\n".join(lines).rstrip() + "\n", _unique_changes(changes)


def _add_statement_semicolons(code: str, changes: list[str], label: str) -> str:
    lines = []
    for line in code.splitlines():
        stripped = line.strip()
        if stripped and re.match(r"^(?:return\b|(?:printf|scanf|puts)\s*\(|(?:std::)?cout\s*<<)", stripped) and not stripped.endswith((";", "{", "}")):
            line = line.rstrip() + ";"
            changes.append(f"Added a missing semicolon in {label} code.")
        lines.append(line)
    return "\n".join(lines).rstrip() + "\n"


def _unique_changes(changes: list[str]) -> list[str]:
    return list(dict.fromkeys(changes))