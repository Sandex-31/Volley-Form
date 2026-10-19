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

## Local development

- On `localhost` / `127.0.0.1` the site uses the Firebase emulator (`src/config/firebase.config.js`), never production. Never weaken that check.
- Start: `npm --prefix dev run db` (emulator, port 9000, viewer on 4000); fill it once with `npm --prefix dev run seed` (GET-only from prod).
- Never write to production from localhost or from scripts. Supabase uploads are not emulated: avoid test uploads.
- Ask before every commit, push and PR. Work on a branch, never on `main`.
- New-page checklist, testing and PR flow: see `docs/DEVELOPING.md`.
