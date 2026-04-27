// /api/rescue/* — the heart of the product.
//
//   POST /api/rescue/search   { origin, destination, departureDate, originalFlight, originalArrivalISO }
//        → ranked rescue options (writes a `rescue_runs` row + `rescue_options`)
//
//   POST /api/rescue/hold     { offerId }
//        → re-fetches a Duffel offer to confirm it's still available + price.
//
//   POST /api/rescue/book     { runId, offerId, passengers, paymentEventId }
//        → after Stripe webhook confirms payment, creates the Duffel order,
//          persists `bookings` row with the supplier confirmation number.
//
// The frontend calls /search and /hold; /book is called from the Stripe
// webhook so the booking can't be triggered without a paid charge.

import { Router } from 'express';
import { searchOffers, getOffer, createOrder, duffelConfigured } from '../services/duffel.js';
import { rankOffers } from '../services/rescueRanker.js';
import { supabaseAdmin, writeAudit, getUserFromAuthHeader } from '../services/supabaseAdmin.js';

const router = Router();

router.post('/search', async (req, res) => {
  const { origin, destination, departureDate, originalFlight, originalArrivalISO, adults = 1, cabinClass = 'economy' } = req.body || {};

  if (!origin || !destination || !departureDate) {
    return res.status(400).json({ error: 'origin, destination, departureDate are required' });
  }

  if (!duffelConfigured) {
    return res.status(503).json({
      error: 'duffel_not_configured',
      message: 'DUFFEL_API_KEY missing on backend — set it in backend/.env',
    });
  }

  try {
    const { offer_request_id, offers } = await searchOffers({
      origin, destination, departureDate, adults, cabinClass,
    });
    const ranking = rankOffers(offers, { origin, destination, originalArrivalISO });

    let runId = null;
    if (supabaseAdmin) {
      const user = await getUserFromAuthHeader(req.headers.authorization);
      const { data: run, error: runErr } = await supabaseAdmin.from('rescue_runs').insert({
        user_id: user?.id || null,
        original_flight: originalFlight || null,
        origin,
        destination,
        departure_date: departureDate,
        offer_request_id,
        best_option_id: ranking.bestId,
        status: 'options_ready',
      }).select('id').single();
      if (!runErr) {
        runId = run.id;
        // Snapshot ranked options so they survive Duffel's offer expiry.
        await supabaseAdmin.from('rescue_options').insert(
          ranking.options.slice(0, 10).map((o) => ({
            run_id: runId,
            offer_id: o.offerId,
            payload: o,
            score: o.score,
            badges: o.badges,
          }))
        );
      } else {
        console.warn('[rescue/search] rescue_runs insert failed', runErr.message);
      }
    }

    res.json({
      runId,
      offerRequestId: offer_request_id,
      options: ranking.options,
      bestId: ranking.bestId,
      fastestId: ranking.fastestId,
      cheapestId: ranking.cheapestId,
      lowestStressId: ranking.lowestStressId,
    });
  } catch (err) {
    console.error('[rescue/search]', err);
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
});

router.post('/hold', async (req, res) => {
  const { offerId } = req.body || {};
  if (!offerId) return res.status(400).json({ error: 'offerId required' });
  try {
    const offer = await getOffer(offerId);
    res.json({
      offerId: offer.id,
      stillAvailable: true,
      totalAmount: offer.total_amount,
      totalCurrency: offer.total_currency,
      expiresAt: offer.expires_at,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, stillAvailable: false });
  }
});

/**
 * Internal-only: book the offer after Stripe webhook confirmed payment.
 * The webhook calls this with a shared secret, OR calls bookFromPaymentEvent
 * directly (preferred — avoids an extra HTTP hop).
 */
router.post('/book', async (req, res) => {
  const { offerId, passengers, paymentEventId, runId } = req.body || {};
  // Require the internal secret so the public web can't trigger a booking
  // without going through Stripe.
  if (req.headers['x-internal-secret'] !== process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const order = await createOrder({ offerId, passengers });
    const confirmation = order?.booking_reference || order?.id;

    if (supabaseAdmin) {
      await supabaseAdmin.from('bookings').insert({
        run_id: runId || null,
        offer_id: offerId,
        supplier: 'duffel',
        supplier_confirmation_number: confirmation,
        supplier_metadata: order,
        payment_event_id: paymentEventId || null,
        total_amount: order?.total_amount,
        currency: order?.total_currency,
        status: 'confirmed',
      });
      if (runId) {
        await supabaseAdmin.from('rescue_runs').update({ status: 'booked' }).eq('id', runId);
      }
      await writeAudit({
        action: 'rescue_booked',
        target: confirmation,
        payload: { offerId, runId, paymentEventId },
      });
    }

    res.json({ ok: true, confirmation, order });
  } catch (err) {
    console.error('[rescue/book]', err);
    if (supabaseAdmin && runId) {
      await supabaseAdmin.from('rescue_runs').update({ status: 'book_failed', error: err.message }).eq('id', runId);
    }
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
