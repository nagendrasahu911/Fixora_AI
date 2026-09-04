import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { StateEffect, StateField, Prec } from "@codemirror/state";

export type SuggestFetcher = (
  prefix: string,
  signal: AbortSignal,
) => Promise<string | null | undefined>;

const setGhost = StateEffect.define<string | null>();

const ghostField = StateField.define<string | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setGhost)) return e.value;
    if (tr.docChanged || tr.selection) return null;
    return value;
  },
});

class GhostWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  eq(other: GhostWidget) {
    return other.text === this.text;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-ghost-text";
    span.textContent = this.text;
    return span;
  }
}

const ghostDecorations = EditorView.decorations.compute([ghostField, "selection"], (state) => {
  const text = state.field(ghostField);
  if (!text) return Decoration.none;
  const pos = state.selection.main.head;
  return Decoration.set([
    Decoration.widget({ widget: new GhostWidget(text), side: 1 }).range(pos),
  ]) as DecorationSet;
});

export function inlineSuggestion(fetcher: SuggestFetcher, delay = 700) {
  const plugin = ViewPlugin.fromClass(
    class {
      timer: ReturnType<typeof setTimeout> | null = null;
      controller: AbortController | null = null;

      constructor(readonly view: EditorView) {}

      update(u: ViewUpdate) {
        if (!u.docChanged) return;
        this.cancel();
        this.timer = setTimeout(() => void this.run(), delay);
      }

      cancel() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.controller?.abort();
        this.controller = null;
      }

      async run() {
        const state = this.view.state;
        const pos = state.selection.main.head;
        if (pos !== state.doc.length && state.doc.lineAt(pos).to !== pos) return;
        const prefix = state.doc.sliceString(0, pos);
        if (prefix.trim().length < 3) return;
        this.controller = new AbortController();
        try {
          const text = await fetcher(prefix, this.controller.signal);
          if (!text) return;
          if (this.view.state.doc.sliceString(0, this.view.state.selection.main.head) !== prefix)
            return;
          this.view.dispatch({ effects: setGhost.of(text) });
        } catch {
          /* ignore */
        }
      }

      destroy() {
        this.cancel();
      }
    },
  );

  const keys = Prec.highest(
    keymap.of([
      {
        key: "Tab",
        run: (view) => {
          const text = view.state.field(ghostField, false);
          if (!text) return false;
          const pos = view.state.selection.main.head;
          view.dispatch({
            changes: { from: pos, insert: text },
            selection: { anchor: pos + text.length },
            effects: setGhost.of(null),
          });
          return true;
        },
      },
      {
        key: "Escape",
        run: (view) => {
          if (!view.state.field(ghostField, false)) return false;
          view.dispatch({ effects: setGhost.of(null) });
          return true;
        },
      },
    ]),
  );

  return [
    ghostField,
    ghostDecorations,
    plugin,
    keys,
    EditorView.theme({
      ".cm-ghost-text": { opacity: "0.45", fontStyle: "italic" },
    }),
  ];
}
