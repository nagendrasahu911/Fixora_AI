import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { autocompletion } from "@codemirror/autocomplete";
import { linter, lintGutter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { makeCompletionSource, lintSource, type EditorLanguage } from "@/lib/completions";

interface Props {
  value: string;
  onChange: (v: string) => void;
  language?: EditorLanguage;
}

export function CodeEditor({ value, onChange, language = "python" }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const extensions = useMemo(
    () => [
      python(),
      autocompletion({
        override: [makeCompletionSource(language)],
        activateOnTyping: true,
        icons: false,
      }),
      linter(lintSource, { delay: 400 }),
      lintGutter(),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": { height: "100%", fontSize: "14px", background: "transparent" },
        ".cm-scroller": { fontFamily: "var(--font-mono, ui-monospace, monospace)" },
        ".cm-gutters": { background: "transparent", border: "none" },
        "&.cm-focused": { outline: "none" },
      }),
    ],
    [language],
  );

  if (!mounted) {
    return (
      <pre className="min-h-0 flex-1 overflow-auto bg-editor p-4 font-mono text-sm text-foreground">
        {value}
      </pre>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden bg-editor [&_.cm-editor]:h-full [&>div]:h-full">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={vscodeDark}
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          closeBrackets: true,
          autocompletion: false,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          indentOnInput: true,
          foldGutter: true,
          tabSize: 4,
        }}
        height="100%"
      />
    </div>
  );
}
