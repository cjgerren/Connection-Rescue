import { corsHeaders, jsonResponse, resolveActor, createAdminClient } from '../_shared/admin.ts';

// Minimal stub: keeps the admin UI functional even when outbound SMS is not wired.
// Later: implement Twilio (or other provider) and write to a dedicated sms_outbound_log table.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);

  try {
    const admin = createAdminClient();
    const actor = await resolveActor(req, admin);
    if (!actor.isAdmin) return jsonResponse({ ok: false, error: 'Admin access required' }, 403);

    return jsonResponse({
      ok: false,
      error: 'SMS not configured. Set provider secrets and implement send-booking-sms.',
    }, 501);
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

