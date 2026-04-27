# Deployment Checklist

This project has two production deployables:

- the static frontend
- the Node backend

## 1. Frontend production env

Create `.env.production` from `.env.production.example`:

```bash
VITE_BACKEND_URL=https://api.connectionrescue.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-supabase-anon-key
VITE_RESCUE_SERVICE_FEE_CENTS=1499
```

Notes:

- `VITE_*` values are public runtime config.
- `VITE_SUPABASE_ANON_KEY` is expected to be public in a browser app.
- Do not put Stripe, Duffel, or service-role secrets in the frontend env.

## 2. Backend production env

Create `backend/.env` from `backend/.env.production.example`:

```bash
PORT=8787
ALLOWED_ORIGINS=https://connectionrescue.app,https://www.connectionrescue.app
FRONTEND_URL=https://connectionrescue.app
DUFFEL_API_KEY=duffel_live_xxx
DUFFEL_API_VERSION=v2
AVIATIONSTACK_API_KEY=aviationstack_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxx
RESCUE_SERVICE_FEE_CENTS=1499
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-public-supabase-anon-key
```

Secrets that must stay server-side:

- `DUFFEL_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AVIATIONSTACK_API_KEY`

## 3. Supabase requirements

Before launch, provision your own Supabase project and create the tables the app expects.

Minimum backend-facing tables referenced in code/docs:

- `rescue_runs`
- `rescue_options`
- `bookings`
- `payment_events`
- `concierge_interest`
- `audit_logs`
- `admin_users`

Additional app/admin surfaces imply more tables and jobs if you keep those features enabled:

- `flight_polling_runs`
- `flight_status_snapshots`
- `sms_inbound_log`
- `rescue_tasks`
- `rescue_task_runs`
- `admin_audit_log`

You also need to decide whether these frontend-called edge functions will exist in production:

- `verify-admin`
- `manage-admins`
- `send-booking-sms`
- `process-rescue-tasks`
- `parse-boarding-pass`

If they will not exist at launch, hide or remove the corresponding UI paths before release.

## 4. Stripe requirements

- Create a live Stripe account and obtain `STRIPE_SECRET_KEY`.
- Register a webhook endpoint pointing to:

```text
https://api.connectionrescue.app/api/webhooks/stripe
```

- Copy the resulting signing secret into `STRIPE_WEBHOOK_SECRET`.
- Validate success/cancel URLs match your public frontend domain.

## 5. Duffel requirements

- Create a Duffel account.
- Start with a test key in staging.
- Move to a live key only when checkout, webhook, and booking persistence are validated end-to-end.

## 6. Flight status requirements

- Create an AviationStack account.
- Put the live key in `AVIATIONSTACK_API_KEY`.
- Verify real status results for representative carriers you plan to support.

## 7. Domain and hosting

Frontend:

- host the built `dist/` output on your static host or CDN
- point the app domain at that host

Backend:

- deploy the Express app behind HTTPS
- expose `/health`
- expose `/api/*`
- restrict CORS with `ALLOWED_ORIGINS`

## 8. Remaining launch decisions

- The app still hotlinks imagery from external CloudFront URLs in `src/data/rescueData.ts`.
- Decide whether to keep that dependency or move the assets under your own control.
- The public flow is now backend-driven, but admin, SMS, and boarding-pass parsing still depend on missing backend/Supabase pieces.

## 9. Prelaunch verification

Run these before production cutover:

```bash
npm run build
cd backend
npm start
```

Then verify:

1. `GET /health` reports `duffel=true`, `stripe=true`, and `supabase=true`.
2. Flight status search returns real data.
3. Checkout creates a Stripe session.
4. Stripe webhook writes a booking row.
5. `/booking-success` resolves to a `confirmed` booking.

## 10. Post-launch hardening

Still recommended after the first production release:

- split large frontend chunks
- resolve lint/type issues across the admin code
- add monitoring and error tracking
- add automated tests around checkout, webhook, and booking creation
