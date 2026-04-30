# ConnectionRescue

ConnectionRescue is a React + Vite frontend with a separate Express backend for live flight status, rescue guidance checkout, and webhook-driven payment confirmation.

## Architecture

- `src/`: customer app, legal pages, alerts, and admin UI
- `backend/`: Express API for flight status, checkout, feedback capture, and Stripe webhook handling
- `supabase/cron/`: SQL for scheduled polling / rescue-task jobs

The intended production model is:

1. Deploy the frontend as a static site.
2. Deploy the backend as a Node service.
3. Point the frontend at the backend with `VITE_BACKEND_URL`.
4. Use your own Supabase project for persistence, auth, alerts, and admin data.

## Frontend env

Copy `.env.example` to `.env` and set:

```bash
VITE_BACKEND_URL=https://api.your-domain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_RESCUE_SERVICE_FEE_CENTS=1499
```

## Backend env

Copy `backend/.env.example` to `backend/.env` and set:

```bash
PORT=8787
ALLOWED_ORIGINS=https://app.your-domain.com
AVIATIONSTACK_API_KEY=aviationstack_key
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_...
RESCUE_SERVICE_FEE_CENTS=1499
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key
FRONTEND_URL=https://app.your-domain.com
```

## Local run

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd backend
npm install
npm start
```

Production build:

```bash
npm run build
```

## Production checklist

- Configure real `Stripe`, `AviationStack`, and `Supabase` credentials.
- Create the required Supabase tables and RLS policies used by the app and admin pages.
- Deploy the Stripe webhook to `/api/webhooks/stripe` and register the live webhook secret.
- Confirm `ALLOWED_ORIGINS` matches your frontend domain exactly.
- Replace or formally keep the external CloudFront image URLs in `src/data/rescueData.ts`.
- Decide whether all Supabase edge functions referenced by admin / scanning flows will exist in production, or hide those features until they do.
- Review legal pages, support email addresses, and business copy before launch.

## Deployment docs

- `docs/deployment-checklist.md`
- `docs/hosting-env-matrix.md`
- `docs/mobile-app-plan.md`
- `docs/delay-insight-engine-spec.md`
- `docs/production-readiness-board.md`
- `.env.production.example`
- `backend/.env.production.example`

## Current status

- Frontend production build passes.
- Public checkout now uses the backend instead of relying on a missing frontend-only checkout function.
- Booking success polling is aligned with backend `confirmed` statuses.
- Flight rescue is now AviationStack-driven guidance mode: live flight status plus curated rebooking suggestions, with actual airline ticket purchase handled outside the app.
