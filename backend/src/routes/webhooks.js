// /api/webhooks/stripe — handles Stripe events.
//
// Critical: the body must be the *raw* buffer for signature verification,
// so this router is mounted BEFORE express.json() in server.js using
// express.raw({ type: 'application/json' }).
//
// On `checkout.session.completed` we:
//   1. mark payment_events row as paid
//   2. write a `bookings` row for the paid rescue-assistance incident
//   3. capture audit context for follow-up

import { Router } from 'express';
import Stripe from 'stripe';
import { supabaseAdmin, writeAudit } from '../services/supabaseAdmin.js';

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_APP_NAME = process.env.STRIPE_APP_NAME || 'ConnectionRescue';

router.post('/stripe', async (req, res) => {
  if (!stripe || !WEBHOOK_SECRET) {
    return res.status(503).send('stripe_not_configured');
  }

  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhooks/stripe] signature failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Acknowledge fast — Stripe retries if we don't 2xx within a few seconds.
  res.json({ received: true });

  if (event.type !== 'checkout.session.completed') return;

  const session = event.data.object;
  const runId = session.metadata?.run_id || null;
  const bookingType = session.metadata?.booking_type || 'bundle';
  const itemLabel = session.metadata?.item_label || `${STRIPE_APP_NAME} booking`;

  try {
    if (supabaseAdmin) {
      await supabaseAdmin.from('payment_events').update({
        status: 'paid',
        type: event.type,
        amount_cents: session.amount_total,
        metadata: { ...session.metadata, payment_intent: session.payment_intent },
      }).eq('provider_event_id', session.id);
    }

    if (supabaseAdmin) {
      await supabaseAdmin.from('bookings').insert({
        run_id: runId,
        offer_id: null,
        supplier: 'manual_rescue',
        supplier_confirmation_number: session.id,
        supplier_metadata: {
          checkout_session_id: session.id,
          guidance_mode: 'aviationstack_only',
          metadata: session.metadata,
        },
        stripe_session_id: session.id,
        total_amount: (session.amount_total || 0) / 100,
        amount_cents: session.amount_total || 0,
        currency: (session.currency || 'usd').toUpperCase(),
        status: 'confirmed',
        traveler_email: session.metadata?.traveler_email || session.customer_details?.email || null,
        traveler_phone: session.metadata?.traveler_phone || null,
        item_label: itemLabel,
        booking_type: bookingType,
      });

      await writeAudit({
        action: 'rescue_payment_captured',
        target: session.id,
        payload: { bookingType, runId, sessionId: session.id, guidanceMode: 'aviationstack_only' },
      });
    }
  } catch (err) {
    console.error('[webhooks/stripe] handler error', err);
    await writeAudit({
      action: 'webhook_handler_error',
      target: session.id,
      payload: { error: err.message },
    });
  }
});

export default router;
