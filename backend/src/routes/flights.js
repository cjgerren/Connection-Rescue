// /api/flights/* — read-only flight info.
//
//   GET /api/flights/status?flight=AA2487
//      Returns live status (origin, dest, scheduled/estimated times, delay).
//      Backed by AviationStack (real public flight-status API).

import { Router } from 'express';

const router = Router();
const AVIATIONSTACK_KEY = process.env.AVIATIONSTACK_API_KEY;

/**
 * Parse an IATA flight code like "AA2487" → { airlineIata: 'AA', flightNumber: '2487' }
 */
function parseFlightCode(raw) {
  if (!raw) return null;
  const m = String(raw).trim().toUpperCase().replace(/\s+/g, '').match(/^([A-Z]{2,3})(\d{1,5})$/);
  if (!m) return null;
  return { airlineIata: m[1], flightNumber: m[2] };
}

router.get('/status', async (req, res) => {
  const flight = req.query.flight || req.query.flightNumber;
  const parsed = parseFlightCode(flight);
  if (!parsed) {
    return res.status(400).json({ error: 'Provide ?flight=AA2487' });
  }

  if (!AVIATIONSTACK_KEY) {
    return res.status(503).json({
      error: 'flight_status_not_configured',
      message: 'AVIATIONSTACK_API_KEY missing on backend',
    });
  }

  try {
    const url = new URL('http://api.aviationstack.com/v1/flights');
    url.searchParams.set('access_key', AVIATIONSTACK_KEY);
    url.searchParams.set('airline_iata', parsed.airlineIata);
    url.searchParams.set('flight_number', parsed.flightNumber);
    url.searchParams.set('limit', '1');

    const r = await fetch(url);
    const json = await r.json();
    if (json?.error) throw new Error(json.error?.message || 'aviationstack error');

    const f = json?.data?.[0];
    if (!f) {
      return res.status(404).json({ error: 'flight_not_found', flight });
    }

    const status = (f.flight_status || 'unknown').toLowerCase();
    const delay = Number(f.departure?.delay || 0);
    const prettyStatus =
      status === 'cancelled' ? 'CANCELED' :
      status === 'active' ? 'IN AIR' :
      status === 'landed' ? 'LANDED' :
      delay >= 60 ? 'DELAYED' :
      delay >= 15 ? 'MINOR DELAY' :
      'ON TIME';

    res.json({
      source: 'aviationstack',
      flightNumber: `${parsed.airlineIata}${parsed.flightNumber}`,
      carrier: f.airline?.name || parsed.airlineIata,
      status: prettyStatus,
      statusRaw: f.flight_status,
      delayMinutes: delay,
      reason: null,
      departure: {
        airport: f.departure?.iata,
        city: f.departure?.airport,
        gate: f.departure?.gate,
        terminal: f.departure?.terminal,
        scheduled: f.departure?.scheduled,
        estimated: f.departure?.estimated,
        actual: f.departure?.actual,
      },
      arrival: {
        airport: f.arrival?.iata,
        city: f.arrival?.airport,
        gate: f.arrival?.gate,
        terminal: f.arrival?.terminal,
        scheduled: f.arrival?.scheduled,
        estimated: f.arrival?.estimated,
        actual: f.arrival?.actual,
      },
      aircraft: f.aircraft?.iata || null,
      live: f.live ? { altitude: f.live.altitude, speed: f.live.speed_horizontal, heading: f.live.direction } : null,
      usedFallback: false,
      apiConfigured: true,
    });
  } catch (err) {
    console.error('[flights/status]', err);
    res.status(502).json({ error: 'upstream_error', message: err.message });
  }
});

export default router;
