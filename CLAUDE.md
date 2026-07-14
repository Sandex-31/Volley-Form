# Wapatanka Volley Tool

Vanilla HTML/CSS/JS (no bundler) + Firebase. Pages in `src/pages/`, styles in `src/styles/` (design tokens in `theme.css`), logic in `src/modules/` and `src/services/`.

## Working rules (token efficiency — keep sessions cheap)

- Read only what you need: use Grep to locate, then Read with offset/limit. Never re-read a file already in context.
- `src/modules/analysis/video-analysis.js` is ~1500 lines: always Grep first, read sections only.
- No subagents unless the user explicitly asks; work inline.
- Keep replies short; skip long recaps of prior work.
- Don't start dev servers or long background tasks unless asked; kill them when done (only the specific PID, not all node/python).
- Visual changes only need `node --check` on touched JS + a 200 check if a server is already running — no heavier verification.

## Conventions

- All colors via CSS tokens in `theme.css` (light default + `[data-theme="dark"]`). Never hardcode hex in pages/styles; JS render templates use `var(--token)` inline.
- Brand: navy `#0D1A3C` + red `#B22823` (tokens `--brand`/`--accent`), fonts Sora (head) + Inter (body).
- Business logic (Firebase, services, data flow) must not change during visual work.
