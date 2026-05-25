import { corsHeaders, jsonResponse, resolveActor, createAdminClient } from '../_shared/admin.ts';
import { sendSmsTwilio, smsEnvStatus } from '../_shared/sms.ts';

interface SendBookingSmsBody {
  to?: string;
  body?: string;
  text?: string;
  bookingId?: string;
  type?: string;
  flightNum?: string;
  oldGate?: string | null;
  newGate?: string | null;
  departureTime?: string | null;
}

interface BookingLookupRow {
  traveler_phone: string | null;
}

function buildGateChangeSms(body: SendBookingSmsBody) {
  const flightNum = String(body.flightNum || '').trim();
  const oldGate = String(body.oldGate || '').trim();
  const newGate = String(body.newGate || '').trim();
  const departureTime = String(body.departureTime || '').trim();
  const flightLabel = flightNum || 'your flight';
  const gateLine = oldGate && newGate
    ? `Gate changed ${oldGate} -> ${newGate}.`
    : (newGate ? `Gate updated to ${newGate}.` : 'Gate assignment changed.');
  return [
    `ConnectionRescue update for ${flightLabel}:`,
    gateLine,
    departureTime ? `Departs: ${departureTime}.` : '',
    'Check airport screens and airline app for live boarding updates.',
  ].filter(Boolean).join(' ');
}

async function resolveTargetPhone(admin: ReturnType<typeof createAdminClient>, body: SendBookingSmsBody) {
  const direct = String(body.to || '').trim();
  if (direct) return direct;
  const bookingId = String(body.bookingId || '').trim();
  if (!bookingId) return '';

  const { data, error } = await admin
    .from('bookings')
    .select('traveler_phone')
    .eq('id', bookingId)
    .maybeSingle();
  if (error) throw error;
  const booking = (data || null) as BookingLookupRow | null;
  return String(booking?.traveler_phone || '').trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);

  try {
    const admin = createAdminClient();
    const actor = await resolveActor(req, admin);
    if (!actor.isAdmin) return jsonResponse({ ok: false, error: 'Admin access required' }, 403);

    const env = smsEnvStatus();
    if (!env.configured) {
      return jsonResponse({
        ok: false,
        error: 'SMS not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID).',
      }, 501);
    }

    const body = await req.json().catch(() => ({})) as SendBookingSmsBody;
    const to = await resolveTargetPhone(admin, body);
    if (!to) return jsonResponse({ ok: false, error: 'Missing to (and no booking traveler phone found)' }, 400);

    const kind = String(body.type || 'admin_replay');
    const text = String(body.body || body.text || '').trim() || (
      kind === 'gate_change'
        ? buildGateChangeSms(body)
        : 'ConnectionRescue update: please check your latest rescue details.'
    );

    const result = await sendSmsTwilio({ to, body: text });
    if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 500);
    return jsonResponse({ ok: true, sid: result.sid });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
