import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, LogOut, Loader2, ScrollText, Search, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminAuthGate from '@/components/admin/AdminAuthGate';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AuditRow {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  target: string | null;
  payload: any;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  add_invite: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  remove_invite: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
  set_role: 'bg-blue-500/20 text-blue-200 border-blue-500/40',
  revoke_user: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
  rescue_resend: 'bg-purple-500/20 text-purple-200 border-purple-500/40',
  rescue_cancel: 'bg-rose-500/15 text-rose-200 border-rose-500/30'
};

const AdminAudit: React.FC = () => {
  const auth = useAdminAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!auth.isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('id, actor_user_id, actor_email, action, target, payload, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setRows(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [auth.isAdmin]);

  useEffect(() => { if (auth.isAdmin) load(); }, [auth.isAdmin, tick, load]);

  const actors = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.actor_email) s.add(r.actor_email); });
    return Array.from(s).sort();
  }, [rows]);

  const actions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(r.action));
    return Array.from(s).sort();
  }, [rows]);

  const visible = useMemo(() => rows.filter((r) => {
    if (actorFilter !== 'all' && r.actor_email !== actorFilter) return false;
    if (actionFilter !== 'all' && r.action !== actionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = [r.action, r.target, r.actor_email, JSON.stringify(r.payload || {})].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [rows, actorFilter, actionFilter, search]);

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-[#0a1024] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-blue-200"><Loader2 className="w-5 h-5 animate-spin" /> Restoring session…</div>
      </div>
    );
  }
  if (!auth.isAdmin) return <AdminAuthGate auth={auth} title="Audit log" subtitle="Admin-only — last 100 admin actions" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1024] via-[#0b1228] to-[#0a1024] text-white">
      <header className="sticky top-0 z-30 bg-[#0a1024]/90 backdrop-blur border-b border-purple-600/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="inline-flex items-center gap-2 text-blue-200/80 hover:text-white text-sm">
              <ArrowLeft className="w-4 h-4" /> Ops Console
            </Link>
            <span className="text-blue-200/30">/</span>
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-emerald-300" />
              <span className="text-sm font-semibold">Audit log</span>
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-emerald-300 text-xs uppercase tracking-widest font-bold">
            <ScrollText className="w-3.5 h-3.5" /> Admin actions · last 100
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">
            Audit <span className="text-emerald-400">log</span>
          </h1>
          <p className="text-blue-200/70 text-sm mt-2">
            Every mutation made through manage-admins (invite/role/revoke) and every Re-send / Cancel triggered from the Rescue queue. Filter by actor and action.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Filter className="w-3.5 h-3.5 text-blue-300/60" />
          <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none">
            <option value="all">All actors</option>
            {actors.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none">
            <option value="all">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search target, payload…"
              className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-blue-300/40 outline-none" />
          </div>
          <span className="text-[11px] text-blue-300/60">{visible.length} / {rows.length}</span>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 text-rose-200 bg-rose-500/10 border border-rose-500/40 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-[10px] uppercase tracking-wider text-blue-300/70">
                  <th className="text-left font-semibold py-3 px-3">When</th>
                  <th className="text-left font-semibold py-3 px-3">Actor</th>
                  <th className="text-left font-semibold py-3 px-3">Action</th>
                  <th className="text-left font-semibold py-3 px-3">Target</th>
                  <th className="text-left font-semibold py-3 px-3">Payload</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-blue-300/50 text-xs">No audit rows match.</td></tr>
                )}
                {visible.map((r) => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="py-2.5 px-3 text-blue-200 text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-white truncate max-w-[180px]">{r.actor_email || r.actor_user_id?.slice(0, 8) || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-semibold ${ACTION_COLORS[r.action] || 'bg-white/5 text-blue-200 border-white/10'}`}>
                        {r.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-purple-200 font-mono truncate max-w-[200px]">{r.target || '—'}</td>
                    <td className="py-2.5 px-3 text-[11px] text-blue-200/70 font-mono">
                      <code className="block max-w-[420px] truncate">{r.payload ? JSON.stringify(r.payload) : '—'}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAudit;
