const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

interface FlightStatusRequest {
  flightNumber?: string;
}

interface AircraftRecord {
  flight?: string | null;
  desc?: string | null;
  lat?: number | null;
  lon?: number | null;
  alt_baro?: number | null;
  gs?: number | null;
  track?: number | null;
  t?: string | null;
  seen?: number | null;
}

interface AircraftListPayload {
  ac?: AircraftRecord[];
}

function normalizeFlightInput(raw: string) {
  const compact = String(raw || '').trim().toUpperCase().replace(/[\s-]+/g, '');
  if (/^\d{2,5}$/.test(compact)) return `AA${compact}`;
  return compact;
}

function parseFlightCode(code: string) {
  const match = code.match(/^([A-Z0-9]{2,3})(\d{1,5})$/);
  if (!match) return null;
  return { carrier: match[1], number: match[2] };
}

const iataToIcao: Record<string, string> = {
  AA: 'AAL',
  AS: 'ASA',
  B6: 'JBU',
  DL: 'DAL',
  F9: 'FFT',
  G4: 'AAY',
  NK: 'NKS',
  UA: 'UAL',
  WN: 'SWA',
};

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchAdsbLolByCallsign(callsign: string): Promise<AircraftRecord[]> {
  const url = `https://api.adsb.lol/v2/callsign/${encodeURIComponent(callsign)}`;
  const payload = await fetchJson<AircraftListPayload>(url);
  return Array.isArray(payload?.ac) ? payload.ac : [];
}

async function fetchAirplanesLiveByCallsign(callsign: string): Promise<AircraftRecord[]> {
  const url = `https://api.airplanes.live/v2/callsign/${encodeURIComponent(callsign)}`;
  const payload = await fetchJson<AircraftListPayload>(url);
  return Array.isArray(payload?.ac) ? payload.ac : [];
}

function toLiveFlight(ac: AircraftRecord, requestedFlight: string, source: 'adsb.lol' | 'airplanes.live') {
  const callSign = String(ac.flight || requestedFlight || '').trim();
  const label = String(ac.desc || '').trim();
  return {
    source,
    flightNumber: callSign || requestedFlight,
    carrier: label || 'Airline pending',
    status: (ac.seen ?? 9_999) <= 30 ? 'IN AIR' : 'MONITORING',
    statusRaw: 'adsb_live',
    delayMinutes: 0,
    reason: null,
    departure: {
      airport: 'UNK',
      city: 'Unknown departure airport',
      gate: null,
      terminal: null,
      scheduled: null,
      estimated: null,
      actual: null,
    },
    arrival: {
      airport: 'UNK',
      city: 'Unknown arrival airport',
      gate: null,
      terminal: null,
      scheduled: null,
      estimated: null,
      actual: null,
    },
    aircraft: String(ac.t || '').trim() || null,
    live: typeof ac.lat === 'number' && typeof ac.lon === 'number'
      ? {
          altitude: Number(ac.alt_baro || 0),
          speed: Number(ac.gs || 0),
          heading: Number(ac.track || 0),
        }
      : null,
    usedFallback: false,
    apiConfigured: true,
  };
}

async function lookupFlight(normalized: string) {
  const parsed = parseFlightCode(normalized);
  if (!parsed) return { error: 'invalid_flight_code' as const, data: null };

  const candidates = new Set<string>();
  candidates.add(normalized);
  const icao = iataToIcao[parsed.carrier];
  if (icao) candidates.add(`${icao}${parsed.number}`);

  for (const callsign of candidates) {
    const records = await fetchAdsbLolByCallsign(callsign);
    if (records.length) {
      records.sort((a, b) => Number(a.seen ?? 9_999) - Number(b.seen ?? 9_999));
      return { error: null, data: toLiveFlight(records[0], normalized, 'adsb.lol') };
    }
  }

  for (const callsign of candidates) {
    const records = await fetchAirplanesLiveByCallsign(callsign);
    if (records.length) {
      records.sort((a, b) => Number(a.seen ?? 9_999) - Number(b.seen ?? 9_999));
      return { error: null, data: toLiveFlight(records[0], normalized, 'airplanes.live') };
    }
  }

  return { error: 'flight_not_found' as const, data: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as FlightStatusRequest;
    const raw = String(body.flightNumber || '').trim();
    if (!raw) return jsonResponse({ error: 'flightNumber is required' }, 400);

    const normalized = normalizeFlightInput(raw);
    const result = await lookupFlight(normalized);
    if (result.error === 'invalid_flight_code') {
      return jsonResponse({ error: 'invalid_flight_code' }, 400);
    }
    if (result.error === 'flight_not_found') {
      return jsonResponse({ error: 'flight_not_found' }, 404);
    }
    return jsonResponse(result.data, 200);
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : 'unknown_error',
    }, 500);
  }
});
