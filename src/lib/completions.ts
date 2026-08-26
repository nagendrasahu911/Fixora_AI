import type { CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete";
import type { Diagnostic } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";

export type EditorLanguage = "python";

const kw = (label: string, detail: string, apply?: string): Completion => ({
  label,
  type: "keyword",
  detail,
  ...(apply ? { apply } : {}),
});
const fn = (label: string, detail: string, apply?: string): Completion => ({
  label,
  type: "function",
  detail,
  ...(apply ? { apply } : {}),
});

const PYTHON: Completion[] = [
  fn("print", "print(...)", "print()"),
  fn("range", "range(n)", "range()"),
  fn("len", "len(obj)", "len()"),
  fn("enumerate", "enumerate(it)", "enumerate()"),
  fn("input", "input(prompt)", "input()"),
  fn("sum", "sum(it)", "sum()"),
  fn("sorted", "sorted(it)", "sorted()"),
  kw("import", "import module"),
  kw("from", "from module import ..."),
  kw("def", "define a function"),
  kw("class", "define a class"),
  kw("return", "return value"),
  kw("if", "conditional"),
  kw("elif", "else if"),
  kw("else", "else branch"),
  kw("for", "for loop"),
  kw("while", "while loop"),
  kw("try", "try / except"),
  kw("except", "handle exception"),
  kw("with", "context manager"),
  kw("lambda", "anonymous function"),
  { label: "import numpy as np", type: "text", detail: "NumPy import" },
  { label: "import matplotlib.pyplot as plt", type: "text", detail: "Matplotlib import" },
];

const NP: Completion[] = [
  "array(",
  "arange(",
  "linspace(",
  "zeros(",
  "ones(",
  "eye(",
  "reshape(",
  "mean(",
  "median(",
  "std(",
  "var(",
  "sum(",
  "min(",
  "max(",
  "sort(",
  "dot(",
  "sqrt(",
  "abs(",
  "random.rand(",
  "random.randn(",
  "random.normal(",
  "random.randint(",
].map((s) => fn(s.replace("(", ""), `np.${s})`, s + ")"));

const PLT: Completion[] = [
  "plot(",
  "bar(",
  "barh(",
  "scatter(",
  "hist(",
  "pie(",
  "boxplot(",
  "title(",
  "xlabel(",
  "ylabel(",
  "legend(",
  "grid(",
  "figure(",
  "subplot(",
  "show(",
  "savefig(",
].map((s) => fn(s.replace("(", ""), `plt.${s})`, s + ")"));

export function makeCompletionSource(_language: EditorLanguage = "python") {
  return (context: CompletionContext): CompletionResult | null => {
    const dotted = context.matchBefore(/(np|numpy|plt|pyplot)\.\w*/);
    if (dotted) {
      const isNp = /^(np|numpy)\./.test(dotted.text);
      return {
        from: dotted.from + dotted.text.indexOf(".") + 1,
        options: isNp ? NP : PLT,
        validFor: /^\w*$/,
      };
    }
    const word = context.matchBefore(/[\w#.]*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;
    const options = PYTHON;
    return { from: word.from, options, validFor: /^[\w#.]*$/ };
  };
}

const OPEN: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

/** Lightweight bracket / quote balance linter with red underlines + hover tooltips. */
export function lintSource(view: EditorView): Diagnostic[] {
  const text = view.state.doc.toString();
  const diagnostics: Diagnostic[] = [];
  const stack: { ch: string; pos: number }[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === "#" || (text.startsWith("//", i) && ch === "/")) {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
      i++;
      let closed = false;
      while (i < text.length && text[i] !== "\n") {
        if (text[i] === "\\") {
          i += 2;
          continue;
        }
        if (text[i] === quote) {
          closed = true;
          i++;
          break;
        }
        i++;
      }
      if (!closed) {
        diagnostics.push({
          from: start,
          to: Math.min(i, text.length),
          severity: "error",
          message: "SyntaxError: unterminated string literal",
        });
      }
      continue;
    }
    if (OPEN[ch]) stack.push({ ch, pos: i });
    else if (ch === ")" || ch === "]" || ch === "}") {
      const last = stack.pop();
      if (!last || OPEN[last.ch] !== ch) {
        diagnostics.push({
          from: i,
          to: i + 1,
          severity: "error",
          message: `SyntaxError: unexpected closing '${ch}'`,
        });
      }
    }
    i++;
  }
  for (const left of stack) {
    diagnostics.push({
      from: left.pos,
      to: left.pos + 1,
      severity: "error",
      message: `SyntaxError: missing ${OPEN[left.ch]}`,
    });
  }
  return diagnostics;
}
