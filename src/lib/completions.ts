import type { CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete";
import type { Diagnostic } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";

export type EditorLanguage = "python" | "c" | "cpp" | "java";

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
  {
    label: "for i in range",
    type: "text",
    detail: "for loop over a range",
    apply: "for i in range(10):\n    ",
  },
  {
    label: "if __name__",
    type: "text",
    detail: "main guard",
    apply: 'if __name__ == "__main__":\n    ',
  },
  {
    label: "if condition",
    type: "text",
    detail: "if / else block",
    apply: "if condition:\n    pass\nelse:\n    pass",
  },
  {
    label: "def function",
    type: "text",
    detail: "function definition",
    apply: "def function_name():\n    ",
  },
  {
    label: "try/except",
    type: "text",
    detail: "error handling block",
    apply: "try:\n    pass\nexcept Exception as e:\n    print(e)",
  },
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

const C: Completion[] = [
  fn("printf", 'printf("%d\\n", x)', 'printf("");'),
  fn("scanf", 'scanf("%d", &x)', 'scanf("");'),
  fn("malloc", "malloc(size)", "malloc()"),
  fn("free", "free(ptr)", "free()"),
  kw("#include <stdio.h>", "standard I/O"),
  kw("#include <stdlib.h>", "standard library"),
  kw("int", "integer type"),
  kw("float", "float type"),
  kw("char", "char type"),
  kw("return", "return value"),
  kw("if", "conditional"),
  kw("else", "else branch"),
  kw("while", "while loop"),
  {
    label: "main",
    type: "text",
    detail: "main function",
    apply: "int main() {\n    \n    return 0;\n}",
  },
  {
    label: "for loop",
    type: "text",
    detail: "counted loop",
    apply: "for (int i = 0; i < 10; i++) {\n    \n}",
  },
];

const CPP: Completion[] = [
  fn("cout", "std::cout << x", "cout << "),
  fn("cin", "std::cin >> x", "cin >> "),
  fn("endl", "line break", "endl"),
  kw("#include <iostream>", "I/O streams"),
  kw("#include <vector>", "dynamic array"),
  kw("#include <string>", "strings"),
  kw("using namespace std;", "std namespace"),
  {
    label: "main",
    type: "text",
    detail: "main function",
    apply: "int main() {\n    \n    return 0;\n}",
  },
  {
    label: "for loop",
    type: "text",
    detail: "counted loop",
    apply: "for (int i = 0; i < 10; i++) {\n    \n}",
  },
];

const JAVA: Completion[] = [
  fn("System.out.println", "print a line", "System.out.println();"),
  fn("System.out.print", "print", "System.out.print();"),
  kw("public", "access modifier"),
  kw("static", "static member"),
  kw("void", "no return value"),
  kw("class", "define a class"),
  kw("import java.util.Scanner;", "console input"),
  {
    label: "main",
    type: "text",
    detail: "entry point",
    apply: "public static void main(String[] args) {\n    \n}",
  },
  {
    label: "for loop",
    type: "text",
    detail: "counted loop",
    apply: "for (int i = 0; i < 10; i++) {\n    \n}",
  },
];

const BY_LANGUAGE: Record<EditorLanguage, Completion[]> = {
  python: PYTHON,
  c: C,
  cpp: CPP,
  java: JAVA,
};

export function makeCompletionSource(language: EditorLanguage = "python") {
  return (context: CompletionContext): CompletionResult | null => {
    if (language === "python") {
      const dotted = context.matchBefore(/(np|numpy|plt|pyplot)\.\w*/);
      if (dotted) {
        const isNp = /^(np|numpy)\./.test(dotted.text);
        return {
          from: dotted.from + dotted.text.indexOf(".") + 1,
          options: isNp ? NP : PLT,
          validFor: /^\w*$/,
        };
      }
    }
    const word = context.matchBefore(/[\w#.<>]*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;
    return { from: word.from, options: BY_LANGUAGE[language], validFor: /^[\w#.<>]*$/ };
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
