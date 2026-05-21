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

function taskTypeForBooking(bookingType) {
  if (bookingType === 'hotel') return 'hotel_hold';
  if (bookingType === 'lounge') return 'lounge_pass';
  return 'rebook_search';
}

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

  if (event.type !== 'checkout.session.completed') {
    return res.json({ received: true, ignored: true });
  }

  const session = event.data.object;
  const runId = session.metadata?.run_id || null;
  const bookingType = session.metadata?.booking_type || 'bundle';
  const itemLabel = session.metadata?.item_label || `${STRIPE_APP_NAME} booking`;

  try {
    if (supabaseAdmin) {
      const { data: existingBooking, error: existingError } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('stripe_session_id', session.id)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existingBooking?.id) {
        await writeAudit({
          action: 'rescue_payment_duplicate_ignored',
          target: session.id,
          payload: { bookingId: existingBooking.id, eventId: event.id },
        });
        return res.json({ received: true, duplicate: true });
      }
    }

    if (supabaseAdmin) {
      await supabaseAdmin.from('payment_events').update({
        status: 'paid',
        type: event.type,
        amount_cents: session.amount_total,
        metadata: { ...session.metadata, payment_intent: session.payment_intent },
      }).eq('provider_event_id', session.id);
    }

    if (supabaseAdmin) {
      const { data: booking, error: bookingError } = await supabaseAdmin.from('bookings').insert({
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
      }).select('id, traveler_email, traveler_phone, booking_type').single();
      if (bookingError) throw bookingError;

      await supabaseAdmin.from('rescue_tasks').insert({
        type: taskTypeForBooking(bookingType),
        status: 'queued',
        booking_id: booking.id,
        flight_num: session.metadata?.flight_num || null,
        traveler_email: booking.traveler_email,
        traveler_phone: booking.traveler_phone,
        source: 'stripe_checkout',
        notes: itemLabel,
        result: {
          stripe_session_id: session.id,
          booking_type: bookingType,
          checkout_completed_at: new Date().toISOString(),
        },
      });

      await writeAudit({
        action: 'rescue_payment_captured',
        target: session.id,
        payload: {
          bookingType,
          runId,
          sessionId: session.id,
          eventId: event.id,
          guidanceMode: 'aviationstack_only',
        },
      });
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('[webhooks/stripe] handler error', err);
    await writeAudit({
      action: 'webhook_handler_error',
      target: session.id,
      payload: { error: err.message, eventId: event.id },
    });
    return res.status(500).json({ error: 'webhook_processing_failed' });
  }
});

export default router;
