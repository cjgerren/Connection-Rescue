import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  LogOut,
  Loader2,
  Users,
  ShieldCheck,
  Crown,
  UserPlus,
  Trash2,
  CheckCircle2,
  XCircle,
  Mail
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminAuthGate from '@/components/admin/AdminAuthGate';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'owner';
  created_at: string;
}
interface AdminInvite {
  email: string;
  role: 'admin' | 'owner';
  created_at: string;
}

const AdminTeam: React.FC = () => {
  const auth = useAdminAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'owner'>('admin');

  const callManage = useCallback(async (body: any) => {
    const { data, error } = await supabase.functions.invoke('manage-admins', { body });
    if (error) throw new Error(error.message);
    if (!data?.ok) throw new Error(data?.error || 'manage-admins failed');
    return data;
  }, []);

  const load = useCallback(async () => {
    if (!auth.isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await callManage({ action: 'list' });
      setUsers(data.users || []);
      setInvites(data.invites || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [auth.isAdmin, callManage]);

  useEffect(() => { if (auth.isAdmin) load(); }, [auth.isAdmin, tick, load]);

  const addInvite = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('add');
    setFlash(null);
    try {
      await callManage({ action: 'add_invite', email: newEmail.trim().toLowerCase(), role: newRole });
      setFlash({ ok: true, msg: `Invited ${newEmail} as ${newRole}` });
      setNewEmail('');
      setTick((x) => x + 1);
    } catch (e: any) {
      setFlash({ ok: false, msg: e.message });
    } finally {
      setBusy(null);
    }
  }, [callManage, newEmail, newRole]);

  const removeInvite = useCallback(async (email: string) => {
    if (!window.confirm(`Remove invite for ${email}?`)) return;
    setBusy(`inv:${email}`);
    setFlash(null);
    try {
      await callManage({ action: 'remove_invite', email });
      setFlash({ ok: true, msg: `Removed invite ${email}` });
      setTick((x) => x + 1);
    } catch (e: any) {
      setFlash({ ok: false, msg: e.message });
    } finally {
      setBusy(null);
    }
  }, [callManage]);

  const setRole = useCallback(async (user: AdminUser, role: 'admin' | 'owner') => {
    setBusy(`role:${user.user_id}`);
    setFlash(null);
    try {
      await callManage({ action: 'set_role', user_id: user.user_id, role });
      setFlash({ ok: true, msg: `${user.email} → ${role}` });
      setTick((x) => x + 1);
    } catch (e: any) {
      setFlash({ ok: false, msg: e.message });
    } finally {
      setBusy(null);
    }
  }, [callManage]);

  const revokeUser = useCallback(async (user: AdminUser) => {
    if (!window.confirm(`Revoke admin access for ${user.email}? They will be signed out of the ops console.`)) return;
    setBusy(`revoke:${user.user_id}`);
    setFlash(null);
    try {
      await callManage({ action: 'revoke_user', user_id: user.user_id });
      setFlash({ ok: true, msg: `Revoked ${user.email}` });
      setTick((x) => x + 1);
    } catch (e: any) {
      setFlash({ ok: false, msg: e.message });
    } finally {
      setBusy(null);
    }
  }, [callManage]);

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1d3a] via-[#0d2347] to-[#0a1d3a] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-blue-200">
          <Loader2 className="w-5 h-5 animate-spin" /> Restoring session…
        </div>
      </div>
    );
  }
  if (!auth.isAdmin) {
    return <AdminAuthGate auth={auth} title="Admin team" subtitle="Owner-only — manage admins & invites" />;
  }
  if (!auth.isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1024] via-[#0b1228] to-[#0a1024] text-white">
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center mb-4">
            <ShieldCheck className="w-7 h-7 text-rose-300" />
          </div>
          <h1 className="text-2xl font-black">Owner-only area</h1>
          <p className="mt-2 text-blue-200/70 text-sm">
            Your account is signed in as <span className="text-white font-mono">{auth.adminEmail}</span> with role{' '}
            <span className="text-white font-semibold">{auth.role || 'admin'}</span>. Only role=owner accounts can
            manage admin invites. Ask another owner to elevate you.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/admin" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-white/10 hover:bg-white/15 border border-white/10">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to ops console
            </Link>
            <button onClick={() => auth.signOut()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-blue-200">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1024] via-[#0b1228] to-[#0a1024] text-white">
      <header className="sticky top-0 z-30 bg-[#0a1024]/90 backdrop-blur border-b border-purple-600/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="inline-flex items-center gap-2 text-blue-200/80 hover:text-white text-sm">
              <ArrowLeft className="w-4 h-4" /> Ops Console
            </Link>
            <span className="text-blue-200/30">/</span>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-semibold">Team</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTick((x) => x + 1)} disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/10 transition disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={() => auth.signOut()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-blue-200 transition">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-amber-300 text-xs uppercase tracking-widest font-bold">
            <Crown className="w-3.5 h-3.5" /> Owner area
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">
            Admin <span className="text-amber-400">team</span>
          </h1>
          <p className="text-blue-200/70 text-sm mt-2">
            Signed in as <span className="text-white font-semibold">{auth.adminEmail}</span> ({auth.role}).
            Add an email to <span className="text-white">admin_invites</span> and that user becomes an admin
            the moment they sign up. Mutations go through the <span className="font-mono">manage-admins</span> edge
            function (service role + owner check).
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 text-rose-200 bg-rose-500/10 border border-rose-500/40 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}
        {flash && (
          <div className={`mb-4 flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${flash.ok
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-200'}`}>
            {flash.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} {flash.msg}
          </div>
        )}

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 mb-6">
          <div className="flex items-center gap-2 text-amber-200 font-semibold mb-3">
            <UserPlus className="w-4 h-4" /> Invite a new admin
          </div>
          <form onSubmit={addInvite} className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[220px]">
              <label className="text-[10px] uppercase tracking-widest text-amber-200/70 font-bold flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ops@connectionrescue.app"
                className="mt-1 w-full bg-black/40 border border-amber-500/20 focus:border-amber-400 rounded-lg px-3 py-2 text-sm text-white placeholder:text-amber-200/30 outline-none" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-amber-200/70 font-bold">Role</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)}
                className="mt-1 bg-black/40 border border-amber-500/20 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="admin">admin</option>
                <option value="owner">owner</option>
              </select>
            </div>
            <button type="submit" disabled={busy === 'add' || !newEmail}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {busy === 'add' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Send invite
            </button>
          </form>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-300" /> Active admins ({users.length})</h2>
            <ul className="divide-y divide-white/5">
              {users.length === 0 && <li className="py-6 text-center text-blue-300/50 text-xs">No admin_users rows yet.</li>}
              {users.map((u) => (
                <li key={u.user_id} className="py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${u.role === 'owner' ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40' : 'bg-purple-500/20 text-purple-200 border border-purple-500/40'}`}>
                    {u.role === 'owner' ? <Crown className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{u.email}</div>
                    <div className="text-[10px] text-blue-300/60 font-mono">{u.user_id.slice(0, 8)} · {u.role} · joined {new Date(u.created_at).toLocaleDateString()}</div>
                  </div>
                  <select
                    value={u.role}
                    onChange={(e) => setRole(u, e.target.value as 'admin' | 'owner')}
                    disabled={busy === `role:${u.user_id}` || u.user_id === auth.user?.id}
                    className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white outline-none disabled:opacity-50"
                  >
                    <option value="admin">admin</option>
                    <option value="owner">owner</option>
                  </select>
                  <button
                    onClick={() => revokeUser(u)}
                    disabled={busy === `revoke:${u.user_id}` || u.user_id === auth.user?.id}
                    className="inline-flex items-center gap-1 text-rose-200 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 rounded px-2 py-1 text-[11px] disabled:opacity-40"
                    title={u.user_id === auth.user?.id ? "Can't revoke yourself" : 'Revoke admin access'}
                  >
                    <Trash2 className="w-3 h-3" /> Revoke
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Mail className="w-4 h-4 text-amber-300" /> Pending invites ({invites.length})</h2>
            <ul className="divide-y divide-white/5">
              {invites.length === 0 && <li className="py-6 text-center text-blue-300/50 text-xs">No pending invites.</li>}
              {invites.map((i) => (
                <li key={i.email} className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-200 border border-blue-500/40 flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{i.email}</div>
                    <div className="text-[10px] text-blue-300/60">{i.role} · invited {new Date(i.created_at).toLocaleDateString()}</div>
                  </div>
                  <button
                    onClick={() => removeInvite(i.email)}
                    disabled={busy === `inv:${i.email}`}
                    className="inline-flex items-center gap-1 text-rose-200 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 rounded px-2 py-1 text-[11px] disabled:opacity-40"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <p className="mt-8 text-[11px] text-blue-300/40 text-center">
          Last-owner protection prevents demoting / revoking the only remaining owner. Mutations gated by manage-admins (owner role + service-role).
        </p>
      </main>
    </div>
  );
};

export default AdminTeam;
