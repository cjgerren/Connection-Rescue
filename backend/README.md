# ConnectionRescue API

The real backend for ConnectionRescue. **All provider API keys live here, never in the React bundle.**

## What it does

| Route | Method | Purpose |
| --- | --- | --- |
| `/health` | GET | Liveness + which integrations are configured |
| `/api/flights/status?flight=AA2487` | GET | Live flight status (AviationStack) |
| `/api/payments/create-checkout-session` | POST | Stripe Checkout session for Rescue Assist + optional hotel/lounge charges |
| `/api/payments/checkout-session/:sessionId` | GET | Checkout status + linked booking for the success page |
| `/api/feedback/concierge-interest` | POST | Save coming-soon concierge demand + optional waitlist details |
| `/api/webhooks/stripe` | POST | `checkout.session.completed` → booking record write |

## Setup

```bash
cd backend
cp .env.example .env
npm install
npm start
```

Then in the React app:

```text
VITE_BACKEND_URL=http://localhost:8787
```

## Why a separate Node service?

- Stripe **secret** keys cannot ship in `import.meta.env.VITE_*`.
- AviationStack keys should stay server-side.
- The Stripe webhook needs the **raw** request body for signature verification.
- The Supabase **service-role** key bypasses RLS and must stay on the server.

## Payment flow

```text
React app  ──/api/flights/status──▶  backend ──AviationStack──▶ live status
React app  ──/api/payments/create-checkout-session──▶  Stripe
                                                        │
                                                        ▼
                                              Stripe Checkout (hosted)
                                                        │
                                                        ▼ webhook
                                       backend /api/webhooks/stripe
                                                        │
                                                        ├─ Supabase bookings INSERT
                                                        └─ Supabase payment_events UPDATE
```

The traveler is **never charged before** a checkout session is created. In the current AviationStack-only architecture, replacement flights are selected in the app as guidance and purchased directly with the airline outside ConnectionRescue.

## Required Supabase tables

- `bookings`
- `payment_events`
- `concierge_interest`
- `audit_logs`
- `admin_users`

## Disclaimer

ConnectionRescue is **not an airline**. The app provides live flight status, self-serve disruption guidance, and optional paid rescue assistance. If a traveler selects a replacement flight in AviationStack mode, the actual airline ticket purchase happens directly with the airline or supplier outside ConnectionRescue.
