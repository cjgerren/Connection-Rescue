import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders, jsonResponse, resolveActor } from '../_shared/admin.ts';
import {
  emailEnvStatus,
  optionsEmailTemplate,
  sendEmailResend,
  type EmailSendResult
} from '../_shared/email.ts';

type RescueTaskType = 'rebook_search' | 'hotel_hold' | 'lounge_pass';

type RescueTaskOption = {
  flight_num?: string;
  date?: string;
  note?: string;
  name?: string;
  rate_usd?: number;
  refundable_until?: string;
  total_with_taxes?: number;
};

type RescueTaskResult = {
  email_last_fingerprint?: string;
  email_last_sent_at?: string | null;
  email?: { ok?: boolean; id?: string };
  [key: string]: unknown;
};

type RescueTaskRow = {
  id: string;
  type: RescueTaskType;
  flight_num: string | null;
  flight_date: string | null;
  traveler_email: string | null;
  booking_id: string | null;
  result: RescueTaskResult | null;
};

function toResult(value: unknown): RescueTaskResult {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as RescueTaskResult;
  }
  return {};
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeBearer(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7).trim();
}

function requiredEnvOneOf(names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  throw new Error(`Missing required env: ${names.join(' or ')}`);
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) throw new Error('Missing required env: SUPABASE_URL');
  const serviceKey = requiredEnvOneOf(['SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']);
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireServiceRoleOrAdmin(req: Request, admin: ReturnType<typeof adminClient>) {
  const token = normalizeBearer(req);
  const expected = requiredEnvOneOf(['SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']);
  if (token && token === expected) return { mode: 'service_role' };

  const actor = await resolveActor(req, admin);
  if (!actor.isAdmin) throw new Error('Unauthorized');
  return { mode: 'admin', actor };
}

function makeFlightOptions(flightNum: string | null, flightDate: string | null) {
  const base = (flightNum || 'FLIGHT').toUpperCase();
  const date = flightDate || new Date().toISOString().slice(0, 10);
  return [
    { flight_num: base, date, note: 'Same-flight standby (if available)' },
    { flight_num: `${base}A`, date, note: 'Alternate routing (best effort)' },
    { flight_num: `${base}B`, date, note: 'Next available departure (best effort)' },
  ];
}

function makeHotelOptions() {
  return [
    { name: 'Airport Hotel A', rate_usd: 189, refundable_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
    { name: 'Airport Hotel B', rate_usd: 219, refundable_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
    { name: 'Airport Hotel C', rate_usd: 249, refundable_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
  ];
}

function makeLoungeOptions() {
  return [
    { name: 'Priority Pass lounge', total_with_taxes: 49 },
    { name: 'Airline lounge day pass', total_with_taxes: 69 },
    { name: 'Premium lounge (if available)', total_with_taxes: 89 },
  ];
}

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);

  const startedAt = Date.now();
  let runId: string | null = null;
  let processed = 0;
  let errors = 0;

  try {
    const admin = adminClient();
    await requireServiceRoleOrAdmin(req, admin);

    const body = await req.json().catch(() => ({})) as { task_id?: string | null; source?: string | null; force?: boolean | null };
    const taskId = body.task_id ? String(body.task_id) : null;
    const force = !!body.force;
    const trigger = taskId ? 'manual' : (body.source ? String(body.source) : 'cron');

    const { data: runRow, error: runErr } = await admin
      .from('rescue_task_runs')
      .insert({ trigger })
      .select('id')
      .single();
    if (runErr) throw runErr;
    runId = runRow?.id || null;

    let tasks: RescueTaskRow[] = [];
    if (taskId) {
      const { data, error } = await admin
        .from('rescue_tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();
      if (error) throw error;
      tasks = data ? [data as RescueTaskRow] : [];
    } else {
      const { data, error } = await admin
        .from('rescue_tasks')
        .select('*')
        .eq('status', 'queued')
        .order('requested_at', { ascending: true })
        .limit(20);
      if (error) throw error;
      tasks = (data || []) as RescueTaskRow[];
    }

    for (const t of tasks) {
      try {
        // Mark processing (best-effort)
        await admin.from('rescue_tasks').update({ status: 'processing' }).eq('id', t.id);

        const type = String(t.type || '');
        let options: RescueTaskOption[] = [];
        if (type === 'rebook_search') options = makeFlightOptions(t.flight_num, t.flight_date);
        else if (type === 'hotel_hold') options = makeHotelOptions();
        else if (type === 'lounge_pass') options = makeLoungeOptions();

        // Email-first: send options to traveler_email if configured.
        const travelerEmail = String(t.traveler_email || '').trim().toLowerCase() || null;
        let emailResult: EmailSendResult = { ok: false, error: 'email_not_configured' };
        const env = emailEnvStatus();
        const priorResult = toResult(t.result);
        const fingerprintInput = JSON.stringify({
          type,
          flight_num: t.flight_num || null,
          flight_date: t.flight_date || null,
          options,
        });
        const fingerprint = await sha256Hex(fingerprintInput);
        const lastFingerprint = String(priorResult.email_last_fingerprint || '').trim() || null;
        const canSkip = !force && !!priorResult.email?.ok && lastFingerprint && lastFingerprint === fingerprint;

        if (travelerEmail && env.configured && options.length && !canSkip) {
          const tpl = optionsEmailTemplate({
            taskType: type,
            travelerEmail,
            options,
            flightNum: t.flight_num,
            flightDate: t.flight_date,
          });
          emailResult = await sendEmailResend({
            to: travelerEmail,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
            tags: [
              { name: 'product', value: 'connectionrescue' },
              { name: 'kind', value: 'rescue_options' },
              { name: 'task_id', value: String(t.id) },
            ],
          });
          // Best-effort log row.
          try {
            await admin.from('email_outbound_log').insert({
              provider: 'resend',
              provider_message_id: emailResult?.ok ? emailResult.id : null,
              to_email: travelerEmail,
              subject: tpl.subject,
              ok: !!emailResult?.ok,
              error: emailResult?.ok ? null : String(emailResult?.error || 'send_failed'),
              kind: 'rescue_options',
              idempotency_key: `rescue_task:${t.id}:${fingerprint}`,
              task_id: t.id,
              booking_id: t.booking_id || null,
              payload: {
                trigger,
                task_type: type,
                flight_num: t.flight_num || null,
                flight_date: t.flight_date || null,
                option_count: options.length,
                fingerprint,
              },
            });
          } catch { /* ignore */ }
        } else if (!travelerEmail) {
          emailResult = { ok: false, error: 'missing_traveler_email' };
        } else if (canSkip) {
          emailResult = { ok: true, id: String(priorResult.email?.id || 'skipped_duplicate') };
        }

        const result = {
          ...priorResult,
          options,
          computed_at: new Date().toISOString(),
          email: emailResult,
          email_last_fingerprint: fingerprint,
          email_last_sent_at: (emailResult.ok && !canSkip)
            ? new Date().toISOString()
            : (priorResult.email_last_sent_at || null),
          sms: { ok: false, error: 'sms_not_configured' },
        };

        const nextStatus = options.length ? 'options_sent' : 'no_options';
        const { error: updErr } = await admin
          .from('rescue_tasks')
          .update({ status: nextStatus, result })
          .eq('id', t.id);
        if (updErr) throw updErr;
        processed += 1;
      } catch (e) {
        errors += 1;
        // Best-effort error annotate.
        try {
          const priorResult = toResult(t.result);
          await admin
            .from('rescue_tasks')
            .update({ status: 'error', result: { ...priorResult, error: toErrorMessage(e) } })
            .eq('id', t.id);
        } catch { /* ignore */ }
      }
    }

    const durationMs = Date.now() - startedAt;
    if (runId) {
      await admin.from('rescue_task_runs').update({
        finished_at: new Date().toISOString(),
        processed,
        errors,
        duration_ms: durationMs,
      }).eq('id', runId);
    }

    return jsonResponse({ ok: true, runId, processed, errors });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    try {
      if (runId) {
        const admin = adminClient();
        await admin.from('rescue_task_runs').update({
          finished_at: new Date().toISOString(),
          processed,
          errors: errors + 1,
          duration_ms: durationMs,
        }).eq('id', runId);
      }
    } catch { /* ignore */ }
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
