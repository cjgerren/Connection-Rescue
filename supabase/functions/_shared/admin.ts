import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

export type AdminRole = 'admin' | 'owner';

export interface RequestUser {
  id: string;
  email: string;
}

export interface AdminActor extends RequestUser {
  role: AdminRole | null;
  isAdmin: boolean;
  isOwner: boolean;
  isHiddenOwner: boolean;
  displayEmail: string;
}

export const GHOST_ADMIN_EMAIL = 'ghost-owner';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

export function normalizeEmail(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function requiredEnvOneOf(names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  throw new Error(`Missing required env: ${names.join(' or ')}`);
}

export function createAdminClient() {
  return createClient(
    requiredEnv('SUPABASE_URL'),
    // Supabase CLI blocks secrets starting with SUPABASE_, so we allow SERVICE_ROLE_KEY too.
    requiredEnvOneOf(['SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

export function hiddenOwnerEmails() {
  return new Set(
    (Deno.env.get('HIDDEN_OWNER_EMAILS') || '')
      .split(',')
      .map((value) => normalizeEmail(value))
      .filter(Boolean)
  );
}

export async function getRequestUser(req: Request, admin: SupabaseClient): Promise<RequestUser> {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) throw new Error('Missing bearer token');

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.id || !data.user.email) {
    throw new Error('Unauthorized');
  }
  return {
    id: data.user.id,
    email: normalizeEmail(data.user.email)
  };
}

export async function resolveActor(req: Request, admin: SupabaseClient): Promise<AdminActor> {
  const user = await getRequestUser(req, admin);
  const hidden = hiddenOwnerEmails().has(user.email);

  const { data: row, error } = await admin
    .from('admin_users')
    .select('role, is_hidden')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;

  const role = hidden ? 'owner' : ((row?.role || null) as AdminRole | null);
  const isAdmin = hidden || !!row;
  return {
    ...user,
    role,
    isAdmin,
    isOwner: role === 'owner',
    isHiddenOwner: hidden || !!row?.is_hidden,
    displayEmail: hidden || row?.is_hidden ? GHOST_ADMIN_EMAIL : user.email
  };
}

export async function writeAdminAudit(
  admin: SupabaseClient,
  actor: AdminActor,
  action: string,
  target: string | null,
  payload: Record<string, unknown>
) {
  const { error } = await admin.from('admin_audit_log').insert({
    actor_user_id: actor.isHiddenOwner ? null : actor.id,
    actor_email: actor.displayEmail,
    action,
    target,
    payload
  });
  if (error) throw error;
}
