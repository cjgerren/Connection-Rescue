# ConnectionRescue Airport Operations Manual

## Purpose
This manual is for airport staff who need a fast, reliable way to guide disrupted travelers through ConnectionRescue.

Use this for:
- Gate agents
- IROP / disruption desk staff
- Supervisors
- Concierge / premium support staff

## 60-Second Barney Walkthrough
1. Open the app home page (`/`).
2. Tap **Get started** in the profile modal.
3. Scan boarding pass (or use demo fallback if scan fails).
4. Allow location (recommended for better gate/lounge relevance).
5. Enter flight number and tap **Track**.
6. Pick one flight option.
7. Add hotel and lounge only if needed.
8. Tap **Confirm** in the green bar.
9. Enter traveler email (+ optional phone), complete Stripe checkout.
10. Confirm success page shows booking summary.

If checkout is canceled, use `/booking-cancelled` instructions and retry.

## Traveler Features
- Boarding-pass scanning and review/edit.
- Location-assisted rescue personalization.
- Live flight status and delay insight.
- 3-step rescue flow (flight, hotel, lounge).
- Secure Stripe checkout.
- Success and canceled payment flows.
- Alerts timeline with OTP sign-in (`/alerts`).

## Admin/Ops Features
- `/admin`:
  - Polling health, run charts, snapshot table, run detail drawer.
- `/admin/rescues`:
  - Rescue queue, resend/cancel actions, worker run visibility.
- `/admin/team`:
  - Owner-only invite/role/revoke admin controls.
- `/admin/audit`:
  - Admin and rescue action log.
- `/admin/sms`:
  - SMS inbound visibility page (send-path still partial).

## Backend API Map
- `GET /health` — service/provider health flags.
- `GET /api/flights/status` — live flight lookup.
- `GET /api/flights/delay-insight` — delay insight model output.
- `POST /api/delay-reports` — traveler signals + recompute insight.
- `POST /api/payments/create-checkout-session` — creates Stripe checkout.
- `GET /api/payments/checkout-session/:sessionId` — status lookup.
- `POST /api/webhooks/stripe` — payment completion persistence.
- `POST /api/feedback/concierge-interest` — concierge demand capture.

## Supabase Edge Function Map
- `verify-admin` — admin access verification/promote.
- `manage-admins` — owner-only team management.
- `parse-boarding-pass` — OCR-style boarding pass extraction.
- `process-rescue-tasks` — queue processor and option email sender.
- `send-booking-email` — admin replay/manual send path.
- `send-booking-sms` — currently returns not-configured stub.

## Troubleshooting
- Flight not found:
  - Continue with manual rescue guidance and complete plan.
- Boarding pass scan fails:
  - Use clearer image or demo fallback, then edit fields manually.
- Checkout doesn’t open:
  - Verify backend URL/CORS/env and retry.
- Success page waiting too long:
  - Webhook may be in-flight; wait 10-15s and refresh status.
- Admin login blocked:
  - Confirm invite/role in `/admin/team`.
- SMS expected:
  - MVP is email-first; SMS send-path not fully enabled.

## MVP Boundaries
- Live:
  - Delay insight, flight tracking, rescue plan, Stripe checkout, rescue queue operations.
- Partial:
  - SMS send integration.
- Intentional:
  - Flight options are guidance; airline ticket purchase is completed directly with airline.
