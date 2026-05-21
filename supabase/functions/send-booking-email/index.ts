import { corsHeaders, createAdminClient, jsonResponse, resolveActor } from '../_shared/admin.ts';
import { emailEnvStatus, sendEmailResend } from '../_shared/email.ts';

// Admin-only replay/dispatch helper for email notifications.
// Payload shape is intentionally flexible while we harden the ops flows.

interface SendBookingEmailBody {
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
  bookingId?: string;
  type?: string;
  flightNum?: string;
  oldGate?: string | null;
  newGate?: string | null;
  departureTime?: string | null;
}

interface BookingLookupRow {
  traveler_email: string | null;
  metadata: Record<string, unknown> | null;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function buildGateChangeMessage(body: SendBookingEmailBody) {
  const flightNum = String(body.flightNum || '').trim();
  const oldGate = String(body.oldGate || '').trim();
  const newGate = String(body.newGate || '').trim();
  const departureTime = String(body.departureTime || '').trim();
  const flightLabel = flightNum || 'your flight';
  const gateLine = oldGate && newGate
    ? `Gate changed from ${oldGate} to ${newGate}.`
    : (newGate ? `Gate updated to ${newGate}.` : 'Gate assignment changed.');
  const departLine = departureTime ? `Updated departure time: ${departureTime}.` : '';

  const subject = `ConnectionRescue update: ${flightLabel}`;
  const text = [
    `Update for ${flightLabel}:`,
    gateLine,
    departLine,
    '',
    'Please check the airport screens and your airline app for final boarding details.'
  ].filter(Boolean).join('\n');
  const html = `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.45">
      <h2 style="margin:0 0 8px 0">${escapeHtml(subject)}</h2>
      <p style="margin:0 0 6px 0;color:#0f172a">${escapeHtml(gateLine)}</p>
      ${departLine ? `<p style="margin:0 0 6px 0;color:#0f172a">${escapeHtml(departLine)}</p>` : ''}
      <p style="margin:12px 0 0 0;color:#64748b;font-size:12px">
        Check airport displays and your airline app for live boarding updates.
      </p>
    </div>
  `.trim();

  return { subject, text, html };
}

async function resolveTargetEmail(admin: ReturnType<typeof createAdminClient>, body: SendBookingEmailBody) {
  const direct = String(body.to || '').trim().toLowerCase();
  if (direct) return direct;
  const bookingId = String(body.bookingId || '').trim();
  if (!bookingId) return '';

  const { data, error } = await admin
    .from('bookings')
    .select('traveler_email, metadata')
    .eq('id', bookingId)
    .maybeSingle();
  if (error) throw error;
  const booking = (data || null) as BookingLookupRow | null;
  return String(booking?.traveler_email || '').trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);

  try {
    const admin = createAdminClient();
    const actor = await resolveActor(req, admin);
    if (!actor.isAdmin) return jsonResponse({ ok: false, error: 'Admin access required' }, 403);

    const env = emailEnvStatus();
    if (!env.configured) {
      return jsonResponse({ ok: false, error: 'Email not configured (RESEND_API_KEY, RESCUE_EMAIL_FROM)' }, 501);
    }

    const body = await req.json().catch(() => ({})) as SendBookingEmailBody;

    const to = await resolveTargetEmail(admin, body);
    if (!to) return jsonResponse({ ok: false, error: 'Missing to (and no booking traveler email found)' }, 400);

    const kind = String(body.type || 'admin_replay');
    const isGateChange = kind === 'gate_change';
    const gateMessage = isGateChange ? buildGateChangeMessage(body) : null;
    const subject = String(body.subject || gateMessage?.subject || 'ConnectionRescue update');
    const text = String(body.text || gateMessage?.text || 'ConnectionRescue update');
    const html = String(body.html || '').trim() || gateMessage?.html || `<pre>${escapeHtml(text)}</pre>`;

    const r = await sendEmailResend({
      to,
      subject,
      html,
      text,
      tags: [
        { name: 'product', value: 'connectionrescue' },
        { name: 'kind', value: kind },
        ...(body.bookingId ? [{ name: 'booking_id', value: String(body.bookingId) }] : []),
      ],
    });

    // Best-effort logging
    try {
      await admin.from('email_outbound_log').insert({
        provider: 'resend',
        provider_message_id: r.ok ? r.id : null,
        to_email: to,
        subject,
        ok: !!r.ok,
        error: r.ok ? null : r.error,
        kind,
        booking_id: body.bookingId || null,
        payload: {
          bookingId: body.bookingId || null,
          flightNum: body.flightNum || null,
          oldGate: body.oldGate || null,
          newGate: body.newGate || null,
          departureTime: body.departureTime || null,
          kind,
        },
      });
    } catch { /* ignore */ }

    if (!r.ok) return jsonResponse({ ok: false, error: r.error }, 500);
    return jsonResponse({ ok: true, id: r.id });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
