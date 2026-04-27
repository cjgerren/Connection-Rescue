import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  LogOut,
  Search,
  Loader2,
  Activity,
  ListChecks,
  XCircle,
  CheckCircle2,
  Send,
  Ban,
  CreditCard,
  ExternalLink,
  MessageSquare,
  Users
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminAuthGate from '@/components/admin/AdminAuthGate';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface RescueTask {
  id: string;
  created_at: string;
  requested_at: string | null;
  type: string | null;
  status: string | null;
  booking_id: string | null;
  flight_num: string | null;
  flight_date: string | null;
  traveler_email: string | null;
  traveler_phone: string | null;
  source: string | null;
  notes: string | null;
  result: any;
}

interface BookingLite {
  id: string;
  traveler_email: string | null;
  traveler_phone: string | null;
  item_label: string | null;
  booking_type: string | null;
  status: string | null;
  amount_cents: number | null;
  stripe_session_id: string | null;
  metadata: any;
}

interface SmsRow {
  id: string;
  received_at: string;
  from_number: string | null;
  body: string | null;
  command: string | null;
  action_taken: string | null;
  reply_body: string | null;
  matched_booking_id: string | null;
}

const STATUSES = [
  'queued', 'processing', 'options_sent', 'awaiting_payment',
  'paid', 'confirmed', 'payment_failed', 'checkout_failed',
  'no_options', 'sms_failed', 'cancelled', 'error'
];
const TYPES = ['rebook_search', 'hotel_hold', 'lounge_pass'];

const statusColors: Record<string, string> = {
  queued: 'bg-slate-500/20 text-slate-200 border-slate-500/40',
  processing: 'bg-blue-500/20 text-blue-200 border-blue-500/40',
  options_sent: 'bg-purple-500/20 text-purple-200 border-purple-500/40',
  awaiting_payment: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
  paid: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  confirmed: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  payment_failed: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
  checkout_failed: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
  no_options: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  sms_failed: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
  cancelled: 'bg-slate-500/30 text-slate-200 border-slate-500/40',
  error: 'bg-rose-500/30 text-rose-100 border-rose-500/50'
};

interface WorkerRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  processed: number;
  errors: number;
  duration_ms: number | null;
  trigger: string;
}

const AdminRescues: React.FC = () => {
  const auth = useAdminAuth();
  const [tasks, setTasks] = useState<RescueTask[]>([]);
  const [bookingMap, setBookingMap] = useState<Record<string, BookingLite>>({});
  const [smsMap, setSmsMap] = useState<Record<string, SmsRow[]>>({});
  const [runs, setRuns] = useState<WorkerRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const writeAudit = useCallback(async (action: string, target: string | null, payload: any) => {
    if (!auth.user?.id) return;
    try {
      await supabase.from('admin_audit_log').insert({
        actor_user_id: auth.user.id,
        actor_email: auth.adminEmail,
        action,
        target,
        payload
      });
    } catch (e) { /* non-fatal */ }
  }, [auth.user?.id, auth.adminEmail]);

  const loadData = useCallback(async () => {
    if (!auth.isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const { data: tData, error: tErr } = await supabase
        .from('rescue_tasks')
        .select('id, created_at, requested_at, type, status, booking_id, flight_num, flight_date, traveler_email, traveler_phone, source, notes, result')
        .order('requested_at', { ascending: false })
        .limit(200);
      if (tErr) throw tErr;
      const list = tData || [];
      setTasks(list);

      const { data: rData } = await supabase
        .from('rescue_task_runs')
        .select('id, started_at, finished_at, processed, errors, duration_ms, trigger')
        .order('started_at', { ascending: false })
        .limit(20);
      setRuns(rData || []);

      const bookingIds = Array.from(new Set(list.map((t) => t.booking_id).filter(Boolean))) as string[];
      if (bookingIds.length) {
        const { data: bData } = await supabase
          .from('bookings')
          .select('id, traveler_email, traveler_phone, item_label, booking_type, status, amount_cents, stripe_session_id, metadata')
          .in('id', bookingIds);
        const map: Record<string, BookingLite> = {};
        (bData || []).forEach((b) => { map[b.id] = b as BookingLite; });
        setBookingMap(map);

        const { data: sData } = await supabase
          .from('sms_inbound_log')
          .select('id, received_at, from_number, body, command, action_taken, reply_body, matched_booking_id')
          .in('matched_booking_id', bookingIds)
          .order('received_at', { ascending: false })
          .limit(500);
        const sMap: Record<string, SmsRow[]> = {};
        (sData || []).forEach((s) => {
          if (!s.matched_booking_id) return;
          (sMap[s.matched_booking_id] ||= []).push(s as SmsRow);
        });
        setSmsMap(sMap);
      } else {
        setBookingMap({});
        setSmsMap({});
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load rescue tasks');
    } finally {
      setLoading(false);
    }
  }, [auth.isAdmin]);

  useEffect(() => { if (auth.isAdmin) loadData(); }, [auth.isAdmin, tick, loadData]);
  useEffect(() => {
    if (!auth.isAdmin) return;
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, [auth.isAdmin]);

  const visible = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [
          t.id, t.flight_num, t.traveler_email, t.traveler_phone, t.notes,
          t.booking_id, JSON.stringify(t.result || {})
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filterStatus, filterType, search]);

  const stats = useMemo(() => {
    const by: Record<string, number> = {};
    tasks.forEach((t) => { by[t.status || 'unknown'] = (by[t.status || 'unknown'] || 0) + 1; });
    return by;
  }, [tasks]);

  const lastRun = runs[0];
  const lastTickAge = lastRun ? Math.round((Date.now() - new Date(lastRun.started_at).getTime()) / 1000) : null;
  const workerHealthy = lastTickAge != null && lastTickAge < 180; // alive if seen in last 3min

  const resendOptions = useCallback(async (task: RescueTask) => {
    setBusy(task.id);
    setActionLog(null);
    try {
      await supabase.from('rescue_tasks').update({
        status: 'queued',
        result: { ...(task.result || {}), resent_at: new Date().toISOString() }
      }).eq('id', task.id);
      const { data, error } = await supabase.functions.invoke('process-rescue-tasks', { body: { task_id: task.id } });
      if (error) throw error;
      await writeAudit('rescue_resend', task.id, { task_type: task.type, booking_id: task.booking_id, ok: !!data?.ok });
      setActionLog({ id: task.id, ok: !!data?.ok, msg: data?.ok ? 'Re-sent options SMS' : (data?.error || 'Re-send failed') });
      setTick((x) => x + 1);
    } catch (e: any) {
      setActionLog({ id: task.id, ok: false, msg: e.message || 'Re-send failed' });
    } finally { setBusy(null); }
  }, [writeAudit]);

  const cancelTask = useCallback(async (task: RescueTask) => {
    if (!window.confirm('Cancel this rescue task? The traveler will not receive any further options.')) return;
    setBusy(task.id);
    setActionLog(null);
    try {
      const { error } = await supabase.from('rescue_tasks').update({
        status: 'cancelled',
        result: { ...(task.result || {}), cancelled_at: new Date().toISOString(), cancelled_by: auth.adminEmail || 'admin' }
      }).eq('id', task.id);
      if (error) throw error;
      await writeAudit('rescue_cancel', task.id, { task_type: task.type, booking_id: task.booking_id });
      setActionLog({ id: task.id, ok: true, msg: 'Task cancelled' });
      setTick((x) => x + 1);
    } catch (e: any) {
      setActionLog({ id: task.id, ok: false, msg: e.message || 'Cancel failed' });
    } finally { setBusy(null); }
  }, [auth.adminEmail, writeAudit]);

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
    return <AdminAuthGate auth={auth} title="Rescue queue" subtitle="Admin-only — rescue task pipeline" />;
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
              <ListChecks className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold">Rescue queue</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/sms" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-100">
              <MessageSquare className="w-3.5 h-3.5" /> SMS log
            </Link>
            {auth.isOwner && (
              <Link to="/admin/team" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100">
                <Users className="w-3.5 h-3.5" /> Team
              </Link>
            )}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-purple-300 text-xs uppercase tracking-widest font-bold">
            <Activity className="w-3.5 h-3.5" /> Rescue tasks · last 200
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">
            Rescue <span className="text-purple-400">queue</span>
          </h1>
          <p className="text-blue-200/70 text-sm mt-2">
            Every queued / in-flight / paid rescue task. Click a row to see the linked booking, checkout session, and SMS thread. Use{' '}
            <span className="text-white">Re-send options</span> when a traveler hasn't replied yet.
          </p>
        </div>
        {/* Worker health card */}
        <div className={`mb-5 rounded-2xl border p-4 ${workerHealthy ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-rose-500/5 border-rose-500/40'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${workerHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-blue-200/70">Worker · process-rescue-tasks</div>
                <div className="text-sm font-semibold text-white">
                  {lastRun ? (
                    <>Last tick {lastTickAge != null ? `${lastTickAge}s ago` : '—'} · {lastRun.processed} processed · {lastRun.errors} errors · {lastRun.duration_ms ?? '—'}ms · {lastRun.trigger}</>
                  ) : <span className="text-blue-300/60">No ticks recorded yet — apply supabase/cron/process-rescue-tasks.sql</span>}
                </div>
              </div>
            </div>
            <Link to="/admin/audit" className="text-[11px] text-emerald-300 hover:underline inline-flex items-center gap-1">
              <Activity className="w-3 h-3" /> Audit log
            </Link>
          </div>
          {runs.length > 1 && (
            <div className="mt-3 flex items-end gap-1 h-8">
              {runs.slice(0, 20).reverse().map((r) => (
                <div key={r.id} title={`${r.processed} ok, ${r.errors} err · ${r.duration_ms}ms`}
                  className={`flex-1 rounded-t ${r.errors > 0 ? 'bg-rose-400/60' : r.processed > 0 ? 'bg-emerald-400/60' : 'bg-white/10'}`}
                  style={{ height: `${Math.min(100, 20 + (r.processed * 12) + (r.errors * 8))}%` }} />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-5">
          {['queued', 'options_sent', 'awaiting_payment', 'paid', 'confirmed', 'payment_failed'].map((s) => (
            <div key={s} className={`rounded-lg border px-3 py-2 ${statusColors[s] || 'border-white/10'}`}>
              <div className="text-[9px] uppercase tracking-widest opacity-80">{s.replace('_', ' ')}</div>
              <div className="text-lg font-black text-white mt-0.5">{stats[s] || 0}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none">
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none">
            <option value="all">All types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flight, email, phone, ref…"
              className="w-full bg-black/40 border border-white/10 focus:border-purple-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-blue-300/40 outline-none" />
          </div>
          <span className="text-[11px] text-blue-300/60">{visible.length} / {tasks.length} tasks</span>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 text-rose-200 bg-rose-500/10 border border-rose-500/40 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {actionLog && (
          <div className={`mb-4 flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${actionLog.ok
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-200'}`}>
            {actionLog.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            <span className="font-mono">{actionLog.id.slice(0, 8)}</span> · {actionLog.msg}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-[10px] uppercase tracking-wider text-blue-300/70">
                  <th className="text-left font-semibold py-3 px-3">Requested</th>
                  <th className="text-left font-semibold py-3 px-3">Type</th>
                  <th className="text-left font-semibold py-3 px-3">Status</th>
                  <th className="text-left font-semibold py-3 px-3">Flight</th>
                  <th className="text-left font-semibold py-3 px-3">Traveler</th>
                  <th className="text-left font-semibold py-3 px-3">Booking · Pay</th>
                  <th className="text-right font-semibold py-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-blue-300/50 text-xs">No rescue tasks match these filters.</td></tr>
                )}
                {visible.map((t) => {
                  const booking = t.booking_id ? bookingMap[t.booking_id] : null;
                  const isOpen = selected === t.id;
                  const result = t.result || {};
                  const checkoutUrl: string | null = result.checkout_url || null;
                  const sessionId: string | null = result.checkout_session_id || booking?.stripe_session_id || null;
                  return (
                    <React.Fragment key={t.id}>
                      <tr
                        onClick={() => setSelected(isOpen ? null : t.id)}
                        className={`border-t border-white/5 hover:bg-white/5 cursor-pointer transition ${isOpen ? 'bg-white/5' : ''}`}
                      >
                        <td className="py-2.5 px-3 text-blue-200 text-xs whitespace-nowrap">
                          {t.requested_at ? new Date(t.requested_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-purple-200 text-xs">{t.type}</td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-semibold ${statusColors[t.status || ''] || 'bg-white/5 text-blue-200 border-white/10'}`}>
                            {t.status || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-white">
                          {t.flight_num || '—'}
                          {t.flight_date && <span className="text-blue-300/40 ml-1">{t.flight_date}</span>}
                        </td>
                        <td className="py-2.5 px-3 text-xs">
                          <div className="text-white">{t.traveler_email || '—'}</div>
                          <div className="text-blue-300/60 text-[10px]">{t.traveler_phone || '—'}</div>
                        </td>
                        <td className="py-2.5 px-3 text-xs">
                          {booking ? (
                            <div>
                              <div className="text-purple-300 font-mono">{booking.id.slice(0, 8).toUpperCase()}</div>
                              <div className="text-blue-300/60 text-[10px]">{booking.status || '—'} · ${(booking.amount_cents || 0) / 100}</div>
                            </div>
                          ) : <span className="text-blue-300/40">—</span>}
                          {sessionId && (
                            <div className="mt-0.5 text-emerald-300/80 text-[10px] font-mono inline-flex items-center gap-1">
                              <CreditCard className="w-3 h-3" /> {sessionId.slice(-8)}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {(t.type === 'rebook_search' || t.type === 'hotel_hold') && t.status !== 'paid' && t.status !== 'confirmed' && t.status !== 'cancelled' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); resendOptions(t); }}
                                disabled={busy === t.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-100 disabled:opacity-50"
                              >
                                {busy === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                Re-send
                              </button>
                            )}
                            {t.status !== 'cancelled' && t.status !== 'paid' && t.status !== 'confirmed' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); cancelTask(t); }}
                                disabled={busy === t.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-100 disabled:opacity-50"
                              >
                                <Ban className="w-3 h-3" /> Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t border-white/5 bg-black/20">
                          <td colSpan={7} className="px-4 py-4">
                            <TaskDetail task={t} booking={booking} sms={(t.booking_id && smsMap[t.booking_id]) || []} checkoutUrl={checkoutUrl} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

const TaskDetail: React.FC<{ task: RescueTask; booking: BookingLite | null; sms: SmsRow[]; checkoutUrl: string | null }> = ({ task, booking, sms, checkoutUrl }) => {
  const result = task.result || {};
  const options: any[] = result.options || [];
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-[10px] uppercase tracking-widest text-purple-300 font-bold mb-2">Options sent</div>
        {options.length === 0 ? (
          <div className="text-blue-300/50 text-xs">No options stored on this task yet.</div>
        ) : (
          <ol className="space-y-2">
            {options.map((o, i) => (
              <li key={i} className={`text-xs rounded-lg border p-2 ${result.selected_index === i ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-black/30'}`}>
                <div className="font-semibold text-white">
                  {i + 1}. {o.flight_num || o.name || 'Option'}
                  {result.selected_index === i && <span className="ml-2 text-emerald-300">✓ chosen</span>}
                </div>
                <div className="text-blue-200/80 mt-0.5 text-[11px]">
                  {o.airline && <>airline: {o.airline} · </>}
                  {o.dep_iata && o.arr_iata && <>{o.dep_iata}→{o.arr_iata} · </>}
                  {o.rate_usd != null && <>${o.rate_usd}/night · </>}
                  {o.total_with_taxes != null && <>${o.total_with_taxes} total · </>}
                  {o.refundable_until && <>cxl by {new Date(o.refundable_until).toLocaleString()}</>}
                </div>
              </li>
            ))}
          </ol>
        )}
        {checkoutUrl && (
          <a href={checkoutUrl} target="_blank" rel="noopener noreferrer"
             className="mt-3 inline-flex items-center gap-1 text-emerald-300 text-xs hover:underline">
            <ExternalLink className="w-3 h-3" /> Open checkout session
          </a>
        )}
        {result.fare && (
          <div className="mt-3 text-[11px] text-blue-200/80">
            Fare: ${result.fare.fare_usd} + ${result.fare.change_fee_usd} change = <span className="text-white font-semibold">${result.fare.total_usd}</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-[10px] uppercase tracking-widest text-blue-300 font-bold mb-2">Linked booking</div>
        {!booking ? (
          <div className="text-blue-300/50 text-xs">No booking linked.</div>
        ) : (
          <div className="space-y-1 text-xs">
            <div className="font-mono text-white">{booking.id.slice(0, 8).toUpperCase()}</div>
            <div className="text-blue-200">{booking.item_label || booking.booking_type}</div>
            <div className="text-blue-300/70">Status: <span className="text-white">{booking.status}</span></div>
            <div className="text-blue-300/70">Amount: <span className="text-white">${(booking.amount_cents || 0) / 100}</span></div>
            <div className="text-blue-300/70 font-mono break-all">Stripe: {booking.stripe_session_id || '—'}</div>
            {booking.metadata?.flight_num && <div className="text-purple-200">Flight: {booking.metadata.flight_num}</div>}
            {result.checkout_booking_id && (
              <div className="text-emerald-300/80 font-mono">Child booking: {String(result.checkout_booking_id).slice(0, 8).toUpperCase()}</div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold mb-2">SMS thread</div>
        {sms.length === 0 ? (
          <div className="text-blue-300/50 text-xs">No inbound SMS for this booking yet.</div>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-auto pr-1">
            {sms.map((s) => (
              <li key={s.id} className="text-[11px]">
                <div className="text-blue-300/60">
                  {new Date(s.received_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' · '}<span className="text-purple-300 font-mono">{s.command}</span>
                </div>
                <div className="text-white">→ {s.body}</div>
                {s.reply_body && <div className="text-emerald-200/80">← {s.reply_body}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminRescues;
