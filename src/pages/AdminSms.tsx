import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  XCircle,
  LogOut,
  Search,
  Activity,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminAuthGate from '@/components/admin/AdminAuthGate';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface InboundRow {
  id: string;
  received_at: string;
  from_number: string | null;
  to_number: string | null;
  message_sid: string | null;
  body: string | null;
  command: string | null;
  matched_booking_id: string | null;
  action_taken: string | null;
  reply_body: string | null;
  ok: boolean | null;
  error: string | null;
}

const AdminSms: React.FC = () => {
  const auth = useAdminAuth();
  const [rows, setRows] = useState<InboundRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [tick, setTick] = useState(0);

  const isAuthorized = auth.isAdmin;

  const loadRows = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('sms_inbound_log')
        .select('id, received_at, from_number, to_number, message_sid, body, command, matched_booking_id, action_taken, reply_body, ok, error')
        .order('received_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setRows(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load inbound SMS log');
    } finally {
      setLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => { if (isAuthorized) loadRows(); }, [isAuthorized, tick, loadRows]);
  useEffect(() => {
    if (!isAuthorized) return;
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, [isAuthorized]);

  const visible = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.trim().toLowerCase();
    return rows.filter((r) => {
      return (
        (r.from_number || '').toLowerCase().includes(q) ||
        (r.body || '').toLowerCase().includes(q) ||
        (r.command || '').toLowerCase().includes(q) ||
        (r.action_taken || '').toLowerCase().includes(q) ||
        (r.reply_body || '').toLowerCase().includes(q)
      );
    });
  }, [rows, filter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const okCount = rows.filter((r) => r.ok !== false).length;
    const failed = rows.filter((r) => r.ok === false).length;
    const matched = rows.filter((r) => !!r.matched_booking_id).length;
    return { total, okCount, failed, matched };
  }, [rows]);

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1d3a] via-[#0d2347] to-[#0a1d3a] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-blue-200">
          <Loader2 className="w-5 h-5 animate-spin" />
          Restoring session…
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <AdminAuthGate
        auth={auth}
        title="SMS Audit Log"
        subtitle="Admin-only — inbound 2-way SMS history"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1024] via-[#0b1228] to-[#0a1024] text-white">
      <header className="sticky top-0 z-30 bg-[#0a1024]/90 backdrop-blur border-b border-purple-600/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="inline-flex items-center gap-2 text-blue-200/80 hover:text-white text-sm">
              <ArrowLeft className="w-4 h-4" /> Ops Console
            </Link>
            <span className="text-blue-200/30">/</span>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold">SMS audit log</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live · auto-refresh 30s
            </span>
            <button
              onClick={() => setTick((x) => x + 1)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/10 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => auth.signOut()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-blue-200 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-purple-300 text-xs uppercase tracking-widest font-bold">
            <Activity className="w-3.5 h-3.5" /> Inbound · last 50 messages
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">
            Two-way <span className="text-purple-400">SMS audit</span>
          </h1>
          <p className="text-blue-200/70 text-sm mt-2">
            Signed in as <span className="text-white font-semibold">{auth.adminEmail || auth.user?.email}</span>
            {' · '}Every inbound Twilio webhook (REBOOK / LOUNGE / HOTEL / STATUS / 1-2-3 confirms) shows up here within seconds.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Messages" value={stats.total} accent="purple" />
          <Stat label="Matched a booking" value={stats.matched} accent="blue" />
          <Stat label="Processed OK" value={stats.okCount} accent="emerald" />
          <Stat label="Errors / rejected" value={stats.failed} accent={stats.failed > 0 ? 'rose' : 'emerald'} />
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by phone, command, body, action…"
              className="w-full bg-black/40 border border-white/10 focus:border-purple-500 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-blue-300/40 outline-none"
            />
          </div>
          <span className="text-[11px] text-blue-300/60">{visible.length} / {rows.length} rows</span>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 text-rose-200 bg-rose-500/10 border border-rose-500/40 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Couldn't load SMS log</div>
              <div className="text-rose-300/80 text-xs mt-0.5">{error}</div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-[10px] uppercase tracking-wider text-blue-300/70">
                  <th className="text-left font-semibold py-3 px-3">When</th>
                  <th className="text-left font-semibold py-3 px-3">From</th>
                  <th className="text-left font-semibold py-3 px-3">Body</th>
                  <th className="text-left font-semibold py-3 px-3">Command</th>
                  <th className="text-left font-semibold py-3 px-3">Booking</th>
                  <th className="text-left font-semibold py-3 px-3">Action</th>
                  <th className="text-left font-semibold py-3 px-3">Reply</th>
                  <th className="text-center font-semibold py-3 px-3">OK</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-blue-300/50 text-xs">
                      {rows.length === 0 ? 'No inbound SMS yet — try texting REBOOK to your Twilio number.' : 'No rows match this filter.'}
                    </td>
                  </tr>
                )}
                {visible.map((r) => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/5 align-top">
                    <td className="py-2.5 px-3 text-blue-200 text-xs whitespace-nowrap">
                      {new Date(r.received_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-white whitespace-nowrap">
                      {r.from_number || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-blue-100 text-xs max-w-xs">
                      <span className="line-clamp-2 break-words">{r.body || '—'}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <CommandBadge command={r.command} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {r.matched_booking_id ? (
                        <span className="text-purple-300">{r.matched_booking_id.slice(0, 8).toUpperCase()}</span>
                      ) : (
                        <span className="text-blue-300/40">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-blue-200 text-[11px] font-mono">
                      <span className="line-clamp-2 break-all">{r.action_taken || '—'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-blue-100 text-[11px] max-w-xs">
                      <span className="line-clamp-2 break-words">{r.reply_body || (r.action_taken === 'opt_out' ? <em className="text-blue-300/50">silent (STOP)</em> : '—')}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {r.ok === false ? (
                        <span title={r.error || 'Failed'}>
                          <XCircle className="w-4 h-4 text-rose-400 inline" />
                        </span>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 text-center text-blue-300/40 text-[11px]">
          Showing the last 50 inbound SMS messages. Auto-refreshes every 30 seconds. Twilio signature validation is enforced on the webhook.
        </div>
      </main>
    </div>
  );
};

const accentMap: Record<string, string> = {
  purple: 'border-purple-500/30 bg-purple-600/10 text-purple-200',
  blue: 'border-blue-500/30 bg-blue-600/10 text-blue-200',
  emerald: 'border-emerald-500/30 bg-emerald-600/10 text-emerald-200',
  rose: 'border-rose-500/30 bg-rose-600/10 text-rose-200',
  amber: 'border-amber-500/30 bg-amber-600/10 text-amber-200'
};

const Stat: React.FC<{ label: string; value: number | string; accent: keyof typeof accentMap }> = ({ label, value, accent }) => (
  <div className={`rounded-xl border ${accentMap[accent]} backdrop-blur px-4 py-3`}>
    <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">{label}</div>
    <div className="mt-1 text-2xl font-black text-white">{value}</div>
  </div>
);

const commandColors: Record<string, string> = {
  REBOOK: 'bg-blue-500/15 text-blue-200 border-blue-500/30',
  HOTEL: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  LOUNGE: 'bg-purple-500/15 text-purple-200 border-purple-500/30',
  STATUS: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
  HELP: 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30',
  STOP: 'bg-slate-500/15 text-slate-200 border-slate-500/30',
  CONFIRM_OPTION: 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/30',
  REJECTED: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
  UNKNOWN: 'bg-white/5 text-blue-300/70 border-white/10'
};

const CommandBadge: React.FC<{ command: string | null }> = ({ command }) => {
  const c = (command || 'UNKNOWN').toUpperCase();
  const cls = commandColors[c] || commandColors.UNKNOWN;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-semibold ${cls}`}>
      {c}
    </span>
  );
};

export default AdminSms;
