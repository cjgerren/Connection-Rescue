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
  ownOp?: string | null;
  r?: string | null;
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

function getAirlineName(flightNumber = '') {
  const code = String(flightNumber).toUpperCase();

  if (code.startsWith('AA')) return 'American Airlines';
  if (code.startsWith('DL')) return 'Delta Air Lines';
  if (code.startsWith('UA')) return 'United Airlines';
  if (code.startsWith('WN')) return 'Southwest Airlines';
  if (code.startsWith('B6')) return 'JetBlue';
  if (code.startsWith('AS')) return 'Alaska Airlines';
  if (code.startsWith('NK')) return 'Spirit Airlines';
  if (code.startsWith('F9')) return 'Frontier Airlines';

  return 'Tracked Flight';
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
  PT: 'PDT',
  OH: 'JIA',
  MQ: 'ENY',
  '9E': 'EDV',
  YX: 'RPA',
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
  const label = String(ac.ownOp || '').trim() || String(ac.desc || '').trim();
  return {
    source,
    flightNumber: callSign || requestedFlight,
    carrier: label || getAirlineName(callSign || requestedFlight),
    status: (ac.seen ?? 9_999) <= 30 ? 'IN AIR' : 'MONITORING',
    statusRaw: 'adsb_live',
    delayMinutes: 0,
    reason: 'Free live feed confirms this aircraft is in air, but route metadata (origin/destination) is not provided for this record.',
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

  const combined: Array<{ source: 'adsb.lol' | 'airplanes.live'; record: AircraftRecord }> = [];
  for (const callsign of candidates) {
    for (const record of await fetchAdsbLolByCallsign(callsign)) {
      combined.push({ source: 'adsb.lol', record });
    }
    for (const record of await fetchAirplanesLiveByCallsign(callsign)) {
      combined.push({ source: 'airplanes.live', record });
    }
  }
  if (combined.length) {
    combined.sort((a, b) => {
      const aScore = (a.record.ownOp ? 4 : 0) + (a.record.desc ? 3 : 0) + (a.record.r ? 1 : 0);
      const bScore = (b.record.ownOp ? 4 : 0) + (b.record.desc ? 3 : 0) + (b.record.r ? 1 : 0);
      if (aScore !== bScore) return bScore - aScore;
      return Number(a.record.seen ?? 9_999) - Number(b.record.seen ?? 9_999);
    });
    const best = combined[0];
    return { error: null, data: toLiveFlight(best.record, normalized, best.source) };
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
