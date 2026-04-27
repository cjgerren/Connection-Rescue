// Thin Duffel API client.
//
// Duffel's flow:
//   1) POST /air/offer_requests   { slices, passengers, cabin_class }
//      → returns offer_request_id and an initial set of offers
//   2) GET  /air/offers?offer_request_id=...   (paginated, sorted by total_amount)
//   3) POST /air/orders   { selected_offers: [offer_id], passengers, payments }
//      → confirms a real booking
//
// Docs: https://duffel.com/docs/api
//
// We only ever call this from the backend so the API key never ships to the
// browser.

const DUFFEL_BASE = 'https://api.duffel.com';
const API_KEY = process.env.DUFFEL_API_KEY;
const API_VERSION = process.env.DUFFEL_API_VERSION || 'v2';

function headers() {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Duffel-Version': API_VERSION,
    'Authorization': `Bearer ${API_KEY}`,
  };
}

async function call(path, init = {}) {
  if (!API_KEY) {
    const err = new Error('DUFFEL_API_KEY not configured on the backend');
    err.code = 'duffel_not_configured';
    throw err;
  }
  const res = await fetch(`${DUFFEL_BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || json?.message || `Duffel ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

/**
 * Create an offer request and return the matching offers.
 * @param {Object} p
 * @param {string} p.origin       IATA, e.g. 'ORD'
 * @param {string} p.destination  IATA, e.g. 'LGA'
 * @param {string} p.departureDate YYYY-MM-DD
 * @param {number} [p.adults=1]
 * @param {string} [p.cabinClass='economy']
 * @returns {Promise<{ offer_request_id: string, offers: any[] }>}
 */
export async function searchOffers({ origin, destination, departureDate, adults = 1, cabinClass = 'economy' }) {
  const body = {
    data: {
      slices: [{ origin, destination, departure_date: departureDate }],
      passengers: Array.from({ length: adults }, () => ({ type: 'adult' })),
      cabin_class: cabinClass,
    },
  };
  // return_offers=true gives us offers inline (faster than polling).
  const json = await call('/air/offer_requests?return_offers=true', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return {
    offer_request_id: json?.data?.id,
    offers: json?.data?.offers || [],
  };
}

/** Re-fetch a single offer (Duffel offers expire after a few minutes). */
export async function getOffer(offerId) {
  const json = await call(`/air/offers/${encodeURIComponent(offerId)}`);
  return json?.data;
}

/**
 * Create a Duffel order from a previously-selected offer.
 * For test mode you can use `payments[0].type = 'balance'`.
 * For live mode you'd pass the real card / Stripe details.
 */
export async function createOrder({ offerId, passengers, payments }) {
  const body = {
    data: {
      type: 'instant',
      selected_offers: [offerId],
      passengers,
      payments: payments || [{ type: 'balance', currency: 'USD', amount: '0' }],
    },
  };
  const json = await call('/air/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return json?.data;
}

/**
 * Light flight-status helper. Duffel doesn't expose a public live-status
 * endpoint, so we use their schedules endpoint as a best-effort.
 * Falls back to `null` so the route can degrade to AviationStack.
 */
export async function getScheduleByFlightNumber(_flightNumber) {
  // Placeholder — real implementation requires Duffel airline + flight-number
  // mapping. Most operators back live status with AviationStack or FlightAware.
  return null;
}

export const duffelConfigured = !!API_KEY;
