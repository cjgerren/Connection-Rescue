const AVIATIONSTACK_KEY = process.env.AVIATIONSTACK_API_KEY;
const DEFAULT_AIRLINE_IATA = 'AA';
const AVIATIONSTACK_TIMEOUT_MS = 10_000;

function normalizeAirlineCode(raw) {
  return String(raw || '').trim().toUpperCase();
}

function normalizeFlightNumber(raw) {
  const digits = String(raw || '').trim().replace(/\D+/g, '');
  if (!digits) return null;
  return digits.replace(/^0+/, '') || '0';
}

function normalizeFlightIdent(raw) {
  const value = String(raw || '').trim().toUpperCase().replace(/[\s-]+/g, '');
  return value || null;
}

export function parseFlightCode(raw) {
  if (!raw) return null;
  const compact = String(raw).trim().toUpperCase().replace(/[\s-]+/g, '');
  if (/^\d{2,5}$/.test(compact)) {
    const flightNumber = normalizeFlightNumber(compact);
    if (!flightNumber) return null;
    return { airlineIata: DEFAULT_AIRLINE_IATA, flightNumber };
  }
  const firstDigit = compact.search(/\d/);
  if (firstDigit < 0) return null;
  const airlineToken = compact.slice(0, firstDigit);
  const numberToken = compact.slice(firstDigit);
  if (airlineToken.length < 2 || airlineToken.length > 3) return null;
  if (!/^\d{1,5}$/.test(numberToken)) return null;
  const airlineIata = normalizeAirlineCode(airlineToken);
  // Require at least one letter in the carrier token (prevents pure-numeric junk).
  if (!/[A-Z]/.test(airlineIata)) return null;
  const flightNumber = normalizeFlightNumber(numberToken);
  if (!flightNumber) return null;
  return { airlineIata, flightNumber };
}

function shiftDate(rawDate, dayOffset) {
  const parsed = parseIsoDate(`${rawDate}T00:00:00Z`);
  if (!parsed) return null;
  parsed.setUTCDate(parsed.getUTCDate() + dayOffset);
  return parsed.toISOString().slice(0, 10);
}

function buildSearchDates(preferredDate) {
  if (!preferredDate) return [];
  const offsets = [0, 1, -1, 2, -2];
  const out = [];
  const seen = new Set();
  for (const offset of offsets) {
    const candidate = shiftDate(preferredDate, offset);
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    out.push(candidate);
  }
  return out;
}

function makeHttpError(statusCode, error, message, extra = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.error = error;
  Object.assign(err, extra);
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

function parseIsoDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeTargetDate(raw) {
  if (!raw) return null;
  const date = String(raw).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function extractRecordCodeParts(record) {
  const airline = normalizeAirlineCode(
    record?.airline?.iata ||
    record?.airline_iata ||
    record?.flight?.codeshared?.airline_iata
  );
  const number =
    normalizeFlightNumber(
      record?.flight?.number ||
      record?.flight_number ||
      record?.flight?.codeshared?.flight_number
    ) ||
    parseFlightCode(record?.flight?.iata)?.flightNumber ||
    parseFlightCode(record?.flight?.icao)?.flightNumber;

  const flightIata = normalizeFlightIdent(record?.flight?.iata);
  const flightIcao = normalizeFlightIdent(record?.flight?.icao);

  return { airline, number, flightIata, flightIcao };
}

function scoreRecord(record, requested, preferredDate) {
  const parts = extractRecordCodeParts(record);
  const sameAirline = parts.airline === requested.airlineIata;
  const sameNumber = parts.number === requested.flightNumber;
  const requestedIata = `${requested.airlineIata}${requested.flightNumber}`;
  const samePublicCode = parts.flightIata === requestedIata;
  if ((!sameAirline || !sameNumber) && !samePublicCode) return -1;

  let score = 100;
  if (samePublicCode) score += 25;
  const flightStatus = String(record?.flight_status || '').toLowerCase();
  if (flightStatus === 'scheduled') score += 8;
  else if (flightStatus === 'active') score += 6;
  else if (flightStatus === 'landed') score += 3;
  if (flightStatus === 'cancelled' || flightStatus === 'incident' || flightStatus === 'diverted') score -= 3;

  const depTime =
    parseIsoDate(record?.departure?.estimated) ||
    parseIsoDate(record?.departure?.scheduled) ||
    parseIsoDate(record?.arrival?.estimated) ||
    parseIsoDate(record?.arrival?.scheduled);
  if (depTime) {
    const deltaHours = (depTime.getTime() - Date.now()) / 3_600_000;
    if (deltaHours >= 0) {
      score += Math.max(0, 30 - Math.min(deltaHours, 30));
      if (flightStatus === 'scheduled') score += 6;
    } else {
      score += Math.max(0, 12 - Math.min(Math.abs(deltaHours), 12));
      if (flightStatus === 'landed' && Math.abs(deltaHours) > 18) score -= 12;
    }
  }

  const flightDate = normalizeTargetDate(record?.flight_date);
  if (preferredDate && flightDate === preferredDate) score += 35;
  else if (preferredDate && flightDate) score -= 22;

  return score;
}

function chooseBestFlight(records, requested, preferredDate) {
  const scored = (records || [])
    .map((record) => ({ record, score: scoreRecord(record, requested, preferredDate) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.record || null;
}

async function queryAviationstack(params) {
  const url = new URL('https://api.aviationstack.com/v1/flights');
  url.searchParams.set('access_key', AVIATIONSTACK_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AVIATIONSTACK_TIMEOUT_MS);
  let r;
  try {
    r = await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw makeHttpError(504, 'upstream_timeout', 'Flight status provider timed out');
    }
    throw makeHttpError(502, 'upstream_error', `Unable to reach flight status provider: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }

  let json;
  try {
    json = await r.json();
  } catch {
    throw makeHttpError(502, 'upstream_invalid_response', 'Flight status provider returned invalid JSON');
  }

  if (json?.error) {
    const providerCode = String(json.error?.code || '').trim() || null;
    const providerMessage = json.error?.message || `Flight status provider request failed with HTTP ${r.status}`;
    throw makeHttpError(
      r.status || 502,
      'upstream_error',
      providerMessage,
      { providerCode, providerStatus: r.status }
    );
  }

  if (!r.ok) {
    throw makeHttpError(
      502,
      'upstream_error',
      `Flight status provider request failed with HTTP ${r.status}`,
      { providerStatus: r.status }
    );
  }
  return Array.isArray(json?.data) ? json.data : [];
}

function isDateFilterPlanRestriction(error) {
  const status = Number(error?.providerStatus || error?.statusCode || 0);
  const providerCode = String(error?.providerCode || '').toLowerCase();
  return status === 403 && providerCode === 'function_access_restricted';
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

export async function fetchLiveFlightStatus(rawFlight, options = {}) {
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

  const preferredDate = normalizeTargetDate(options?.flightDate || options?.fallbackDate);
  const baseParams = {
    airline_iata: parsed.airlineIata,
    flight_number: parsed.flightNumber,
    limit: 50,
  };

  let f = null;
  let dateFilteringUnavailable = false;
  if (preferredDate) {
    for (const searchDate of buildSearchDates(preferredDate)) {
      try {
        f = chooseBestFlight(
          await queryAviationstack({ ...baseParams, flight_date: searchDate }),
          parsed,
          preferredDate
        );
      } catch (error) {
        if (isDateFilterPlanRestriction(error)) {
          dateFilteringUnavailable = true;
          break;
        }
        throw error;
      }
      if (f) break;
    }
  }
  if (!f) {
    f = chooseBestFlight(await queryAviationstack(baseParams), parsed, null);
  }
  if (!f) {
    // Fallback path: direct public flight code lookup (helps when airline_iata filtering is flaky).
    const flightIata = `${parsed.airlineIata}${parsed.flightNumber}`;
    if (preferredDate && !dateFilteringUnavailable) {
      for (const searchDate of buildSearchDates(preferredDate)) {
        try {
          f = chooseBestFlight(
            await queryAviationstack({ flight_iata: flightIata, limit: 50, flight_date: searchDate }),
            parsed,
            preferredDate
          );
        } catch (error) {
          if (isDateFilterPlanRestriction(error)) {
            dateFilteringUnavailable = true;
            break;
          }
          throw error;
        }
        if (f) break;
      }
    }
    if (!f) {
      f = chooseBestFlight(
        await queryAviationstack({ flight_iata: flightIata, limit: 50 }),
        parsed,
        null
      );
    }
  }
  if (!f) {
    throw makeHttpError(
      404,
      'flight_not_found',
      `Flight not found: ${rawFlight}. Try adding the departure date if this flight number has multiple daily legs.`
    );
  }

  const status = (f.flight_status || 'unknown').toLowerCase();
  const delay = Number(f.departure?.delay || 0);
  const matched = extractRecordCodeParts(f);

  return {
    source: 'aviationstack',
    flightNumber: `${matched.airline || parsed.airlineIata}${matched.number || parsed.flightNumber}`,
    carrier: f.airline?.name || matched.airline || parsed.airlineIata,
    status: derivePrettyStatus(status, delay),
    statusRaw: f.flight_status,
    delayMinutes: delay,
    reason: dateFilteringUnavailable
      ? 'Flight-date filtering is unavailable on the current data-provider plan. Showing the best live match without date filtering.'
      : null,
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
    usedFallback: dateFilteringUnavailable,
    apiConfigured: true,
  };
}
