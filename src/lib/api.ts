// Frontend → backend shim.
//
// In production the React app talks to the standalone Express backend at
// VITE_BACKEND_URL (recommended). If that env isn't set we fall back to the
// in-tree Supabase edge functions so the app keeps working in environments
// without the Node service deployed yet.
//
// Travel API keys (Stripe, AviationStack) NEVER appear in this file
// or in `import.meta.env` — they live only on the backend.

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getAirlineName } from '@/lib/airlineNames';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/+$/, '') || '';
export const RESCUE_SERVICE_FEE_CENTS = parseInt(
  (import.meta.env.VITE_RESCUE_SERVICE_FEE_CENTS as string | undefined) || '1499',
  10,
);

function readErrorMessage(err: unknown) {
  return String(err instanceof Error ? err.message : err || '').trim();
}

async function readFunctionErrorBody(err: unknown): Promise<string | null> {
  const candidate = err as { context?: { json?: () => Promise<unknown> } } | null;
  const parser = candidate?.context?.json;
  if (typeof parser !== 'function') return null;
  try {
    const payload = await parser();
    if (!payload || typeof payload !== 'object') return null;
    const value = (payload as { error?: unknown; message?: unknown }).error
      ?? (payload as { error?: unknown; message?: unknown }).message;
    if (typeof value !== 'string') return null;
    return value.trim() || null;
  } catch {
    return null;
  }
}

function isNetworkFetchError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed') ||
    normalized.includes('network request failed')
  );
}

function normalizeFlightCode(raw: string) {
  return String(raw || '').trim().toUpperCase().replace(/[\s-]+/g, '');
}

function buildManualDelayInsightFallback(args: {
  flightNumber: string;
  date?: string;
  reason: string;
}) {
  const flightNumber = normalizeFlightCode(args.flightNumber) || 'UNKNOWN';
  const fallbackDate = (args.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
  return {
    flightKey: `${flightNumber}|${fallbackDate}|UNK|UNK`,
    flight: {
      source: 'manual',
      flightNumber,
      carrier: getAirlineName(flightNumber),
      status: 'MONITORING',
      statusRaw: 'manual',
      delayMinutes: 0,
      reason: args.reason,
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
      aircraft: null,
      live: null,
      usedFallback: true,
      apiConfigured: !!BACKEND_URL || isSupabaseConfigured,
    },
    travelerReportsCount: 0,
    causeBucket: 'unknown',
    confidence: 0.15,
    etaMinMinutes: null,
    etaMaxMinutes: null,
    projectedDepartureAt: null,
    projectedArrivalAt: null,
    recommendedAction: 'monitor',
    topSignals: [
      {
        bucket: 'unknown',
        source: 'fallback',
        message: args.reason,
      },
    ],
    connectionRisk: null,
  };
}

async function backendCall<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'network_error';
    throw new Error(
      `Could not reach backend at ${BACKEND_URL}. Check VITE_BACKEND_URL, backend port, and CORS allowlist. (${reason})`
    );
  }
  const text = await res.text();
  let json: unknown;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  const errorPayload = json as { error?: string; message?: string } | null;
  if (!res.ok) throw new Error(errorPayload?.error || errorPayload?.message || `Backend ${res.status}`);
  return json as T;
}

// ---------- Flight status ----------
export async function getFlightStatus(flightNumber: string) {
  if (BACKEND_URL) {
    try {
      return await backendCall(`/api/flights/status?flight=${encodeURIComponent(flightNumber)}`);
    } catch (err) {
      if (!isSupabaseConfigured) throw err;
      const message = readErrorMessage(err);
      if (!isNetworkFetchError(message) && !message.toLowerCase().includes('could not reach backend')) {
        throw err;
      }
      // Backend transport issue fallback: try edge function so flight lookup can still work.
    }
  }
  if (!isSupabaseConfigured) {
    throw new Error('Flight status is not configured. Set VITE_BACKEND_URL or Supabase environment variables.');
  }
  // Fallback: existing Supabase edge function.
  let response;
  try {
    response = await supabase.functions.invoke('flight-status', { body: { flightNumber } });
  } catch (err) {
    const message = readErrorMessage(err);
    if (isNetworkFetchError(message)) {
      throw new Error('Live flight lookup failed due to a network fetch error.');
    }
    throw err;
  }
  const { data, error } = response;
  if (error) {
    const detailed = await readFunctionErrorBody(error);
    if (detailed) throw new Error(detailed);
    throw new Error(error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function getDelayInsight(args: {
  flightNumber: string;
  date?: string;
  tripId?: string | null;
  bookingId?: string | null;
  connectionDepartureAt?: string | null;
  minimumConnectionMinutes?: number | null;
  connectionKey?: string | null;
}) {
  if (BACKEND_URL) {
    const params = new URLSearchParams();
    params.set('flight', args.flightNumber);
    if (args.date) params.set('date', args.date);
    if (args.tripId) params.set('tripId', args.tripId);
    if (args.bookingId) params.set('bookingId', args.bookingId);
    if (args.connectionDepartureAt) params.set('connectionDepartureAt', args.connectionDepartureAt);
    if (args.minimumConnectionMinutes != null) params.set('minimumConnectionMinutes', String(args.minimumConnectionMinutes));
    if (args.connectionKey) params.set('connectionKey', args.connectionKey);
    try {
      return await backendCall(`/api/flights/delay-insight?${params.toString()}`);
    } catch (err) {
      const message = readErrorMessage(err);
      const shouldFallback = isNetworkFetchError(message) || message.toLowerCase().includes('could not reach backend');
      if (!shouldFallback) throw err;
      return buildManualDelayInsightFallback({
        flightNumber: args.flightNumber,
        date: args.date,
        reason: 'Live tracking backend is unreachable. Showing a manual rescue plan while connection is restored.',
      });
    }
  }

  try {
    const flight = await getFlightStatus(args.flightNumber);
    return {
      flightKey: `${args.flightNumber}|${args.date || 'unknown'}|${flight?.departure?.airport || 'UNK'}|${flight?.arrival?.airport || 'UNK'}`,
      flight,
      travelerReportsCount: 0,
      causeBucket: 'unknown',
      confidence: 0.2,
      etaMinMinutes: Math.max(0, Number(flight?.delayMinutes || 0)),
      etaMaxMinutes: Math.max(15, Number(flight?.delayMinutes || 0) + 15),
      projectedDepartureAt: flight?.departure?.estimated || flight?.departure?.scheduled || null,
      projectedArrivalAt: flight?.arrival?.estimated || flight?.arrival?.scheduled || null,
      recommendedAction: Number(flight?.delayMinutes || 0) >= 20 ? 'prepare_backup' : 'monitor',
      topSignals: [
        {
          bucket: 'unknown',
          source: 'flight_status',
          message: 'Live backend delay insight is not configured; showing status-only fallback.',
        },
      ],
      connectionRisk: null,
    };
  } catch (err) {
    const message = readErrorMessage(err);
    if (isNetworkFetchError(message) || message.toLowerCase().includes('live flight lookup failed')) {
      return buildManualDelayInsightFallback({
        flightNumber: args.flightNumber,
        date: args.date,
        reason: 'Live flight lookup failed. Showing a manual rescue plan while network access is restored.',
      });
    }
    throw err;
  }
}

export async function submitDelayReport(payload: {
  flightKey: string;
  flightNumber?: string;
  tripId?: string | null;
  bookingId?: string | null;
  travelerEmail?: string | null;
  travelerUserId?: string | null;
  reportType: string;
  freeText?: string;
  structuredFlags?: Record<string, unknown>;
  reportedAt?: string;
  connectionDepartureAt?: string | null;
  minimumConnectionMinutes?: number | null;
  connectionKey?: string | null;
}) {
  if (!BACKEND_URL) {
    throw new Error('Backend not configured. Set VITE_BACKEND_URL to submit delay reports.');
  }

  return backendCall('/api/delay-reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface CheckoutStatusResponse {
  sessionId: string;
  paymentStatus: string | null;
  amountTotalCents: number | null;
  currency: string | null;
  customerEmail: string | null;
  booking: {
    id: string;
    status: string;
    traveler_email: string | null;
    booking_type: string | null;
    item_label: string | null;
    amount_cents: number | null;
    currency: string | null;
    created_at: string | null;
  } | null;
}

export interface ConciergeInterestPayload {
  vote: 'yes' | 'no';
  email?: string;
  notes?: string;
  page?: string;
}

// ---------- Stripe Checkout ----------
export async function createCheckoutSession(args: {
  runId?: string | null;
  offerId?: string;
  totalAmount?: string | number;
  currency?: string;
  itemLabel: string;
  traveler: { email: string; name?: string; phone?: string };
  successUrl: string;
  cancelUrl: string;
  // Manual rescue charges for hotels / lounges. Flight purchase happens
  // directly with the airline in AviationStack-only mode.
  bookingType?: 'flight' | 'hotel' | 'lounge' | 'bundle';
  amountCents?: number;
  metadata?: Record<string, unknown>;
}): Promise<{ url: string; sessionId: string }> {
  if (BACKEND_URL) {
    return backendCall('/api/payments/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify(args),
    });
  }
  if (!isSupabaseConfigured) {
    throw new Error('Checkout is not configured. Set VITE_BACKEND_URL or Supabase environment variables.');
  }
  // Fallback: existing edge function (handles hotels/lounges/bundles).
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      bookingType: args.bookingType || 'flight',
      itemLabel: args.itemLabel,
      amountCents: args.amountCents ?? Math.round(parseFloat(String(args.totalAmount || 0)) * 100),
      currency: args.currency || 'usd',
      travelerEmail: args.traveler.email,
      travelerName: args.traveler.name,
      travelerPhone: args.traveler.phone,
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
      metadata: args.metadata || {},
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error(data?.error || 'No checkout URL returned');
  return { url: data.url, sessionId: data.sessionId || '' };
}

export async function getCheckoutStatus(sessionId: string): Promise<CheckoutStatusResponse> {
  if (BACKEND_URL) {
    return backendCall<CheckoutStatusResponse>(`/api/payments/checkout-session/${encodeURIComponent(sessionId)}`);
  }
  if (!isSupabaseConfigured) {
    throw new Error('Booking status is not configured. Set VITE_BACKEND_URL or Supabase environment variables.');
  }
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  return {
    sessionId,
    paymentStatus: data?.status || null,
    amountTotalCents: data?.amount_cents ?? null,
    currency: data?.currency ?? null,
    customerEmail: data?.traveler_email ?? null,
    booking: data ? {
      id: data.id,
      status: data.status,
      traveler_email: data.traveler_email,
      booking_type: data.booking_type,
      item_label: data.item_label,
      amount_cents: data.amount_cents ?? null,
      currency: data.currency ?? null,
      created_at: data.created_at ?? null,
    } : null,
  };
}

export async function submitConciergeInterest(payload: ConciergeInterestPayload): Promise<{ ok: true }> {
  if (!BACKEND_URL) {
    throw new Error('Backend not configured. Set VITE_BACKEND_URL to capture concierge interest.');
  }

  return backendCall<{ ok: true }>('/api/feedback/concierge-interest', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export const isBackendConfigured = !!BACKEND_URL;
