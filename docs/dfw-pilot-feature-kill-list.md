# DFW airline pilot — Day-1 feature kill-list

**Status:** draft for Charles approval (merge when approved).  
**Related:** [airline-pilot-week1-checklist.md](./airline-pilot-week1-checklist.md) (Day 1), [production-readiness-board.md](./production-readiness-board.md).

This document is an honesty cut for the **DFW** single-hub pilot. It is **not** a claim that ConnectionRescue is production-ready or airline-certified.

---

## Pilot scope (locked)

| Dimension | Pilot value |
| --- | --- |
| Hub | **DFW** only |
| Payment | **Stripe test** checkout — $14.99 Rescue Assist look, **no real money** (`sk_test` / test mode) |
| Product mode | **Guidance + handoff only** — traveler picks options; tickets / hotel / lounge purchase complete **outside** the app (airline / OTA / partner) |
| Ops | Admin queue + audit for the scripted cancel/misconnect; CSV/PNR path per week-1 checklist |
| Explicit non-goals | Full IROPS suite, Amadeus/Sabre class, automated in-app rebooking, live SMS at scale, production traveler identity |

Live reference (demo): https://connection-rescue.vercel.app

---

## Kill / hide table

Hide or do not demo these on Day 1 unless Charles explicitly re-opens them. Prefer soft hide (nav/copy/demo script) over large code deletions unless a one-line flag already exists (none today).

| Feature | Why hide / cut | How to hide (route / flag / file) | Owner |
| --- | --- | --- | --- |
| **Boarding-pass parse** (`parse-boarding-pass`) | OCR needs OpenAI (or similar) env; unconfigured builds fall back to **demo** data. Scanned fields land in **browser `localStorage`** via `TravelerContext` — not production traveler auth. Easy to over-claim “live scan” in a pilot demo. | Soft-hide: skip Personalize / scan in the demo script; use Flight Search with a known DFW itinerary instead. Code: `src/components/rescue/PersonalizeModal.tsx` (invokes function), `src/contexts/TravelerContext.tsx` (localStorage), `supabase/functions/parse-boarding-pass/`. Optional later: gate Personalize CTA behind env. | **Charles** approve hide; agent may soft-hide CTA in a follow-up PR if approved |
| **SMS rescue send** (`send-booking-sms`) | Function returns **501** when Twilio env is missing; pilot does not need outbound SMS. Inbound log UI can confuse reviewers. | Soft-hide: do not open `/admin/sms` in the demo; de-emphasize SMS links from admin chrome. Code: `src/pages/AdminSms.tsx`, route in `src/App.tsx`, links in `src/pages/Admin.tsx` / `AdminRescues.tsx`, `supabase/functions/send-booking-sms/`. | **Charles** approve; agent soft-hide nav if approved |
| **Admin team mutations** (`manage-admins` + `/admin/team`) | Needs deployed edge function + seeded owner/`admin_users`. Invite/role/revoke is out of week-1 demo path; misfire risks locking out the only admin. | Soft-hide: single seeded admin for pilot; do not demo `/admin/team`. Code: `src/pages/AdminTeam.tsx`, `src/hooks/useAdminAuth.ts` (`verify-admin`), `supabase/functions/manage-admins/`, `verify-admin/`. Keep `verify-admin` only if staging admin sign-in depends on it. | **Charles** approve (seed admin vs hide team UI) |
| **`process-rescue-tasks` worker / force-run** | Worker + cron must be deployed and wired; options can be synthetic. Auto-processing implies automation the pilot does not promise. | Soft-hide: admin claims tasks / handoff manually; do not demo “force process” / worker tick panel. Code: `src/pages/AdminRescues.tsx` (invoke), `supabase/functions/process-rescue-tasks/`, `supabase/cron/process-rescue-tasks.sql`. | **Charles** approve; agent can soft-hide force-run control later |
| **Public alerts history** (`/alerts`) | Traveler path uses email OTP (`useTravelerAuth`), then loads bookings by email. `flight_polling_runs` RLS is **admin-select** in migrations — traveler timeline is fragile / empty / wrong for pilot honesty. Still adjacent to “account history” without full traveler auth. | Soft-hide Header bell → `/alerts` for pilot demos (`src/components/rescue/Header.tsx`). Route: `src/pages/Alerts.tsx`, `src/App.tsx`. Do not pitch as self-serve history. | **Charles** approve hide; agent soft-hide link if approved |
| **Copy / UI that implies automated in-app rebooking or ticket purchase** | Marketing and CTA labels overstate guidance mode: “Book Now”, “Buy Pass”, “lined up your recovery”, “Same-day rebook rate”, HTML meta “rebook flights”, tab “Rebook Flight”. Pilot must say: **guidance + handoff; tickets outside the app**. | Demo script + copy pass (prefer wording over big UI rewrite). Hot spots: `src/components/rescue/Hero.tsx`, `HotelRescue.tsx` (“Book Now” / “Booked”), `LoungeAccess.tsx` (“Buy Pass”), `Header.tsx` tab label, `src/pages/About.tsx` stats, `index.html` meta, `Footer.tsx`. Prefer “Select” / “Continue with airline” / “Guidance only”. | **Charles** approve final wording; **agent** may draft a small copy PR after approval |
| **Traveler profile as production identity** | `TravelerContext` persists boarding-pass profile in `localStorage` (`cr_traveler_profile`-style key). Fine as **demo identity** only for week 1. | Label in demo/ops notes as demo identity; do not claim secure traveler accounts. Code: `src/contexts/TravelerContext.tsx`. Full auth is week-2+ per checklist. | **Charles** (messaging); no code required for Day 1 |
| **Airport manual “live” status rows for fragile surfaces** | `/airport-manual` marks boarding-pass scan, team, and several edge functions as **live**, which conflicts with this kill-list if those paths are not in the pilot script. | Soft-hide page from pilot nav/demo, or treat as internal-only. Code: `src/pages/AirportManual.tsx`. | **Charles** approve |

**No one-line feature flag exists today** (`VITE_*` flags for these surfaces were not found). Day-1 default: **documentation + demo script**. Code hides only after Charles approves specific rows.

---

## KEEP for DFW pilot

These stay in the demo path (guidance + handoff; Stripe test):

| Keep | Notes / primary code |
| --- | --- |
| **Flight status** | AviationStack via Express backend (preferred) or `flight-status` edge fallback. `src/components/rescue/FlightSearch.tsx`, `src/lib/api.ts`, `backend/src/routes/flights.js`. Script a DFW-resolvable itinerary. |
| **Assist guidance** | Curated rebook / hotel / lounge options in **guidance mode** (not ticket inventory). `FlightRebook.tsx`, `HotelRescue.tsx`, `LoungeAccess.tsx`, `RescuePlan.tsx`. Banner already notes airline purchase for flights. |
| **Stripe test checkout** | Rescue Assist fee (~$14.99 via `RESCUE_SERVICE_FEE_CENTS` / `VITE_RESCUE_SERVICE_FEE_CENTS`). `ConfirmationBar.tsx`, `backend/src/routes/payments.js`, webhook → bookings. **Test keys only** — no `sk_live` on pilot staging. |
| **Admin queue** | Monitoring / rescues / audit if present and seeded: `/admin`, `/admin/rescues`, `/admin/audit`. Depends on Supabase schema + admin user. |
| **Deep-link handoff** | Week-1 Day 4 deliverable: option pick → open airline/OTA URL + audit handoff. Until built, stay honest: ConfirmationBar already states replacement airfare is purchased with the airline. Do **not** claim in-app ticket purchase. |
| **Booking success / cancelled pages** | Show persisted Stripe test outcome; abandoned checkout must not look confirmed. `/booking-success`, `/booking-cancelled`. |

---

## Explicit non-claims

Do **not** say (in pitch, UI, or demo):

1. ConnectionRescue is **production-ready** or **airline-certified**.
2. The app **buys tickets**, holds airline inventory, or completes PSS/IROPS rebooking in-app.
3. Boarding-pass OCR / SMS / alerts history / admin team are **pilot-backed** unless Charles re-opens that row above after staging proof.
4. Traveler `localStorage` profile equals **secure authenticated identity**.
5. Stripe test checkout is a **live charge** or a substitute for airline ticket payment.
6. Edge function **source in this repo** means the function is **deployed and configured** on the pilot Supabase project (verify deploy separately).

Safe framing: *“DFW guidance pilot — status + curated options + Stripe test assist fee + admin handoff; tickets outside the app.”*

---

## Code-path notes (exploration, Oct 2026)

Surprises vs older readiness board wording:

- Edge function **source exists** under `supabase/functions/` (`parse-boarding-pass`, `send-booking-sms`, `manage-admins`, `verify-admin`, `process-rescue-tasks`, plus `flight-status` / `send-booking-email`). The readiness board’s “missing from repo” item is **stale**; the pilot risk is **deploy / secrets / ops**, not empty folders.
- `send-booking-sms` is real Twilio code but returns **501** when Twilio is unset — treat as **cut for pilot**, not “missing file.”
- `/alerts` improved toward email **OTP** (`useTravelerAuth`), but traveler timeline still depends on email-scoped bookings and admin-oriented polling data — still **hide for honesty**.
- `src/lib/api.ts` can fall back to a `create-checkout-session` **edge** invoke; the **supported** path is Express `POST /api/payments/create-checkout-session`. No `create-checkout-session` folder under `supabase/functions/` in this tree.
- Hotel **“Book Now”** / lounge **“Buy Pass”** only toggle selection into the Rescue Assist cart — they do not purchase inventory. Labels are the honesty problem.

---

## Approval

- [ ] Charles approves this kill-list (or edits the table) before Day-1 demo script is final  
- [ ] Optional follow-up PR: soft-hide approved nav/CTAs only (no large feature deletion)  
- [ ] Week-1 checklist Day 1 kill-list checkbox can be marked done once this doc is merged  

**Owner of merge:** Charles. Agent drafts only.
