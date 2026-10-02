# DFW pilot — cancel / misconnect demo scenario

**Status:** Day-1 scenario pack (draft for Charles).  
**Hub:** DFW (locked)  
**Payment:** Stripe **test** checkout — Rescue Assist looks like **$14.99**, no real charge  
**Mode:** Guidance + deep-link handoff only (tickets purchased **outside** the app)

This is **not** a claim that ConnectionRescue is production-ready or airline-certified.

Related:

- [airline-pilot-week1-checklist.md](./airline-pilot-week1-checklist.md)
- [dfw-pilot-feature-kill-list.md](./dfw-pilot-feature-kill-list.md) (Day-1 honesty cuts; may land via PR #2 if not yet on `main`)
- Live demo host: https://connection-rescue.vercel.app

---

## 1. Scope

| Item | Value |
| --- | --- |
| Story | Single-hub **DFW** cancel → missed connection → Rescue Assist |
| Traveler outcome | Sees disruption risk, pays **test** Rescue Assist fee, picks curated options, completes booking on **airline/OTA** (deep-link handoff) |
| Admin outcome | Sees passenger in queue (CSV/PNR or manual), claims row, audit timestamps, records handoff |
| Explicit non-goals | In-app ticket purchase, full IROPS/PSS, boarding-pass OCR, SMS rescue, public alerts history (see kill-list) |

---

## 2. Cast

| Role | Persona | Notes |
| --- | --- | --- |
| **Traveler** | **Jordan Hale** — connecting at DFW same day | Demo email: `jordan.hale+dfw-pilot@example.com`. Optional phone: `+1 214 555 0142`. Do **not** use Personalize / boarding-pass scan (kill-list). |
| **Admin operator** | Ops console user on staging (seeded `admin_users`) | Sign in at `/admin`. Soft-hide `/admin/team`, `/admin/sms`, `/alerts` per kill-list. |
| **AviationStack** | Must return usable status for the **inbound** flight used in the live search step | Prefer a real flight that resolves in staging. Placeholders below are **DEMO** until swapped. If lookup fails, use failure path §6 or **Continue with manual rescue plan**. |

**What AviationStack should return (happy path):** inbound into DFW with disrupted status (`cancelled`, `canceled`, or material delay) so the Hero / delay insight surfaces risk and **Start Rescue Plan** / recovery CTAs make sense. Outbound connection is narrative for the script; the product today looks up **one** flight number at a time.

---

## 3. Sample itinerary (DEMO placeholders)

> **All flight numbers below are DEMO placeholders.** Staging must replace them with flights AviationStack can resolve on demo day. Times are illustrative Central Time (America/Chicago).

| Leg | Flight (DEMO) | Route | Sched. (CT) | Scripted status |
| --- | --- | --- | --- | --- |
| Inbound | **DEMO-AA1421** | LAS → **DFW** | Arrive ~13:40 | **Cancelled** (or delay ≥ 120 min) — traveler stuck short of connection |
| Outbound (connection) | **DEMO-AA2487** | **DFW** → LGA | Depart ~15:55 | Still “operating” but **missed** if inbound fails — narrative connection risk |
| PNR (DEMO) | **DEMOCR1** | — | — | Jordan Hale / 1 pax / contact as above |

**Plausible connection story:** Jordan booked LAS→DFW→LGA same day. Inbound cancel/long delay burns MCT at DFW; outbound AA2487 cannot be made. ConnectionRescue surfaces recovery guidance; airline ticket change happens on the airline site after handoff.

**UI hint:** header search placeholder already uses `AA2487` (`FlightSearch`). Prefer swapping **inbound** DEMO-AA1421 to a real cancelled/delayed DFW arrival for the live lookup; keep outbound as story context.

### How to swap to live-feed flights

1. On staging, open the app and try candidate American (or other) flights into DFW in the header **Flight #** field (optional date).
2. Pick one that returns live status (not “flight not found”) and, for the happy path, a disrupted status if possible.
3. Update this doc’s table: replace `DEMO-AA1421` / `DEMO-AA2487` with real numbers + date; keep the **PNR DEMOCR1** / Jordan Hale persona unless ops provides a redacted sample.
4. Rehearse once cold (see §7) before showing airline stakeholders.
5. If no disrupted live flight is available that day, either (a) use **Continue with manual rescue plan** after a successful lookup of a on-time flight and narrate cancel, or (b) run the failure path for honesty — do **not** fake a cancelled badge in the DB.

---

## 4. Happy path — traveler (step-by-step)

Assume kill-list soft-hides are respected: **no** boarding-pass Personalize, **no** `/alerts` pitch.

| Step | Action | Expected UI (verified in code) |
| --- | --- | --- |
| 1 | Open staging frontend (e.g. https://connection-rescue.vercel.app or pilot host) | Home / Index with Header + Hero |
| 2 | In header search, enter the **live-swapped inbound** flight (placeholder field: `Flight # e.g. AA2487`); optional date | `FlightSearch` compact search |
| 3 | Wait for live / delay insight | Hero shows live status; if disrupted: copy like “Your flight {num} from {from} to {to} is {status}…” and CTA **Start Rescue Plan**. Delay insight may show actions such as **Show recovery options** / **Start rescue now** (`DelayInsightCard`) |
| 4 | Click **Start Rescue Plan** (or scroll to rescue sections) | Tabs: **Rescue Plan** · **Rebook Flight** · **Hotels** · **Lounges** |
| 5 | On **Rebook Flight**, pick one curated option | Section title **Rebook to {city}**; option button **Choose option** → **Selected**; badge **Guidance only** / “Book directly with airline” when price is guidance |
| 6 | (Optional) Select a hotel (**Book Now** → **Booked** — selection only, not a real hotel booking) and/or lounge (**Buy Pass** — selection only) | Bottom bar appears: **Rescue Plan Active — N/3 confirmed** with total including Rescue Assist |
| 7 | Click bottom bar **Confirm** (not Demo Mode) | Sheet: **Confirm rescue booking** · **Secure checkout via Stripe** · line **Rescue Assist fee** (~$14.99) · email + optional mobile · honesty copy that replacement airfare is purchased with the airline |
| 8 | Enter Jordan’s demo email; click **Pay $X.XX securely** | Button shows **Redirecting to Stripe…** then Stripe Checkout (**test** mode) |
| 9 | Complete Stripe **test** payment (test card) | Redirect to `/booking-success?session_id=…` → **Booking confirmed** / **You're all set.** after status `paid` / `confirmed` / `booked` |
| 10 | Deep-link handoff | **Intended (week-1 Day 4):** curated option → “Continue on airline/OTA” opens partner URL + admin audit of handoff. **Today (exists):** traveler is told to purchase the flight with the airline; there is **no** first-class deep-link handoff control yet — narrate handoff and/or use admin path §5 TBD until Day 4 ships |

**Do not** click Header **Demo Mode** / **Try Guided Demo** for the airline pilot script (that path uses **Finish Demo** and skips Stripe).

---

## 5. Admin path

### Exists today (code)

| Surface | Route / file | What you can show |
| --- | --- | --- |
| Admin gate | `/admin` · `AdminAuthGate` | Sign-in for seeded admin |
| Monitoring | `/admin` · `Admin.tsx` | Polling runs / bookings overview (if staging data present) |
| Rescue queue | `/admin/rescues` · `AdminRescues.tsx` | Tasks with statuses such as `queued`, `options_sent`, `awaiting_payment`, `paid`, `confirmed`, …; actions **Re-send** / **Cancel**; some `admin_audit_log` writes on those actions |
| Audit log | `/admin/audit` · `AdminAudit.tsx` | Timeline of admin mutations (`rescue_resend`, `rescue_cancel`, team actions, etc.) |

After traveler checkout succeeds, admin can open `/admin` or `/admin/rescues` and point at the booking / task tied to `jordan.hale+dfw-pilot@example.com` and show timestamps.

### TBD vs exists (Day 3–4 intended behavior)

| Capability | Status | Script when missing |
| --- | --- | --- |
| CSV / PNR upload queue | **TBD** — no CSV upload UI in `src/pages` yet (week-1 Day 3) | Narrate: “Ops uploads disrupted passengers”; show sample row below in a slide or spreadsheet; or insert a `rescue_tasks` / bookings row in staging SQL for the demo |
| Statuses `new` → `in_progress` → `handed_off` → `done` | **TBD** — current queue uses payment/options-oriented statuses | Narrate claim → handoff; show closest existing status + audit row |
| Deep-link handoff recorded (URL + audit) | **TBD** — week-1 Day 4 | Operator opens airline rebook URL manually; note in audit payload or spoken “handoff at {time}”; ship real control before stakeholder demo if possible |
| Sample CSV columns (Charles / ops) | **TBD** until ops format locked | Use interim columns below |

**Interim sample CSV row (DEMO):**

```csv
pnr,passenger_name,inbound_flight,outbound_flight,hub,contact_email,contact_phone,status,notes
DEMOCR1,Jordan Hale,DEMO-AA1421,DEMO-AA2487,DFW,jordan.hale+dfw-pilot@example.com,+12145550142,new,Inbound cancel - missed DFW connection - guidance pilot
```

**Intended Day 3–4 admin script (when UI lands):**

1. Upload CSV (or open queue with seeded row for DEMOCR1).
2. **Claim** Jordan’s row → status `in_progress`; `admin_audit_log` shows actor + timestamp.
3. Align with traveler assist / option pick.
4. Mark **handed_off** when deep-link opens; persist destination URL + time.
5. Close as `done`; show audit trail on `/admin/audit`.

Until then: traveler Stripe success + existing `/admin/rescues` + `/admin/audit` is the honest admin slice.

---

## 6. One failure path (pick one for the live room)

### Option A — Flight not found

1. Enter a nonsense flight number (e.g. `ZZ9999`) in header search.
2. Expect error path copy from `FlightSearch`: live lookup did not return a match; CTA **Continue with manual rescue plan**.
3. Continuing still allows guidance selections + checkout if desired — or stop here to prove honesty (no fake “cancelled” invent from thin air).

### Option B — Abandoned checkout (preferred second beat after happy path)

1. Reach **Confirm rescue booking** → **Pay $… securely** → Stripe test Checkout.
2. Click Stripe cancel / back so the app returns to `/booking-cancelled`.
3. Expect: **Checkout cancelled** · **No charge was made.** · “You exited Stripe before completing payment, so your rescue plan was not booked.”
4. Prove: **no** `/booking-success` confirmation, **no** paid booking row for that session. Traveler can **Try again** via Confirm on the rescue bar.

Do **not** show a fabricated success screen on abandon.

---

## 7. Demo day checklist (~5–10 min cold start)

- [ ] Staging frontend URL + backend `/health` (aviationstack, stripe, supabase) from **this** repo
- [ ] Stripe **test** keys only; fee env ≈ 1499 cents; no `sk_live`
- [ ] Supabase staging: migrations applied; one admin user can sign in at `/admin`
- [ ] Kill-list soft-hides respected in the spoken script (no OCR / SMS / alerts / team tour)
- [ ] Live-swapped inbound flight number written on the run sheet (replace DEMO-AA1421)
- [ ] Stripe test card ready; webhook delivering to staging
- [ ] Browser: one traveler window + one admin window (or two browsers)
- [ ] Run happy path once; run abandon-checkout once
- [ ] Know the one slide: proves vs does not prove (§8)
- [ ] Deep-link URL for airline (even if handoff UI is TBD) bookmarked

---

## 8. What this demo proves vs does not prove

### Proves

- A DFW-centered cancel → misconnect **story** can be walked end-to-end in guidance mode
- Live flight lookup can feed disruption UI when AviationStack resolves the flight
- Traveler can assemble a rescue plan and pay a **test** Rescue Assist fee via Stripe
- Abandoned checkout does **not** look like success
- Admin can observe bookings / rescue tasks / some audit events on staging

### Does not prove

- Production readiness or airline certification
- In-app ticket purchase, inventory hold, or automated rebooking
- Boarding-pass OCR, SMS rescue, or secure traveler account history
- Full CSV/PNR ops queue + deep-link handoff audit (until Day 3–4 land)
- Live money movement or call-center deflection ROI (numbers stay on the ROI one-pager)

Safe one-liner: *“DFW guidance pilot — status, curated options, Stripe test assist, handoff outside the app.”*

---

## 9. Owner split

| Item | Owner |
| --- | --- |
| Approve scenario + DEMO → live flight swap | **Charles** |
| Keep this doc in sync with UI labels | Agent |
| CSV column truth / redacted PNR sample | **Charles** / ops |
| Day 3–4 CSV queue + deep-link handoff build | Agent after Charles unlocks |
| Kill-list compliance during demo | Both (see kill-list doc) |
