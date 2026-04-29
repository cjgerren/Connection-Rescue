# ConnectionRescue Production Readiness Board

This board is for the current ConnectionRescue codebase in `travel-rescue-luxury`.

It reflects the code as checked on April 29, 2026, not the older `connection-rescue` demo app.

## MVP Definition

For an honest first production MVP, ConnectionRescue should do these things reliably:

1. A traveler can identify a flight or connection risk and submit contact details.
2. The backend can create and persist a paid rescue incident.
3. Admins can see active rescue incidents and take action.
4. Flight monitoring and rescue-task updates are persisted and auditable.
5. The app only exposes features that are actually backed by database schema, auth, and worker jobs.

Anything beyond that, especially automated rebooking or fully self-serve traveler account history, is post-MVP.

## Current Reality

What is already real:

- The frontend app builds for production.
- The backend has real Express routes for flight status, payments, webhooks, and concierge capture.
- Admin auth is wired to Supabase auth and admin RLS assumptions.
- Stripe checkout + webhook persistence flow is structurally present.

What is not yet production-ready:

- Public traveler identity is not real auth.
- The repo does not ship the Supabase schema that the app expects.
- The repo references multiple Supabase edge functions that are not present here.
- The local backend process on port `8787` must be verified against this repo before trusting runtime behavior.

## Now

### 1. Make the Supabase schema real

The app already assumes these tables exist:

- `bookings`
- `payment_events`
- `admin_users`
- `admin_audit_log`
- `rescue_tasks`
- `rescue_task_runs`
- `sms_inbound_log`
- `flight_polling_runs`
- `flight_status_snapshots`

Required work:

- Add migrations for every table used by frontend and backend code.
- Add indexes for booking lookup, traveler email lookup, polling timestamps, and rescue-task status.
- Add RLS policies for admin-only tables and traveler-owned tables.
- Document seed/setup steps for the first admin user.

Relevant code:

- [src/pages/Alerts.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/pages/Alerts.tsx:1)
- [src/pages/Admin.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/pages/Admin.tsx:1)
- [src/pages/AdminRescues.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/pages/AdminRescues.tsx:1)
- [backend/src/routes/payments.js](C:/Users/Dell/Projects/travel-rescue-luxury/backend/src/routes/payments.js:1)
- [backend/src/routes/webhooks.js](C:/Users/Dell/Projects/travel-rescue-luxury/backend/src/routes/webhooks.js:1)

### 2. Replace fake traveler access with real auth

Current public traveler access is not secure enough for production:

- traveler profile is stored in browser `localStorage`
- alerts access is email-based, not session-based
- backend routes do not currently enforce traveler ownership

Required work:

- Add a real traveler auth/session flow in the frontend.
- Replace email-only access in the alerts page with authenticated access.
- Add backend middleware that validates the Supabase bearer token.
- Tie bookings, alerts, and rescue history to a real authenticated user identity.

Relevant code:

- [src/contexts/TravelerContext.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/contexts/TravelerContext.tsx:1)
- [src/pages/Alerts.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/pages/Alerts.tsx:1)
- [backend/src/services/supabaseAdmin.js](C:/Users/Dell/Projects/travel-rescue-luxury/backend/src/services/supabaseAdmin.js:1)

### 3. Restore the missing edge-function layer or remove those features

The app currently references these edge functions:

- `verify-admin`
- `manage-admins`
- `send-booking-sms`
- `process-rescue-tasks`
- `parse-boarding-pass`

Required work:

- Add these functions to the repo, or
- hide/disable the features that depend on them until they exist

Relevant code:

- [src/hooks/useAdminAuth.ts](C:/Users/Dell/Projects/travel-rescue-luxury/src/hooks/useAdminAuth.ts:1)
- [src/pages/AdminTeam.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/pages/AdminTeam.tsx:1)
- [src/components/rescue/PersonalizeModal.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/components/rescue/PersonalizeModal.tsx:1)
- [src/pages/AdminRescues.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/pages/AdminRescues.tsx:1)

### 4. Validate the backend runtime against this repo

The current local process on `8787` appears stale or mismatched because its `/health` output does not match [backend/src/server.js](C:/Users/Dell/Projects/travel-rescue-luxury/backend/src/server.js:1).

Required work:

- stop the stale process on `8787`
- start `backend/src/server.js` directly from this repo
- verify `/health` reports `aviationstack`, `stripe`, and `supabase`
- verify checkout/webhook writes to the intended Supabase project

## Next

### 5. Finish the paid rescue flow end to end

Required work:

- confirm `create-checkout-session` produces valid live/test Stripe sessions
- confirm webhook completion writes `payment_events` and `bookings`
- confirm booking success page reads the persisted final state
- add explicit error handling for abandoned or failed checkouts

Relevant code:

- [src/components/rescue/ConfirmationBar.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/components/rescue/ConfirmationBar.tsx:1)
- [src/pages/BookingSuccess.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/pages/BookingSuccess.tsx:1)
- [backend/src/routes/payments.js](C:/Users/Dell/Projects/travel-rescue-luxury/backend/src/routes/payments.js:1)
- [backend/src/routes/webhooks.js](C:/Users/Dell/Projects/travel-rescue-luxury/backend/src/routes/webhooks.js:1)

### 6. Make monitoring and rescue ops trustworthy

Required work:

- define the polling pipeline schema completely
- persist flight status snapshots and polling runs
- make rescue-task transitions explicit and auditable
- verify admin queue actions actually drive worker behavior

Relevant code:

- [src/pages/Admin.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/pages/Admin.tsx:1)
- [src/pages/AdminRescues.tsx](C:/Users/Dell/Projects/travel-rescue-luxury/src/pages/AdminRescues.tsx:1)
- [supabase/cron/poll-flight-status.sql](C:/Users/Dell/Projects/travel-rescue-luxury/supabase/cron/poll-flight-status.sql:1)
- [supabase/cron/process-rescue-tasks.sql](C:/Users/Dell/Projects/travel-rescue-luxury/supabase/cron/process-rescue-tasks.sql:1)

### 7. Decide what stays in MVP

These surfaces need a deliberate keep-or-cut decision:

- boarding-pass parsing
- SMS-based rescue-task workflows
- public alerts history
- mobile packaging
- external CloudFront image dependencies

If a feature is not fully backed by schema, auth, and operations, it should be hidden until ready.

## Later

### 8. Performance and polish

- Split the large frontend bundle.
- Improve loading/error states around backend and Supabase outages.
- Add analytics for funnel steps: flight check, profile capture, checkout start, checkout success, rescue task creation.

### 9. Production operations

- add environment validation at startup
- add structured logging
- add error tracking
- add staging deploy checks
- add backup and rollback procedures

## Best Immediate Execution Order

1. Verify the backend process on `8787` is this repo, not a stale service.
2. Build the missing Supabase migrations and RLS policies.
3. Reintroduce or recreate the referenced edge functions.
4. Replace public traveler localStorage/email access with real auth.
5. Run the Stripe flow end to end against the real Supabase project.
6. Hide any feature that is still not backed by code and data.

## Launch Standard

ConnectionRescue is ready for a first production MVP when:

- one codebase is active
- one backend process is clearly the correct one
- one Supabase project has the full schema under version control
- traveler access is authenticated
- payment fulfillment is persisted and auditable
- admin rescue operations work without manual database patching
