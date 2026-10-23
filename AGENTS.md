<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SnapBite

Voice-first, camera-first nutrition tracking web app for the We Make Diffs Wispr Flow no-hands challenge.

**Tagline:** Eat Snap Track.

## Before any work

1. Read [PROGRESS.md](PROGRESS.md) and [DECISIONS.md](DECISIONS.md).
2. Implement **only** the current phase. Do not reimplement Done phases.
3. Preserve existing working code.
4. Mark a phase Done only after its acceptance criteria pass, with a one-line proof in PROGRESS.md.
5. Verify UI in the browser (mobile ~390px). A screenshot is not enough.

## Product slice (v1)

- Short onboarding → estimated calorie and macro targets
- Natural-language meal logging via a focused composer (Wispr Flow dictation)
- Photo-based food estimation
- Meal confirmation before persist
- Daily nutrition tracking

## Out of v1

USDA food DB, barcodes, exercise, weight history, social, email/magic-link conversion, native apps, offline-first sync, custom speech-to-text, retained meal photo storage, medical claims.

Stretch (Phase 8) must not delay the core workflow or an early deploy.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Supabase Postgres + anonymous auth (from Phase 2)
- Gemini Flash for NL parse and image estimation (server-only; pin model ID after a smoke test)
- Voice: Wispr Flow into the focused food composer — **no custom STT**
- Deploy: Vercel; ship an early working URL as soon as the dashboard is functional (Phase 4)

## Wispr UX

- One large, easy-to-focus “What did you eat?” composer on home
- Confirm sheet is voice-editable
- Device local calendar date is “today”

## Env (never put secrets in `NEXT_PUBLIC_*` except the Supabase anon key)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

`GEMINI_API_KEY` is server-side only. Newer Supabase dashboards may label the public key **Publishable**; `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is accepted as an alias of the anon key. Never use the service role key in this repo.

## Persistence rules (later phases)

- Confirm before write
- Photos are used ephemerally for estimation; v1 does **not** retain meal photos after confirmation
- RLS: users read/write only their rows
- Denormalized meal calorie/macro totals on `meals`
