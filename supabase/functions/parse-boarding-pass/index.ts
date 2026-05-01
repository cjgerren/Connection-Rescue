import { corsHeaders, jsonResponse } from '../_shared/admin.ts';

function safeDecodeBase64DataUrl(dataUrl: string) {
  const m = /^data:.*?;base64,(.*)$/i.exec(dataUrl || '');
  if (!m) return null;
  try {
    const bytes = Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function optionalEnv(name: string) {
  const value = Deno.env.get(name);
  return value && value.trim() ? value.trim() : null;
}

function normalizeDataUrl(value: string) {
  return String(value || '').trim();
}

function dataUrlMimeType(value: string) {
  const v = normalizeDataUrl(value);
  const m = /^data:([^;]+);base64,/i.exec(v);
  return m?.[1]?.toLowerCase() || null;
}

function isProbablyDataUrl(value: string) {
  const v = normalizeDataUrl(value);
  // Be permissive: pg_net / SQL editors sometimes inject whitespace.
  // OpenAI accepts standard data URLs for images.
  if (!/^data:/i.test(v)) return false;
  if (!/;base64,/i.test(v)) return false;
  return /^data:image\//i.test(v);
}

function demoBoardingPass() {
  const now = new Date();
  const dep = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const boarding = new Date(dep.getTime() - 35 * 60 * 1000);
  const isoDate = dep.toISOString().slice(0, 10);
  const hhmm = (d: Date) => d.toISOString().slice(11, 16);
  return {
    passengerName: 'ConnectionRescue Demo',
    flightNumber: 'AA2487',
    carrier: 'AA',
    from: 'JFK',
    to: 'LAX',
    fromCity: 'New York',
    toCity: 'Los Angeles',
    departureDate: isoDate,
    departureTime: hhmm(dep),
    boardingTime: hhmm(boarding),
    gate: 'B12',
    terminal: '4',
    seat: '12A',
    cabin: 'Main',
    loyaltyNumber: null,
    loyaltyTier: null,
    confirmationCode: 'CRDEMO1',
  };
}

type BoardingPass = {
  passengerName: string | null;
  flightNumber: string | null;
  carrier: string | null;
  from: string | null;
  to: string | null;
  fromCity: string | null;
  toCity: string | null;
  departureDate: string | null;
  departureTime: string | null;
  boardingTime: string | null;
  gate: string | null;
  terminal: string | null;
  seat: string | null;
  cabin: string | null;
  loyaltyNumber: string | null;
  loyaltyTier: string | null;
  confirmationCode: string | null;
};

function coerceNullableString(value: unknown) {
  const s = typeof value === 'string' ? value.trim() : '';
  return s ? s : null;
}

function normalizeIata(value: unknown) {
  const s = coerceNullableString(value);
  if (!s) return null;
  const up = s.toUpperCase();
  return /^[A-Z0-9]{3}$/.test(up) ? up : up;
}

function normalizeFlightNumber(value: unknown) {
  const s = coerceNullableString(value);
  if (!s) return null;
  return s.toUpperCase().replace(/\s+/g, '');
}

function normalizeCarrier(value: unknown) {
  const s = coerceNullableString(value);
  if (!s) return null;
  const up = s.toUpperCase().replace(/\s+/g, '');
  return up.length <= 3 ? up : up;
}

function normalizeDate(value: unknown) {
  const s = coerceNullableString(value);
  if (!s) return null;
  // Accept YYYY-MM-DD. Otherwise leave null (we don't want to guess too hard).
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function normalizeTime(value: unknown) {
  const s = coerceNullableString(value);
  if (!s) return null;
  // Accept HH:MM (24h). If not, allow raw string.
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  return s;
}

const airportCities: Record<string, string> = {
  ATL: 'Atlanta',
  AUS: 'Austin',
  BNA: 'Nashville',
  BOS: 'Boston',
  BWI: 'Baltimore',
  CLT: 'Charlotte',
  DCA: 'Washington',
  DEN: 'Denver',
  DFW: 'Dallas-Fort Worth',
  DTW: 'Detroit',
  EWR: 'Newark',
  FLL: 'Fort Lauderdale',
  HNL: 'Honolulu',
  IAD: 'Washington',
  IAH: 'Houston',
  IND: 'Indianapolis',
  JFK: 'New York',
  LAS: 'Las Vegas',
  LAX: 'Los Angeles',
  LGA: 'New York',
  MCO: 'Orlando',
  MIA: 'Miami',
  MSP: 'Minneapolis-Saint Paul',
  ORD: "Chicago",
  PDX: 'Portland',
  PHL: 'Philadelphia',
  PHX: 'Phoenix',
  SAN: 'San Diego',
  SEA: 'Seattle',
  SFO: 'San Francisco',
  SLC: 'Salt Lake City',
  TPA: 'Tampa',
};

function parseBoardingPassJson(obj: any): BoardingPass {
  const parsed = {
    passengerName: coerceNullableString(obj?.passengerName),
    flightNumber: normalizeFlightNumber(obj?.flightNumber),
    carrier: normalizeCarrier(obj?.carrier),
    from: normalizeIata(obj?.from),
    to: normalizeIata(obj?.to),
    fromCity: coerceNullableString(obj?.fromCity),
    toCity: coerceNullableString(obj?.toCity),
    departureDate: normalizeDate(obj?.departureDate),
    departureTime: normalizeTime(obj?.departureTime),
    boardingTime: normalizeTime(obj?.boardingTime),
    gate: coerceNullableString(obj?.gate),
    terminal: coerceNullableString(obj?.terminal),
    seat: coerceNullableString(obj?.seat),
    cabin: coerceNullableString(obj?.cabin),
    loyaltyNumber: coerceNullableString(obj?.loyaltyNumber),
    loyaltyTier: coerceNullableString(obj?.loyaltyTier),
    confirmationCode: coerceNullableString(obj?.confirmationCode),
  };
  return {
    ...parsed,
    fromCity: parsed.fromCity || (parsed.from ? airportCities[parsed.from] || null : null),
    toCity: parsed.toCity || (parsed.to ? airportCities[parsed.to] || null : null),
  };
}

function assertReadableBoardingPass(bp: BoardingPass) {
  const missing: string[] = [];
  if (!bp.flightNumber) missing.push('flight number');
  if (!bp.from) missing.push('origin');
  if (!bp.to) missing.push('destination');
  if (missing.length) {
    throw new Error(`OCR returned no ${missing.join(', ')}. Try a brighter, flatter photo or upload a screenshot of the boarding pass.`);
  }
  return bp;
}

async function openAiOcrBoardingPass(imageDataUrl: string) {
  const apiKey = requiredEnv('OPENAI_API_KEY');
  const model = optionalEnv('OPENAI_OCR_MODEL') || optionalEnv('OPENAI_MODEL') || 'gpt-4.1';

  const prompt = [
    'Extract boarding pass details from this image.',
    'Return ONLY valid JSON (no markdown, no commentary).',
    'Use null when a field is not present or unreadable.',
    'Schema keys (all required):',
    'passengerName, flightNumber, carrier, from, to, fromCity, toCity, departureDate, departureTime, boardingTime, gate, terminal, seat, cabin, loyaltyNumber, loyaltyTier, confirmationCode',
    'Constraints:',
    '- departureDate should be YYYY-MM-DD if possible, else null.',
    '- from/to should be IATA codes if present.',
    '- Look carefully for three-letter airport pairs such as PHX to IND.',
    '- If the image shows AA2318 PHX IND, return flightNumber "AA2318", carrier "AA", from "PHX", to "IND".',
    '- flightNumber should include airline code + number if present (e.g. AA2487).',
  ].join('\n');

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
          ],
        },
      ],
    }),
  });

  const text = await res.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  if (!res.ok) {
    const message = payload?.error?.message || payload?.message || payload?.error || `openai_${res.status}`;
    throw new Error(String(message));
  }

  const outputText: string =
    payload?.output_text ||
    payload?.output?.find?.((x: any) => x?.type === 'message')?.content?.find?.((c: any) => c?.type === 'output_text')?.text ||
    '';

  const jsonText = String(outputText || '').trim();
  if (!jsonText) throw new Error('openai_empty_output');

  // Parse strict JSON. If model returned extra chars, attempt to bracket-extract.
  let jsonObj: any = null;
  try {
    jsonObj = JSON.parse(jsonText);
  } catch {
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start >= 0 && end > start) {
      jsonObj = JSON.parse(jsonText.slice(start, end + 1));
    } else {
      throw new Error('openai_invalid_json');
    }
  }

  return assertReadableBoardingPass(parseBoardingPassJson(jsonObj));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({})) as { imageBase64?: string; demo?: boolean };
    const imageBase64 = normalizeDataUrl(body?.imageBase64 || '');

    // Explicit demo mode is only for the user-selected skip flow.
    const decoded = safeDecodeBase64DataUrl(imageBase64);
    const isDemo = body?.demo === true || decoded?.trim() === 'demo';

    if (isDemo) {
      return jsonResponse({
        ok: true,
        usedFallback: true,
        apiConfigured: !!optionalEnv('OPENAI_API_KEY'),
        visionError: null,
        ...demoBoardingPass(),
      });
    }

    // Live OCR mode (text-only boarding passes, screenshots, photos).
    const hasOpenAi = !!optionalEnv('OPENAI_API_KEY');
    if (hasOpenAi) {
      if (!isProbablyDataUrl(imageBase64)) {
        return jsonResponse({ ok: false, usedFallback: false, apiConfigured: true, error: 'Please upload a boarding-pass screenshot or photo. PDF and wallet-pass files are not supported by the scanner yet.' }, 200);
      }
      const mime = dataUrlMimeType(imageBase64);
      const allowed = new Set([
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/gif',
      ]);
      if (mime && !allowed.has(mime)) {
        return jsonResponse({ ok: false, usedFallback: false, apiConfigured: true, error: `Unsupported image format: ${mime}. Please upload PNG, JPG, or WebP.` }, 200);
      }
      // Conservative size guard: base64 expansion is ~4/3; keep this modest for edge/runtime limits.
      if (imageBase64.length > 8_000_000) {
        return jsonResponse({ ok: false, usedFallback: false, apiConfigured: true, error: 'Image too large. Please upload a smaller screenshot or photo.' }, 200);
      }
      try {
        const bp = await openAiOcrBoardingPass(imageBase64);
        return jsonResponse({
          ok: true,
          usedFallback: false,
          apiConfigured: true,
          visionError: null,
          ...bp,
        });
      } catch (e) {
        // Return 200 so supabase-js doesn't surface only "non-2xx from edge function".
        const msg = e instanceof Error ? e.message : 'OCR failed';
        return jsonResponse({
          ok: false,
          usedFallback: false,
          apiConfigured: true,
          visionError: msg,
          error: `Could not read this boarding pass image: ${msg}`,
        }, 200);
      }
    }

    return jsonResponse({
      ok: false,
      usedFallback: false,
      apiConfigured: !!hasOpenAi,
      visionError: 'OCR not configured',
      error: 'Boarding-pass OCR is not configured for this environment.'
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ ok: false, usedFallback: false, apiConfigured: !!optionalEnv('OPENAI_API_KEY'), visionError: msg, error: msg }, 200);
  }
});
