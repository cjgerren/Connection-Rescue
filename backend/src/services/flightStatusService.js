const AVIATIONSTACK_KEY = process.env.AVIATIONSTACK_API_KEY;

export function parseFlightCode(raw) {
  if (!raw) return null;
  const m = String(raw).trim().toUpperCase().replace(/\s+/g, '').match(/^([A-Z]{2,3})(\d{1,5})$/);
  if (!m) return null;
  return { airlineIata: m[1], flightNumber: m[2] };
}

function makeHttpError(statusCode, error, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.error = error;
  return err;
}

function derivePrettyStatus(status, delay) {
  if (status === 'cancelled') return 'CANCELED';
  if (status === 'active') return 'IN AIR';
  if (status === 'landed') return 'LANDED';
  if (delay >= 60) return 'DELAYED';
  if (delay >= 15) return 'MINOR DELAY';
  return 'ON TIME';
}

export function deriveFlightDate(flight, fallbackDate) {
  const candidate =
    flight?.departure?.scheduled ||
    flight?.departure?.estimated ||
    flight?.departure?.actual ||
    flight?.arrival?.scheduled ||
    fallbackDate ||
    new Date().toISOString();
  return String(candidate).slice(0, 10);
}

export function buildFlightKey(flight, fallbackDate) {
  const date = deriveFlightDate(flight, fallbackDate);
  const from = flight?.departure?.airport || 'UNK';
  const to = flight?.arrival?.airport || 'UNK';
  return `${flight.flightNumber}|${date}|${from}|${to}`;
}

export async function fetchLiveFlightStatus(rawFlight) {
  const parsed = parseFlightCode(rawFlight);
  if (!parsed) {
    throw makeHttpError(400, 'invalid_flight_code', 'Provide ?flight=AA2487');
  }

  if (!AVIATIONSTACK_KEY) {
    throw makeHttpError(
      503,
      'flight_status_not_configured',
      'AVIATIONSTACK_API_KEY missing on backend'
    );
  }

  const url = new URL('http://api.aviationstack.com/v1/flights');
  url.searchParams.set('access_key', AVIATIONSTACK_KEY);
  url.searchParams.set('airline_iata', parsed.airlineIata);
  url.searchParams.set('flight_number', parsed.flightNumber);
  url.searchParams.set('limit', '1');

  const r = await fetch(url);
  const json = await r.json();
  if (json?.error) {
    throw makeHttpError(502, 'upstream_error', json.error?.message || 'aviationstack error');
  }

  const f = json?.data?.[0];
  if (!f) {
    throw makeHttpError(404, 'flight_not_found', `Flight not found: ${rawFlight}`);
  }

  const status = (f.flight_status || 'unknown').toLowerCase();
  const delay = Number(f.departure?.delay || 0);

  return {
    source: 'aviationstack',
    flightNumber: `${parsed.airlineIata}${parsed.flightNumber}`,
    carrier: f.airline?.name || parsed.airlineIata,
    status: derivePrettyStatus(status, delay),
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
    live: f.live
      ? { altitude: f.live.altitude, speed: f.live.speed_horizontal, heading: f.live.direction }
      : null,
    usedFallback: false,
    apiConfigured: true,
  };
}
