# Progress

Current phase: **7 (Not started)**  
Next: Phase 7 — hands-free polish, errors, production deploy. Do not reimplement Phase 0–6. Early Vercel deploy was not done in Phase 4 (out of this slice).

**2026-10-23 onboarding edit:** Completed profiles can stay on `/onboarding` and edit saved targets. `npm test` 20 passed; lint/typecheck/build pass.

**2026-10-23 Figma UI:** Dashboard/composer/photo/review restyled to the supplied frames. `npm test` 28 passed; lint/typecheck/build pass. Phase 7 still not started. No schema/API/Gemini change.

**History Phase 1:** `/history` browses confirmed meals by local `local_date`. `npm test` 35 passed; lint/typecheck/build pass. No schema/RLS/Gemini change. Phase 7 still not started.

**2026-10-23 estimate overlay:** Log meal / Confirm use opaque `#245c45`. Review portals to `document.body` with `#f3f0e8`. Composer/photo sheets hide while estimate is open. Phase 7 still not started.

| Phase | Objective | Status | Date | Proof |
| ----- | --------- | ------ | ---- | ----- |
| 0 | Agent memory + Next.js shell | Done | 2026-10-22 | `npm run lint` and `npm run build` pass; http://localhost:3000 title SnapBite, tagline Eat Snap Track, 390px-wide card |
| 1 | Mobile shell + Wispr composer | Done | 2026-10-22 | Composer auto-focused; typed “Two scrambled eggs and toast with butter”; Log meal shows local-only status; header + daily summary + meal list + pinned composer at 390px |
| 2 | Supabase anonymous auth, schema, RLS | Done | 2026-10-22 | Two independent anonymous clients: A can CRUD own `profiles`/`meals`; B’s SELECT of A is empty (not an auth error); B UPDATE/DELETE of A is 0-row with A’s data unchanged; B INSERT as A returns `42501` RLS; B can access own rows; owner cleanup deleted all test rows |
| 3 | Onboarding + stored targets | Done | 2026-10-23 | `npm test` 18 passed; lint/typecheck/build pass. Browser: new session → `/onboarding`; fixture 30/180/80/moderate/male/lose reviews 2345/128/312/65; save → dashboard; reload stays on dashboard. Two-user upsert: B cannot read/update A; B upsert as A is `42501`; cleanup ok. |
| 4 | Today dashboard read path + early deploy | Done | 2026-10-23 | Dashboard reads own profile targets + confirmed meals for local YYYY-MM-DD. `npm test` 18 passed; lint/typecheck/build pass. Meal RLS: A sees 1 row, B sees 0, test row deleted. Deploy not included in this slice. |
| 5 | NL estimate API + confirm + meal insert | Done | 2026-10-23 | `gemini-3.5-flash-lite` JSON smoke returned `{"ok":true}`. `npm test` 24 passed; lint/typecheck/build pass. `/api/meals/estimate` is session-gated; items jsonb + denormalized totals persist as `confirmed`. |
| 6 | Photo capture + vision estimate (no retained photos) | Done | 2026-10-23 | Kept `gemini-3.5-flash-lite`; image+JSON smoke returned `foods_found: false` on a 1×1 PNG. `npm test` 28 passed; lint/typecheck/build pass. Photos compressed client-side, estimated via `/api/meals/estimate-photo`, confirmed with existing sheet, saved as `source=photo` without Storage. |
| 7 | Hands-free polish, errors, production deploy | Not started | | |
| 8 | Stretch only (must not delay core) | Not started | | |

Do not start a later phase until the previous is **Done**.
