// Service-role Supabase client for the backend.
// This bypasses RLS, so it MUST stay on the server.
//
// We also export a helper that validates a user JWT (the one the React app
// sends in `Authorization: Bearer <token>`) and returns the user — so admin
// routes can authorize without trusting client-supplied user_ids.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Don't crash — let routes return a clear 500 if Supabase isn't configured,
  // so `npm start` still works for local Duffel-only dev.
  console.warn(
    '[supabaseAdmin] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — DB writes will fail.'
  );
}

export const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

/** Returns the auth user for a given Bearer token, or null. */
export async function getUserFromAuthHeader(authHeader) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

/** Append a row to audit_logs. Best-effort — never throws. */
export async function writeAudit({ actorUserId, actorEmail, action, target, payload }) {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: actorUserId ?? null,
      actor_email: actorEmail ?? null,
      action,
      target: target ?? null,
      payload: payload ?? null,
    });
  } catch (e) {
    console.warn('[audit] insert failed', e?.message);
  }
}
