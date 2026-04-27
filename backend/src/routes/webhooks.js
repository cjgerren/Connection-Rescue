// /api/webhooks/stripe — handles Stripe events.
//
// Critical: the body must be the *raw* buffer for signature verification,
// so this router is mounted BEFORE express.json() in server.js using
// express.raw({ type: 'application/json' }).
//
// On `checkout.session.completed` we:
//   1. mark payment_events row as paid
//   2. call Duffel to create the order (the actual ticket purchase)
//   3. write a `bookings` row with the supplier confirmation number
//   4. update the linked rescue_runs row to `booked`
// If Duffel order creation fails, the rescue_runs row is set to `book_failed`
// and the audit log captures the error so an admin can intervene.

import { Router } from 'express';
import Stripe from 'stripe';
import { createOrder } from '../services/duffel.js';
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
  const offerId = session.metadata?.offer_id;
  const runId = session.metadata?.run_id || null;
  const bookingType = session.metadata?.booking_type || (offerId ? 'flight' : 'bundle');
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

    if (!offerId) {
      if (supabaseAdmin) {
        await supabaseAdmin.from('bookings').insert({
          run_id: runId,
          offer_id: null,
          supplier: 'manual_rescue',
          supplier_confirmation_number: session.id,
          supplier_metadata: {
            checkout_session_id: session.id,
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
          payload: { bookingType, runId, sessionId: session.id },
        });
      }
      return;
    }

    // Build a minimal Duffel passenger from session metadata. Real production
    // flow collects DOB / passport / known-traveler data on a pre-checkout
    // form and passes it through — out of MVP scope.
    const fullName = session.metadata?.traveler_name || session.customer_details?.name || 'Traveler';
    const [given, ...rest] = fullName.split(' ');
    const passengers = [{
      type: 'adult',
      title: 'mr',
      given_name: given || 'Traveler',
      family_name: rest.join(' ') || 'Guest',
      gender: 'm',
      born_on: '1990-01-01',
      email: session.customer_details?.email || session.metadata?.traveler_email,
      phone_number: session.metadata?.traveler_phone || '+10000000000',
    }];

    let order, confirmation, error;
    try {
      order = await createOrder({ offerId, passengers });
      confirmation = order?.booking_reference || order?.id;
    } catch (e) {
      error = e;
      console.error('[webhooks/stripe] Duffel order failed', e.message);
    }

    if (supabaseAdmin) {
      await supabaseAdmin.from('bookings').insert({
        run_id: runId,
        offer_id: offerId,
        supplier: 'duffel',
        supplier_confirmation_number: confirmation || null,
        supplier_metadata: order || { error: error?.message, fallback: true },
        stripe_session_id: session.id,
        total_amount: (session.amount_total || 0) / 100,
        amount_cents: session.amount_total || 0,
        currency: (session.currency || 'usd').toUpperCase(),
        status: confirmation ? 'confirmed' : 'book_failed',
        traveler_email: session.metadata?.traveler_email,
        traveler_phone: session.metadata?.traveler_phone,
        item_label: itemLabel,
        booking_type: bookingType,
      });

      if (runId) {
        await supabaseAdmin.from('rescue_runs').update({
          status: confirmation ? 'booked' : 'book_failed',
          error: error?.message || null,
        }).eq('id', runId);
      }

      await writeAudit({
        action: confirmation ? 'rescue_booked' : 'rescue_book_failed',
        target: confirmation || offerId,
        payload: { offerId, runId, sessionId: session.id, error: error?.message },
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
