# Hosting Environment Matrix

This file maps each runtime value to the place it belongs when you deploy the product.

## Recommended hosting split

- Frontend static hosting: Vercel, Netlify, or Cloudflare Pages
- Backend Node hosting: Railway, Render, Fly.io, or a container platform
- Database/auth/storage: Supabase

## Frontend host variables

Set these on the static frontend host:

| Variable | Example | Secret? | Notes |
| --- | --- | --- | --- |
| `VITE_BACKEND_URL` | `https://api.connectionrescue.app` | No | Public base URL for the API |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | No | Public Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | No | Public anon key, safe for browser/mobile |
| `VITE_RESCUE_SERVICE_FEE_CENTS` | `1499` | No | Public display/config value for Rescue Assist |

## Backend host variables

Set these on the backend Node host:

| Variable | Example | Secret? | Notes |
| --- | --- | --- | --- |
| `PORT` | `8787` | No | Host may inject its own port |
| `ALLOWED_ORIGINS` | `https://connectionrescue.app,https://www.connectionrescue.app` | No | Exact CORS allowlist |
| `FRONTEND_URL` | `https://connectionrescue.app` | No | Used for Stripe return URLs |
| `DUFFEL_API_KEY` | `duffel_live_xxx` | Yes | Never expose client-side |
| `DUFFEL_API_VERSION` | `v2` | No | Keep synced with Duffel usage |
| `AVIATIONSTACK_API_KEY` | `aviationstack_live_xxx` | Yes | Required for live flight status |
| `STRIPE_SECRET_KEY` | `sk_live_xxx` | Yes | Server-only |
| `STRIPE_APP_NAME` | `ConnectionRescue` | No | Added to Stripe metadata/descriptions for app-level reporting |
| `STRIPE_WEBHOOK_SECRET` | `whsec_live_xxx` | Yes | Server-only |
| `RESCUE_SERVICE_FEE_CENTS` | `1499` | No | Backend pricing source of truth for Rescue Assist |
| `SUPABASE_URL` | `https://your-project.supabase.co` | No | Shared project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Yes | Server-only, full privilege |
| `SUPABASE_ANON_KEY` | `eyJ...` | No | Used to validate incoming JWTs |

## Supabase project values

Retrieve these from Supabase:

- Project URL: `SUPABASE_URL` and `VITE_SUPABASE_URL`
- Anon key: `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`
- Service role key: `SUPABASE_SERVICE_ROLE_KEY`

## Stripe dashboard values

Retrieve these from Stripe:

- Secret key: `STRIPE_SECRET_KEY`
- Webhook signing secret: `STRIPE_WEBHOOK_SECRET`

The webhook endpoint should be:

```text
https://api.connectionrescue.app/api/webhooks/stripe
```

## Web + mobile shared values

The future mobile app will reuse these public runtime values:

- backend base URL
- Supabase URL
- Supabase anon key
- rescue service fee config

The mobile app must not embed:

- `DUFFEL_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AVIATIONSTACK_API_KEY`

## Launch order

1. Create the Supabase project and copy its URL/keys.
2. Set the backend host secrets first.
3. Deploy the backend and confirm `/health`.
4. Register the Stripe webhook against the deployed backend.
5. Set the frontend host variables.
6. Deploy the frontend.
7. Test booking end-to-end in production or a staging environment.
