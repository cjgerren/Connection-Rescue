// Frontend → backend shim.
//
// In production the React app talks to the standalone Express backend at
// VITE_BACKEND_URL (recommended). If that env isn't set we fall back to the
// in-tree Supabase edge functions so the app keeps working in environments
// without the Node service deployed yet.
//
// Travel API keys (Duffel, Stripe, AviationStack) NEVER appear in this file
// or in `import.meta.env` — they live only on the backend.

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/+$/, '') || '';
export const RESCUE_SERVICE_FEE_CENTS = parseInt(
  (import.meta.env.VITE_RESCUE_SERVICE_FEE_CENTS as string | undefined) || '1499',
  10,
);

async function backendCall<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
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
    return backendCall(`/api/flights/status?flight=${encodeURIComponent(flightNumber)}`);
  }
  if (!isSupabaseConfigured) {
    throw new Error('Flight status is not configured. Set VITE_BACKEND_URL or Supabase environment variables.');
  }
  // Fallback: existing Supabase edge function.
  const { data, error } = await supabase.functions.invoke('flight-status', {
    body: { flightNumber },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

// ---------- Rescue search (ranked options) ----------
export interface RescueOption {
  id: string;
  offerId: string;
  flightNum: string;
  carrier: string;
  carrierIata?: string;
  from: string;
  to: string;
  toCity: string;
  depart: string;
  arrive: string;
  durationMin: number;
  connections: number;
  minLayoverMin: number | null;
  tightConnection: boolean;
  seatsLeft: number;
  price: number;
  currency: string;
  sameDest: boolean;
  nearbyDest: boolean;
  acceptableDest: boolean;
  score: number;
  badges: Array<'best' | 'fastest' | 'cheapest' | 'lowestStress'>;
}

export interface RescueSearchResponse {
  runId: string | null;
  offerRequestId?: string;
  options: RescueOption[];
  bestId: string | null;
  fastestId: string | null;
  cheapestId: string | null;
  lowestStressId: string | null;
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

export async function searchRescueOptions(args: {
  origin: string;
  destination: string;
  departureDate: string;     // YYYY-MM-DD
  originalFlight?: string;
  originalArrivalISO?: string;
  adults?: number;
  cabinClass?: string;
}): Promise<RescueSearchResponse> {
  if (!BACKEND_URL) {
    throw new Error('Backend not configured. Set VITE_BACKEND_URL to enable real Duffel search.');
  }
  return backendCall<RescueSearchResponse>('/api/rescue/search', {
    method: 'POST',
    body: JSON.stringify(args),
  });
}

export async function holdRescueOffer(offerId: string) {
  if (!BACKEND_URL) throw new Error('Backend not configured');
  return backendCall<{ offerId: string; stillAvailable: boolean; totalAmount: string; totalCurrency: string; expiresAt: string }>(
    '/api/rescue/hold',
    { method: 'POST', body: JSON.stringify({ offerId }) },
  );
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
  // Legacy fallback fields for non-Duffel bookings (hotels, lounges).
  bookingType?: 'flight' | 'hotel' | 'lounge' | 'bundle';
  amountCents?: number;
  metadata?: Record<string, any>;
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
