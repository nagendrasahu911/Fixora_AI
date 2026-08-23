import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function CodeEditor({ value, onChange }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = value.split("\n").length;

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const sync = () => {
      if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
    };
    ta.addEventListener("scroll", sync);
    return () => ta.removeEventListener("scroll", sync);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-editor font-mono text-sm">
      <div
        ref={gutterRef}
        aria-hidden
        className="select-none overflow-hidden py-3 pl-4 pr-3 text-right text-editor-gutter/70"
      >
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="leading-6">
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={taRef}
        value={value}
        spellCheck={false}
        aria-label="Python code editor"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const ta = e.currentTarget;
            const s = ta.selectionStart;
            const next = value.slice(0, s) + "    " + value.slice(ta.selectionEnd);
            onChange(next);
            requestAnimationFrame(() => {
              ta.selectionStart = ta.selectionEnd = s + 4;
            });
          }
        }}
        className="min-h-0 flex-1 resize-none bg-transparent py-3 pr-4 leading-6 text-foreground outline-none"
      />
    </div>
  );
}
