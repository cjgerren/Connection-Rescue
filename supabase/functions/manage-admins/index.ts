import {
  type AdminRole,
  createAdminClient,
  hiddenOwnerEmails,
  jsonResponse,
  normalizeEmail,
  corsHeaders,
  resolveActor,
  writeAdminAudit
} from '../_shared/admin.ts';

interface ManageBody {
  action?: string;
  email?: string;
  role?: AdminRole;
  user_id?: string;
}

async function countVisibleOwners(admin: ReturnType<typeof createAdminClient>) {
  const { count, error } = await admin
    .from('admin_users')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'owner')
    .eq('is_hidden', false);
  if (error) throw error;
  return count || 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    const admin = createAdminClient();
    const actor = await resolveActor(req, admin);
    if (!actor.isOwner) {
      return jsonResponse({ ok: false, error: 'Owner access required' }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as ManageBody;
    const action = body.action || '';
    const hiddenEmails = hiddenOwnerEmails();

    if (action === 'list') {
      const [{ data: users, error: userError }, { data: invites, error: inviteError }] = await Promise.all([
        admin
          .from('admin_users')
          .select('id, user_id, email, role, created_at')
          .eq('is_hidden', false)
          .order('created_at', { ascending: true }),
        admin
          .from('admin_invites')
          .select('email, role, created_at')
          .order('created_at', { ascending: true })
      ]);
      if (userError) throw userError;
      if (inviteError) throw inviteError;
      return jsonResponse({ ok: true, users: users || [], invites: invites || [] });
    }

    if (action === 'add_invite') {
      const email = normalizeEmail(body.email);
      const role = body.role === 'owner' ? 'owner' : 'admin';
      if (!email) return jsonResponse({ ok: false, error: 'Email is required' }, 400);
      if (hiddenEmails.has(email)) {
        return jsonResponse({ ok: false, error: 'That account is managed as a hidden owner' }, 400);
      }

      const { error } = await admin.from('admin_invites').upsert({ email, role }, { onConflict: 'email' });
      if (error) throw error;
      await writeAdminAudit(admin, actor, 'add_invite', email, { email, role });
      return jsonResponse({ ok: true });
    }

    if (action === 'remove_invite') {
      const email = normalizeEmail(body.email);
      if (!email) return jsonResponse({ ok: false, error: 'Email is required' }, 400);
      if (hiddenEmails.has(email)) {
        return jsonResponse({ ok: false, error: 'Hidden owner invites cannot be removed here' }, 400);
      }

      const { error } = await admin.from('admin_invites').delete().eq('email', email);
      if (error) throw error;
      await writeAdminAudit(admin, actor, 'remove_invite', email, { email });
      return jsonResponse({ ok: true });
    }

    if (action === 'set_role') {
      const userId = String(body.user_id || '').trim();
      const role = body.role === 'owner' ? 'owner' : body.role === 'admin' ? 'admin' : null;
      if (!userId || !role) return jsonResponse({ ok: false, error: 'user_id and role are required' }, 400);
      if (userId === actor.id) {
        return jsonResponse({ ok: false, error: 'You cannot change your own role here' }, 400);
      }

      const { data: target, error: targetError } = await admin
        .from('admin_users')
        .select('user_id, email, role, is_hidden')
        .eq('user_id', userId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target) return jsonResponse({ ok: false, error: 'Target admin not found' }, 404);
      if (target.is_hidden) return jsonResponse({ ok: false, error: 'Hidden owner cannot be modified here' }, 400);

      if (target.role === 'owner' && role !== 'owner') {
        const ownerCount = await countVisibleOwners(admin);
        if (ownerCount <= 1) {
          return jsonResponse({ ok: false, error: 'Cannot demote the last visible owner' }, 400);
        }
      }

      const { error } = await admin.from('admin_users').update({ role }).eq('user_id', userId);
      if (error) throw error;
      await writeAdminAudit(admin, actor, 'set_role', userId, {
        target_email: target.email,
        previous_role: target.role,
        role
      });
      return jsonResponse({ ok: true });
    }

    if (action === 'revoke_user') {
      const userId = String(body.user_id || '').trim();
      if (!userId) return jsonResponse({ ok: false, error: 'user_id is required' }, 400);
      if (userId === actor.id) {
        return jsonResponse({ ok: false, error: 'You cannot revoke your own admin access here' }, 400);
      }

      const { data: target, error: targetError } = await admin
        .from('admin_users')
        .select('user_id, email, role, is_hidden')
        .eq('user_id', userId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target) return jsonResponse({ ok: false, error: 'Target admin not found' }, 404);
      if (target.is_hidden) return jsonResponse({ ok: false, error: 'Hidden owner cannot be revoked here' }, 400);

      if (target.role === 'owner') {
        const ownerCount = await countVisibleOwners(admin);
        if (ownerCount <= 1) {
          return jsonResponse({ ok: false, error: 'Cannot revoke the last visible owner' }, 400);
        }
      }

      const { error } = await admin.from('admin_users').delete().eq('user_id', userId);
      if (error) throw error;
      await writeAdminAudit(admin, actor, 'revoke_user', userId, {
        target_email: target.email,
        previous_role: target.role
      });
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: `Unsupported action: ${action}` }, 400);
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
