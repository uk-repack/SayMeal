# Decisions

Append-only. Do not rewrite history; add a new dated entry if something changes.

## 2026-10-22 — Product

- **Name:** SnapBite (not Byte Log).
- **Tagline:** Eat Snap Track.
- Hackathon: We Make Diffs Wispr Flow no-hands challenge. Deadline 2026-10-30.

## 2026-10-22 — Stack

- Next.js App Router, TypeScript, Tailwind CSS.
- Supabase + Postgres.
- Auth: **anonymous only** for v1 (no magic link, no email conversion UI).
- AI: Gemini Flash for natural-language parsing and image-based meal estimation.
- Voice: Wispr Flow dictation into the focused food composer. **No custom speech-to-text engine.**
- All API keys stay server-side. The only public env vars are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 2026-10-23 — Gemini model ID (text)

- Pinned for Phase 5 text estimates: **`gemini-3.5-flash-lite`**.
- Source: Google Gemini API models list (updated 2026-10-22) plus structured-output docs. New projects should use 3.5 Flash-Lite or 3.8 Flash; 2.5 Flash is limited to prior users. 3.5 Flash-Lite is the simplest Flash that supports `responseMimeType: application/json` and `responseJsonSchema`.
- SDK: official `@google/genai` (not the deprecated `@google/generativeai`).
- Text smoke: `generateContent` with JSON schema returned `{"ok": true, "model_echo": "flash"}`.
- Image smoke is still pending (Phase 6). If vision needs a stronger Flash, reconsider `gemini-3.8-flash` then.

## 2026-10-22 — Gemini model ID

- **Not pinned yet.** Before first estimate route, verify current Flash availability and run a minimal text **and** image smoke test. Then pin the model id here. Text pin: 2026-10-23 (`gemini-3.5-flash-lite`). Image smoke still pending for Phase 6.

## 2026-10-22 — Photos

- v1 does **not** retain meal photos after confirmation.
- Images may be sent in-memory to Gemini for estimation; persist items, macros, and source text only.
- Do not add a prominent photo-library / Storage retention feature in v1.

## 2026-10-22 — Deploy and stretch

- Deploy an early working version as soon as the **dashboard is functional** (Phase 4), not only at the end.
- Stretch features (Phase 8) must not delay the core workflow.

## 2026-10-22 — Nutrition (planned)

- Targets: Mifflin–St Jeor × activity, then goal (lose −15%, maintain, gain +10%).
- Protein 1.6 g/kg (lose/gain) or 1.2 g/kg (maintain); fat 25% of calories; carbs remainder; clamp calories ~1200–4000.
- Estimates are labeled estimates; confirm before write.

## 2026-10-22 — Phase 3 onboarding and targets

- Mifflin–St Jeor × documented activity multipliers (1.2 / 1.375 / 1.55 / 1.725 / 1.9), then goal (−15% / maintain / +10%). Fat 25% of calories; protein 1.6 g/kg (lose/gain) or 1.2 g/kg (maintain); carbs the remainder. Calories clamped 1200–4000.
- Fixture (also SAMPLE_TARGETS): 30y male, 180cm, 80kg, moderate, lose → 2345 kcal, 128g P, 312g C, 65g F.
- Sex is optional. Skip stores `sex = null` and uses the midpoint of female/male BMR without writing a fake sex. Review UI shows the range and lets the user edit.
- Profiles are upserted on `id = auth.uid()` with `onboarded_at` set. No schema change; existing RLS is enough.
- Dashboard still uses Phase 1 sample meals until Phase 4. Onboarding only gates access.

## 2026-10-23 — Onboarding reuse for profile edits

- `/onboarding` is both first-time setup and profile edit. ProfileGate still sends incomplete profiles to `/onboarding`; it no longer redirects completed profiles away from that route.
- The same form prepopulates from `fetchOwnProfile`. Save still upserts `profiles` on `id = auth.uid()`. Existing `onboarded_at` is preserved. Meals are not touched.
- The onboarding page waits until the own-profile fetch resolves before rendering the form, so completed users do not see an empty form flash then a dashboard bounce.
- Header: discreet “Edit targets” / “Today” links. No schema or RLS change.

## 2026-10-23 — Edit and delete saved meals

- Meal cards open a detail overlay (same cream full-screen pattern as review). Edit and Delete live there, not on every card.
- Edit opens the existing confirm sheet prefilled from saved items (`estimatedMealFromLogged`). Save calls `updateOwnConfirmedMeal` on that `id` + `auth.uid()`; no insert, no Gemini. Delete requires a second confirm; Cancel leaves the row. Both require a returned row or they report failure.
- After a successful write, the selected day's list and totals refetch. `local_date`, `user_id`, `logged_at`, and `source` are not rewritten. RLS unchanged; no service-role key.

## 2026-10-23 — Log meals on a selected history date

- Home dashboard reuses the History day picker. Totals and meal list follow the selected local calendar date. Composer stays on the same screen (also on `/history`). No extra logging page.
- Save uses that selected `local_date` for text, photo, and repeat copies. `insertOwnConfirmedMeal` still sets `user_id` from `auth.getUser()` and rejects invalid dates instead of substituting today for a past day.
- Description dates are parsed deterministically (`yesterday` / `today` / `last night` / `on Monday` / `Monday's`). Bare weekday food names are ignored. If the mentioned day differs from the picker, the composer asks which day to use before Gemini. Repeat-command “yesterday” still means lookup day; the copy is saved to the selected day.
- Day fetches drop cancelled or out-of-order responses (`shouldApplyDayFetch`). Confirm sheet remaining calories load meals for the target date. No schema, RLS, or extra Gemini date call.

## 2026-10-23 — Repeat previous meal (NL commands)

- Deterministic parser in `lib/meals/repeat.ts` (no extra LLM). Supported: repeat/copy/again/the same plus yesterday, today, last night, or a weekday; or `log`/`add` + breakfast/lunch/dinner + that day with no extra food words.
- Normal descriptions, questions, and nutrition phrasing stay on `POST /api/meals/estimate`. Copy intent without a day is an in-composer error, not Gemini.
- Lookup uses existing own confirmed rows for that local calendar date (`fetchOwnConfirmedMealRowsForLocalDate` + RLS). Slot match: saved title/raw_text/item names, else local `logged_at` hour windows. Food query matches those strings. Eggs at dinner are not breakfast unless the saved text says so.
- One match → existing confirm sheet with saved items/totals. Several matches → compact choice list in the composer. None → retry message. Confirm inserts a **new** row for `localDateString()`; original id/user_id/timestamps are not copied. `source` is preserved. Submit/confirm locks block double clicks.
- No schema, RLS, Gemini, or photo-storage change.

## 2026-10-23 — History Phase 1 (read-only)

- `/history` loads confirmed `meals` for one `local_date` via existing `fetchOwnMealsForLocalDate`. No extra table, no all-time fetch.
- Date math uses `localDateString` / `shiftLocalDate` (device calendar), never UTC ISO slicing. Next-day is blocked at today. Native `input type="date"` plus prev/next.
- Totals use `sumMeals`. Source text/photo is shown on history cards only. Dashboard logging is unchanged.
- Nav: History on the dashboard header; Today on the history header.

## 2026-10-23 — Figma UI redesign

- Visual source of truth is the supplied dashboard, composer, photo, review, and empty-state frames. Cream canvas, forest green, Fraunces display headings.
- Compact “What did you eat?” bar expands into text or photo sheets so it does not cover the dashboard. Wispr still uses the focused textarea. No custom STT.
- Meal list thumbnails are placeholders (fork icon). v1 still does not retain meal photos, so Figma’s food photos are not stored.
- Review keeps itemized edit/remove under “Edit portion”; meal-level tiles show summed totals. No post-save meal editor (not in existing APIs).
- Onboarding had no Figma frames; it only picked up palette/button styling.

## 2026-10-23 — Phase 6 photo meal estimate

- Reused **`gemini-3.5-flash-lite`**. Official model card lists image input and structured outputs. Image smoke (inline PNG + JSON schema) returned `foods_found: false` for a 1×1 non-food image.
- Dedicated `POST /api/meals/estimate-photo` (multipart `image`). Text `POST /api/meals/estimate` is unchanged. Auth still `auth.getUser()`; `GEMINI_API_KEY` stays server-only.
- Client: JPEG/PNG/WebP, 8 MB cap, resize longest side to 1280, JPEG ~0.82. Server re-validates magic bytes and size. Original photos are not written to Storage or the database.
- Vision JSON allows empty `items` / `foods_found: false`. That is a 422, not a fabricated meal. Totals still summed from validated items.
- Confirm sheet and `insertOwnConfirmedMeal` reused. Schema already allows `source = photo`; no migration or RLS change.

## 2026-10-23 — Phase 5 text meal estimate and save

- One server call per Log meal: `POST /api/meals/estimate`. Auth via existing cookie session (`auth.getUser()`). Gemini key stays in `GEMINI_API_KEY` only.
- Model output is validated in server code. Meal calorie/macro totals are summed from items; model-provided totals are ignored.
- Confirm sheet is required before write. Cancel does not persist. Save uses the browser Supabase client, `user_id = auth.uid()`, `local_date` from `localDateString()`, `source = text`, `status = confirmed`.
- `meals.items` jsonb already stores the itemized list (`name`, `quantity`, `unit`, calories, macros, notes). No schema or RLS change.
- Photo recognition is not in this phase.

## 2026-10-23 — Phase 4 dashboard read path

- Today is `localDateString()` (device calendar YYYY-MM-DD), not UTC `toISOString().slice(0,10)`.
- Dashboard reads `profiles` targets and `meals` where `user_id = auth.uid()`, `local_date = today`, `status = 'confirmed'`, ordered by `logged_at` desc.
- Sample meal cards are removed. Composer still does not persist (Phase 5).
- No schema change. Meal SELECT isolation re-checked: B gets 0 rows for A’s meal; A deleted the test row.

## 2026-10-22 — Phase 2 auth and schema

- Next.js 16 session refresh lives in root `proxy.ts` (the `middleware.ts` convention is deprecated). Runtime is Node.js. Tokens are revalidated with `auth.getUser()`, not `getSession()`.
- Browser session uses `@supabase/ssr` cookie storage plus a silent client bootstrap (`AnonymousSession`) that calls `signInAnonymously()` when no session exists.
- Public env: prefer `NEXT_PUBLIC_SUPABASE_ANON_KEY`; also accept `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` because current Supabase dashboards issue that name. Do not put a service-role key in `NEXT_PUBLIC_*`.
- `meals` has no `photo_path` column. v1 does not retain photos.
- RLS: only the `authenticated` role can read/write `profiles` and `meals`, and only when `auth.uid()` matches the row owner. Anonymous users become `authenticated` after sign-in.
- Verification helper: `GET /api/session` returns `{ userId, isAnonymous }` without changing the Phase 1 dashboard.
