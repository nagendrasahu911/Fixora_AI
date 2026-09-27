<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Portable agent architecture

- The reusable Fixora AI engine lives in `portable_agent/` and uses Python standard-library modules for language detection, analysis, safe rule-based fixes, formatting, and history; the web app remains a separate TanStack Start interface. This keeps CLI, API, and web integrations portable without coupling core logic to a framework.
- The REST contract is `POST /fix-code` with `{code, language?, error?, use_ai?}` and a JSON result containing `fixed_code`, `explanation`, `issues`, and `history_id`; FastAPI is an optional adapter dependency, not a requirement for the core engine. This allows local CLI use without installing a web stack.
