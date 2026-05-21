import {
  createAdminClient,
  GHOST_ADMIN_EMAIL,
  jsonResponse,
  normalizeEmail,
  corsHeaders,
  getRequestUser,
  hiddenOwnerEmails
} from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    const admin = createAdminClient();
    const user = await getRequestUser(req, admin);
    const email = normalizeEmail(user.email);
    const hiddenOwner = hiddenOwnerEmails().has(email);

    if (hiddenOwner) {
      const { error } = await admin.from('admin_users').upsert({
        user_id: user.id,
        email,
        role: 'owner',
        is_hidden: true
      }, {
        onConflict: 'user_id'
      });
      if (error) throw error;

      return jsonResponse({
        ok: true,
        isAdmin: true,
        hiddenOwner: true,
        isOwner: true,
        role: 'owner',
        email: GHOST_ADMIN_EMAIL
      });
    }

    const { data: existing, error: existingError } = await admin
      .from('admin_users')
      .select('email, role, is_hidden')
      .eq('user_id', user.id)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      return jsonResponse({
        ok: true,
        isAdmin: true,
        hiddenOwner: !!existing.is_hidden,
        isOwner: existing.role === 'owner',
        role: existing.role,
        email: existing.is_hidden ? GHOST_ADMIN_EMAIL : existing.email
      });
    }

    const { data: invite, error: inviteError } = await admin
      .from('admin_invites')
      .select('email, role')
      .eq('email', email)
      .maybeSingle();
    if (inviteError) throw inviteError;

    if (!invite) {
      return jsonResponse({
        ok: true,
        isAdmin: false,
        hiddenOwner: false,
        isOwner: false,
        role: null,
        email
      });
    }

    const { error: promoteError } = await admin.from('admin_users').upsert({
      user_id: user.id,
      email,
      role: invite.role,
      is_hidden: false
    }, {
      onConflict: 'user_id'
    });
    if (promoteError) throw promoteError;

    return jsonResponse({
      ok: true,
      isAdmin: true,
      hiddenOwner: false,
      isOwner: invite.role === 'owner',
      role: invite.role,
      email
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
