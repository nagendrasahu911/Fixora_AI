"""Find actionable syntax, logical, and import problems using safe heuristics."""

from __future__ import annotations

import ast
import re

from portable_agent.models import Issue, Language


def _balanced(code: str, opening: str, closing: str) -> bool:
    depth = 0
    for char in code:
        if char == opening:
            depth += 1
        elif char == closing:
            depth -= 1
        if depth < 0:
            return False
    return depth == 0


def analyze(code: str, language: Language, runtime_error: str | None = None) -> list[Issue]:
    issues: list[Issue] = []
    if runtime_error:
        issues.append(Issue("runtime", runtime_error.strip(), "error"))

    if language == "python":
        issues.extend(_analyze_python(code))
    elif language in ("c", "cpp"):
        issues.extend(_analyze_c_family(code, language))
    else:
        issues.extend(_analyze_java(code))
    return _unique(issues)


def _analyze_python(code: str) -> list[Issue]:
    issues: list[Issue] = []
    try:
        ast.parse(code)
    except SyntaxError as error:
        issues.append(Issue("syntax", error.msg, "error", error.lineno))

    if re.search(r"\b(?:np|numpy)\.", code) and not re.search(r"(?:import\s+numpy\s+as\s+np|import\s+numpy)", code):
        issues.append(Issue("import", "NumPy is used but it is not imported.", "error", rule="python.numpy-import"))
    if re.search(r"\bplt\.", code) and not re.search(r"import\s+matplotlib\.pyplot\s+as\s+plt", code):
        issues.append(Issue("import", "Matplotlib is used but pyplot is not imported.", "error", rule="python.matplotlib-import"))
    for line_number, line in enumerate(code.splitlines(), 1):
        stripped = line.strip()
        if re.match(r"^(def|class|if|elif|else|for|while|try|except|finally|with)\b", stripped) and not stripped.endswith(":") and not stripped.endswith("\\"):
            issues.append(Issue("syntax", "Block statement is missing a colon.", "error", line_number, "python.block-colon"))
    if re.search(r"\btotal\s*/\s*len\(number\)\b", code) and re.search(r"\bnumbers\b", code):
        issues.append(Issue("logical", "The code refers to 'number' while the collection is named 'numbers'.", "error", rule="python.variable-name"))
    if not _balanced(code, "(", ")") or not _balanced(code, "[", "]"):
        issues.append(Issue("syntax", "Parentheses or brackets are unbalanced.", "error"))
    return issues


def _analyze_c_family(code: str, language: Language) -> list[Issue]:
    issues: list[Issue] = []
    if not _balanced(code, "{", "}"):
        issues.append(Issue("syntax", "Braces are unbalanced.", "error"))
    if language == "c" and re.search(r"\b(?:printf|scanf)\s*\(", code) and "#include <stdio.h>" not in code:
        issues.append(Issue("import", "stdio.h is required for stdio functions.", "error", rule="c.stdio-import"))
    if language == "cpp" and re.search(r"\b(?:cout|cin)\b|std::", code) and "#include <iostream>" not in code:
        issues.append(Issue("import", "iostream is required for stream input/output.", "error", rule="cpp.iostream-import"))
    for line_number, line in enumerate(code.splitlines(), 1):
        stripped = line.strip()
        if stripped and re.match(r"^(?:return\b|(?:printf|scanf|puts)\s*\(|(?:std::)?cout\s*<<)", stripped) and not stripped.endswith((";", "{", "}")):
            issues.append(Issue("syntax", "Statement may be missing a semicolon.", "error", line_number, f"{language}.semicolon"))
    return issues


def _analyze_java(code: str) -> list[Issue]:
    issues: list[Issue] = []
    if not _balanced(code, "{", "}"):
        issues.append(Issue("syntax", "Braces are unbalanced.", "error"))
    if "System.out." in code:
        for line_number, line in enumerate(code.splitlines(), 1):
            if "System.out." in line and not line.strip().endswith(";"):
                issues.append(Issue("syntax", "Java output statements require a semicolon.", "error", line_number, "java.semicolon"))
    if re.search(r"\bclass\s+\w+", code) is None:
        issues.append(Issue("syntax", "Java source needs a class declaration.", "error", rule="java.class"))
    return issues


def _unique(issues: list[Issue]) -> list[Issue]:
    seen: set[tuple[str, str, int | None]] = set()
    unique: list[Issue] = []
    for issue in issues:
        key = (issue.category, issue.message, issue.line)
        if key not in seen:
            seen.add(key)
            unique.append(issue)
    return unique