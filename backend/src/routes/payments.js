// /api/payments/* — Stripe Checkout for rescue bookings.
//
//   POST /api/payments/create-checkout-session
//        { runId, offerId, totalAmount, currency, traveler:{ email, name, phone },
//          successUrl, cancelUrl }
//        → { url, sessionId }
//
// We charge two line items:
//   1. The flight fare (from Duffel's offer.total_amount)
//   2. A flat Rescue Assist fee for the self-serve recovery workflow
//
// Fulfillment happens in /api/webhooks/stripe on `checkout.session.completed`,
// which actually creates the Duffel order. The traveler is never charged
// before we have a confirmed order intent.

import { Router } from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from '../services/supabaseAdmin.js';
import { getOffer } from '../services/duffel.js';

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

const SERVICE_FEE_CENTS = parseInt(process.env.RESCUE_SERVICE_FEE_CENTS || '1499', 10);
const STRIPE_APP_NAME = process.env.STRIPE_APP_NAME || 'ConnectionRescue';

router.post('/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'stripe_not_configured' });
  }

  const {
    runId,
    offerId,
    currency = 'usd',
    amountCents,
    traveler = {},
    successUrl,
    cancelUrl,
    itemLabel = 'ConnectionRescue rebooking',
    bookingType = offerId ? 'flight' : 'bundle',
    metadata = {},
  } = req.body || {};

  const addOnCents = Math.max(0, parseInt(String(amountCents || 0), 10) || 0);

  try {
    const lineItems = [];
    let sessionCurrency = String(currency || 'usd').toLowerCase();
    let fareCents = 0;

    if (offerId) {
      const offer = await getOffer(offerId);
      fareCents = Math.round(parseFloat(String(offer?.total_amount || '0')) * 100);
      sessionCurrency = String(offer?.total_currency || sessionCurrency).toLowerCase();
      lineItems.push({
        price_data: {
          currency: sessionCurrency,
          unit_amount: fareCents,
          product_data: { name: itemLabel },
        },
        quantity: 1,
      });
    } else if (addOnCents > 0) {
      lineItems.push({
        price_data: {
          currency: sessionCurrency,
          unit_amount: addOnCents,
          product_data: { name: itemLabel },
        },
        quantity: 1,
      });
    }

    if (offerId && addOnCents > 0) {
      lineItems.push({
        price_data: {
          currency: sessionCurrency,
          unit_amount: addOnCents,
          product_data: {
            name: 'ConnectionRescue add-ons',
            description: 'Hotel or lounge add-ons selected during rescue.',
          },
        },
        quantity: 1,
      });
    }

    if (!lineItems.length) {
      return res.status(400).json({ error: 'No payable items were provided for checkout.' });
    }

    if (SERVICE_FEE_CENTS > 0) {
      lineItems.push({
        price_data: {
          currency: sessionCurrency,
          unit_amount: SERVICE_FEE_CENTS,
          product_data: {
            name: 'ConnectionRescue Rescue Assist fee',
            description: 'Covers the ConnectionRescue self-serve rescue workflow and confirmation handling.',
          },
        },
        quantity: 1,
      });
    }

    const computedTotalCents = fareCents + addOnCents + SERVICE_FEE_CENTS;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: traveler.email,
      line_items: lineItems,
      success_url: successUrl || `${process.env.FRONTEND_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/booking-cancelled`,
      metadata: {
        app_name: STRIPE_APP_NAME,
        run_id: runId || '',
        offer_id: offerId,
        traveler_email: traveler.email || '',
        traveler_name: traveler.name || '',
        traveler_phone: traveler.phone || '',
        booking_type: bookingType,
        item_label: itemLabel,
        add_on_cents: String(addOnCents),
        service_fee_cents: String(SERVICE_FEE_CENTS),
        ...metadata,
      },
      payment_intent_data: {
        description: offerId
          ? `${STRIPE_APP_NAME} • offer ${offerId}`
          : `${STRIPE_APP_NAME} • ${bookingType}`,
      },
    });

    if (supabaseAdmin) {
      await supabaseAdmin.from('payment_events').insert({
        provider: 'stripe',
        provider_event_id: session.id,
        type: 'checkout.session.created',
        status: 'pending',
        amount_cents: computedTotalCents,
        currency: sessionCurrency,
        run_id: runId || null,
        offer_id: offerId || null,
        metadata: session.metadata,
      });
    }

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[payments/create-checkout-session]', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/checkout-session/:sessionId', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'stripe_not_configured' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    let booking = null;

    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('bookings')
        .select('id, status, traveler_email, booking_type, item_label, amount_cents, currency, created_at')
        .eq('stripe_session_id', session.id)
        .maybeSingle();
      booking = data || null;
    }

    res.json({
      sessionId: session.id,
      paymentStatus: session.payment_status || null,
      amountTotalCents: session.amount_total || null,
      currency: session.currency || null,
      customerEmail: session.customer_email || session.customer_details?.email || null,
      booking,
    });
  } catch (err) {
    console.error('[payments/checkout-session]', err);
    res.status(404).json({ error: 'checkout_session_not_found', message: err.message });
  }
});

export default router;
