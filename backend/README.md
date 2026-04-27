# ConnectionRescue API

The real backend for ConnectionRescue. **All travel API keys live here, never in the React bundle.**

## What it does

| Route | Method | Purpose |
| --- | --- | --- |
| `/health` | GET | Liveness + which integrations are configured |
| `/api/flights/status?flight=AA2487` | GET | Live flight status (AviationStack) |
| `/api/rescue/search` | POST | Duffel offer search → ranked rescue options |
| `/api/rescue/hold` | POST | Re-fetch a single Duffel offer (offers expire fast) |
| `/api/rescue/book` | POST | Internal: create the Duffel order (called by webhook) |
| `/api/payments/create-checkout-session` | POST | Stripe Checkout session (fare + $14.99 Rescue Assist fee) |
| `/api/payments/checkout-session/:sessionId` | GET | Checkout status + linked booking for the success page |
| `/api/feedback/concierge-interest` | POST | Save coming-soon concierge demand + optional waitlist details |
| `/api/webhooks/stripe` | POST | `checkout.session.completed` → Duffel order + DB write |

## Setup

```bash
cd backend
cp .env.example .env          # fill in real keys
npm install
npm start                     # http://localhost:8787
```

Then in the React app:

```
VITE_BACKEND_URL=http://localhost:8787
```

## Why a separate Node service?

- Duffel & Stripe **secret** keys cannot ship in `import.meta.env.VITE_*` — those are baked into the public JS bundle.
- The Stripe webhook needs the **raw** request body for signature verification, which is awkward inside Supabase Edge Functions.
- The Supabase **service-role** key bypasses RLS — keeping it server-side is the only safe place.

## Booking flow (what actually happens)

```
React app  ──/api/rescue/search──▶  backend ──Duffel──▶ ranked options
React app  ──/api/payments/create-checkout-session──▶  Stripe
                                                        │
                                                        ▼
                                              Stripe Checkout (hosted)
                                                        │
                                                        ▼ webhook
                                       backend /api/webhooks/stripe
                                                        │
                                                        ├─ Duffel /air/orders  → confirmation number
                                                        ├─ Supabase bookings INSERT
                                                        └─ Supabase rescue_runs UPDATE → 'booked'
```

The traveler is **never charged before** a checkout session is created, and we **never book a ticket before** the webhook confirms the payment cleared.

## Required Supabase tables

The MVP expects these tables (a migration helper is in `database/migrations/0001_init.sql` if present, otherwise run the SQL in the project's Supabase tab):

- `users`
- `traveler_profiles`
- `rescue_runs`
- `rescue_options`
- `bookings`
- `payment_events`
- `concierge_interest`
- `audit_logs`
- `admin_users`

## Disclaimer

ConnectionRescue is **not an airline**. We resell air tickets through Duffel
and route customer service back through the operating carrier. Flight
availability and pricing can change between search and order; we re-validate
the offer immediately before charging. Refunds and cancellations follow the
operating airline's published rules.
