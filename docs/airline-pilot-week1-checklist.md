# Airline pilot — week 1 checklist

Concrete build/demo plan for a **single-hub cancel** pilot of ConnectionRescue.

This is **not** a claim that the product is production- or airline-ready. Week 1 aims at a scripted, auditable demo: one disruption scenario, admin queue with CSV/PNR, passenger pick → deep-link handoff, Stripe test or $0 sponsored assist, and an ROI one-pager for call-center deflection.

**Scope lock:** one hub, one cancel/misconnect script, guidance + handoff only (tickets booked outside the app). Pitch **weeks-to-pilot**, not full IROPS / Amadeus–Sabre class.

Related: [dfw-pilot-cancel-scenario.md](./dfw-pilot-cancel-scenario.md), [dfw-pilot-feature-kill-list.md](./dfw-pilot-feature-kill-list.md), [production-readiness-board.md](./production-readiness-board.md), repo README.

---

## Day 0 — Decisions (Charles)

- [x] Hub + airport code for the pilot — **DFW** locked (see [dfw-pilot-cancel-scenario.md](./dfw-pilot-cancel-scenario.md))
- [x] Cancel script: inbound delayed/cancelled → missed connection → assist path — [dfw-pilot-cancel-scenario.md](./dfw-pilot-cancel-scenario.md)
- [x] Payment mode for pilot: **Stripe test** Rescue Assist ($14.99 look, no live charges) — $0 sponsored remains optional later
- [ ] Deep-link targets: airline site, OTA, or both (URLs / rules)
- [ ] PNR/CSV sample format from ops (columns: PNR, name, flight, contact, status)
- [ ] Staging hosts: frontend URL, backend URL, one Supabase project

---

## Day 1 — Scenario + honesty cuts

### Scenario pack
**DFW cancel/misconnect script:** [dfw-pilot-cancel-scenario.md](./dfw-pilot-cancel-scenario.md) (traveler + admin steps, DEMO itinerary, failure path, demo-day cold start).

- [ ] Write the traveler script (happy path + one failure: flight not found / checkout abandoned) — draft in scenario doc; Charles approves live flight swap
- [ ] Pick one sample itinerary (flight numbers, times, connection) that AviationStack can resolve in staging — DEMO placeholders in scenario doc until swapped
- [ ] Document “what the demo proves” vs “what it does not” (no in-app ticketing, no full rebooking automation) — see scenario doc §8

### Feature kill / hide list (MVP honesty)
Hide or disable until schema + workers exist (see readiness board). Full table: [dfw-pilot-feature-kill-list.md](./dfw-pilot-feature-kill-list.md) (open PR if not yet on `main`).

- [ ] Boarding-pass parsing (`parse-boarding-pass`)
- [ ] SMS rescue-task flows (`send-booking-sms`) unless explicitly in pilot
- [ ] Public alerts history that relies on email-only / localStorage identity
- [ ] Admin team flows that call missing `manage-admins` / `verify-admin` **or** stub them for staging only
- [ ] Any UI that implies automated rebooking

**Owner:** kill-list PR → Charles approves before merge.

---

## Day 2 — Supabase schema + RLS (minimum for pilot)

Ship migrations (version-controlled) for tables the app already assumes, at least:

- [ ] `bookings`
- [ ] `payment_events`
- [ ] `admin_users`
- [ ] `admin_audit_log`
- [ ] `rescue_tasks` (with created/updated/completed timestamps)
- [ ] Indexes: booking lookup, traveler email, rescue-task status, audit time
- [ ] RLS: admin-only for admin tables; traveler-owned rows only if traveler auth is in week 1
- [ ] Seed script: first admin user documented in `docs/` or README snippet
- [ ] Apply migrations to the **staging** Supabase project; verify from SQL editor

**Out of week 1 unless blocked:** full traveler Supabase auth (localStorage may remain for traveler UI if admin path is solid and labeled “demo identity”).

---

## Day 3 — Admin CSV / PNR queue + audit

- [ ] Admin upload: CSV of disrupted passengers (validate required columns)
- [ ] Queue UI: list rows with status (`new` / `in_progress` / `handed_off` / `done` / `failed`)
- [ ] On every status change: write `admin_audit_log` with actor, timestamp, before/after, note
- [ ] Manual “create rescue task” from a queue row
- [ ] Empty / bad CSV error states
- [ ] Smoke test: upload 10-row sample → claim → handoff → done; audit rows visible

**Charles:** provide real-ish PNR sample (redacted). **Agent:** schema + UI/API draft against sample.

---

## Day 4 — Passenger pick → deep-link handoff

- [ ] From queue or traveler assist flow: present curated options (rebook / hotel / lounge) matching current guidance mode
- [ ] “Continue on airline/OTA” opens deep-link in new tab with tracked handoff event
- [ ] Persist handoff: task status + audit timestamp + destination URL (no ticket purchase in-app)
- [ ] Copy: clear that booking completes on partner site; Rescue Assist is guidance/coordination fee or sponsored
- [ ] Demo proof: screenshot or admin log line showing handoff for the scripted passenger

---

## Day 5 — Stripe test **or** $0 sponsored flag

### If Stripe test
- [ ] Backend `create-checkout-session` against test keys
- [ ] Webhook `/api/webhooks/stripe` registered for staging
- [ ] `payment_events` + `bookings` written on `checkout.session.completed`
- [ ] Booking success page reads persisted `confirmed` state
- [ ] Abandoned checkout: explicit non-confirmed UI (no fake success)

### If $0 airline-sponsored
- [ ] Feature flag / env: skip Stripe; create sponsored booking/task with `amount_cents = 0` and `sponsored_by = airline_pilot`
- [ ] Same persistence + audit path as paid flow
- [ ] UI badge: “Sponsored assist — no charge”

### Always
- [ ] Confirm `RESCUE_SERVICE_FEE_CENTS` / copy matches chosen mode ($14.99 vs $0)
- [ ] No live `sk_live` keys on the pilot staging project

---

## Day 6 — Backend + staging glue

- [ ] One backend process from **this** repo (not a stale local `8788`); `/health` reports aviationstack, stripe (or sponsored), supabase
- [ ] `ALLOWED_ORIGINS` + `VITE_BACKEND_URL` match staging frontend
- [ ] AviationStack key on staging; scripted flight returns usable status
- [ ] Edge functions: **rebuild only what pilot needs** (`verify-admin` minimum) **or** hide dependent UI
- [ ] Cron/SQL for polling: only if demo requires live status refresh; else manual refresh is OK for week 1
- [ ] Staging deploy checklist run (`docs/deployment-checklist.md` subset)

---

## Day 7 — ROI one-pager + demo rehearsal

### ROI one-pager (call-center deflection)
- [ ] Draft 1 page: problem (IROPS call spike), pilot scope, traveler path, admin path
- [ ] Metrics placeholders Charles fills: avg handle time, cost/call, % deflectable, pilot volume
- [ ] Simple math: calls avoided × cost/call vs Rescue Assist / sponsored cost
- [ ] Competitive frame: weeks-to-pilot guidance tool vs multi-year PSS/IROPS suites
- [ ] Explicit non-goals slide/section

### Demo day run-through
- [ ] Cold start staging: frontend + backend + Supabase
- [ ] Run scripted cancel end-to-end (traveler + admin)
- [ ] Show audit timestamps and handoff proof
- [ ] Known-gaps slide (auth, missing functions, no in-app ticket)
- [ ] Capture bugs; park post-week-1 items on readiness board

---

## Done when (week 1 exit criteria)

1. Staging runs the **one-hub cancel** script without manual DB patching for the happy path  
2. Admin can upload CSV/PNR-style rows, change status, and see **audit timestamps**  
3. Passenger/option pick produces a **deep-link handoff** recorded in the queue  
4. Assist is either **Stripe test-paid** or **$0 sponsored**, persisted like a real booking  
5. ROI one-pager exists with blanks only for Charles’s cost numbers  
6. README or this doc states clearly: **not production-ready / not airline-certified**

---

## Split — agent vs Charles

| Agent (draft / check) | Charles (required) |
| --- | --- |
| This checklist + kill-list PR | Hub, scenario, payment mode |
| Migrations / RLS drafts | Staging Supabase project + apply secrets |
| Admin CSV queue + audit UX/API | Redacted PNR/CSV sample; column truth |
| Deep-link handoff flow + copy | Partner/airline deep-link rules |
| Stripe test wiring docs; $0 flag design | Stripe account; test vs sponsored call |
| ROI one-pager draft | Handle-time / cost-per-call; airline intros |
| Staging smoke script | Deploy credentials; first admin user |

---

## Week 2 preview (do not start until week 1 exits)

- Traveler real auth (replace localStorage)
- Remaining edge functions or permanent feature removal
- Flight polling snapshots + auditable rescue-task worker loop
- Second scenario or second hub
- Analytics on funnel steps

