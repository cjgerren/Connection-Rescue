import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  LogOut,
  Activity,
  AlertTriangle,
  Plane,
  Bell,
  Clock,
  Lock,
  Inbox,
  MessageSquare,
  Loader2
} from 'lucide-react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  Line,
  LineChart,
  Bar,
  BarChart
} from 'recharts';
import { supabase } from '@/lib/supabase';
import RunDetailDrawer from '@/components/admin/RunDetailDrawer';
import AdminAuthGate from '@/components/admin/AdminAuthGate';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface PollingRun {
  id: string;
  ran_at: string;
  flights_checked: number;
  bookings_considered: number;
  alerts_sent: number;
  duration_ms: number;
  ok: boolean;
  error: string | null;
  summary: any;
}

interface Snapshot {
  id?: string;
  flight_num: string;
  flight_date: string;
  flight_status: string | null;
  gate: string | null;
  terminal: string | null;
  scheduled_departure: string | null;
  estimated_departure: string | null;
  delay_minutes: number | null;
  updated_at: string;
}

interface BookingRow {
  id: string;
  traveler_email: string;
  traveler_phone: string | null;
  item_label: string | null;
  booking_type: string | null;
  last_alert_sent_at: string | null;
  metadata: any;
}

const Admin: React.FC = () => {
  const auth = useAdminAuth();

  const [runs, setRuns] = useState<PollingRun[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [recentlyAlerted, setRecentlyAlerted] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Detail drawer state
  const [drawerRun, setDrawerRun] = useState<PollingRun | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusFlight, setFocusFlight] = useState<string | null>(null);

  const isAuthorized = auth.isAdmin;

  const openRunDrawer = useCallback((run: PollingRun | null, flight?: string | null) => {
    if (!run) return;
    setDrawerRun(run);
    setFocusFlight(flight || null);
    setDrawerOpen(true);
  }, []);

  const openLatestRunForFlight = useCallback((flightNum: string) => {
    if (!flightNum) return;
    const upper = flightNum.toUpperCase();
    for (let i = runs.length - 1; i >= 0; i--) {
      const r = runs[i];
      const flights: any[] = Array.isArray(r.summary)
        ? r.summary
        : Array.isArray(r.summary?.flights)
          ? r.summary.flights
          : [];
      const hit = flights.some((f: any) =>
        String(f?.flight_num || f?.flightNum || '').toUpperCase() === upper
      );
      if (hit) {
        openRunDrawer(r, flightNum);
        return;
      }
    }
    const fallback = runs.length ? runs[runs.length - 1] : null;
    openRunDrawer(fallback, flightNum);
  }, [runs, openRunDrawer]);

  const loadData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const [runRes, snapRes, bookRes] = await Promise.all([
        supabase
          .from('flight_polling_runs')
          .select('id, ran_at, flights_checked, bookings_considered, alerts_sent, duration_ms, ok, error, summary')
          .gte('ran_at', since)
          .order('ran_at', { ascending: true })
          .limit(500),
        supabase
          .from('flight_status_snapshots')
          .select('flight_num, flight_date, flight_status, gate, terminal, scheduled_departure, estimated_departure, delay_minutes, updated_at')
          .order('updated_at', { ascending: false })
          .limit(25),
        supabase
          .from('bookings')
          .select('id, traveler_email, traveler_phone, item_label, booking_type, last_alert_sent_at, metadata')
          .gte('last_alert_sent_at', oneHourAgo)
          .order('last_alert_sent_at', { ascending: false })
          .limit(50)
      ]);

      if (runRes.error) throw runRes.error;
      if (snapRes.error) throw snapRes.error;
      if (bookRes.error) throw bookRes.error;

      setRuns(runRes.data || []);
      setSnapshots(snapRes.data || []);
      setRecentlyAlerted(bookRes.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) loadData();
  }, [isAuthorized, tick, loadData]);

  useEffect(() => {
    if (!isAuthorized) return;
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, [isAuthorized]);

  const chartData = useMemo(() => {
    return runs.map((r) => ({
      time: new Date(r.ran_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ranAt: r.ran_at,
      flights_checked: r.flights_checked || 0,
      alerts_sent: r.alerts_sent || 0,
      duration_ms: r.duration_ms || 0,
      ok: r.ok
    }));
  }, [runs]);

  const stats = useMemo(() => {
    const totalRuns = runs.length;
    const totalFlights = runs.reduce((s, r) => s + (r.flights_checked || 0), 0);
    const totalAlerts = runs.reduce((s, r) => s + (r.alerts_sent || 0), 0);
    const failedRuns = runs.filter((r) => !r.ok).length;
    const avgDuration = totalRuns ? Math.round(runs.reduce((s, r) => s + (r.duration_ms || 0), 0) / totalRuns) : 0;
    const lastRun = runs.length ? runs[runs.length - 1] : null;
    return { totalRuns, totalFlights, totalAlerts, failedRuns, avgDuration, lastRun };
  }, [runs]);

  // ----- Loading boot screen --------------------------------------------
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

  // ----- Sign-in gate (real db auth, no localStorage) -------------------
  if (!isAuthorized) {
    return (
      <AdminAuthGate
        auth={auth}
        title="Ops Console"
        subtitle="Admin-only — alerting pipeline monitor"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1024] via-[#0b1228] to-[#0a1024] text-white">
      <header className="sticky top-0 z-30 bg-[#0a1024]/90 backdrop-blur border-b border-purple-600/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-2 text-blue-200/80 hover:text-white text-sm">
              <ArrowLeft className="w-4 h-4" /> Home
            </Link>
            <span className="text-blue-200/30">/</span>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold">Ops Console</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live · auto-refresh 30s
            </span>
            <Link
              to="/admin/sms"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-100 transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              SMS log
            </Link>

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
            <Activity className="w-3.5 h-3.5" /> Polling pipeline · last 24h
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">
            Alert system <span className="text-purple-400">health</span>
          </h1>
          <p className="text-blue-200/70 text-sm mt-2">
            Signed in as <span className="text-white font-semibold">{auth.adminEmail || auth.user?.email}</span>
            {stats.lastRun && (
              <>
                {' · '}Last poll{' '}
                <span className="text-white">
                  {new Date(stats.lastRun.ran_at).toLocaleTimeString()}
                </span>{' '}
                {stats.lastRun.ok ? (
                  <span className="text-emerald-400">OK</span>
                ) : (
                  <span className="text-rose-400">FAILED</span>
                )}
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <Kpi label="Polling runs (24h)" value={stats.totalRuns} icon={<Activity className="w-4 h-4" />} accent="purple" />
          <Kpi label="Flights checked" value={stats.totalFlights} icon={<Plane className="w-4 h-4" />} accent="blue" />
          <Kpi label="Alerts sent" value={stats.totalAlerts} icon={<Bell className="w-4 h-4" />} accent="red" />
          <Kpi label="Avg duration" value={`${stats.avgDuration}ms`} icon={<Clock className="w-4 h-4" />} accent="amber" />
          <Kpi label="Failed runs" value={stats.failedRuns} icon={<AlertTriangle className="w-4 h-4" />} accent={stats.failedRuns > 0 ? 'rose' : 'emerald'} />
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 text-rose-200 bg-rose-500/10 border border-rose-500/40 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Couldn't load admin data</div>
              <div className="text-rose-300/80 text-xs mt-0.5">{error}</div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-4 mb-8">
          <ChartCard title="Flights checked & alerts sent" subtitle="Per polling run">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="flightsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="alertsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <ReTooltip
                  contentStyle={{
                    background: '#0b1228',
                    border: '1px solid #ffffff20',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#fff'
                  }}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
                <Area
                  type="monotone"
                  dataKey="flights_checked"
                  name="Flights"
                  stroke="#60a5fa"
                  fill="url(#flightsGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="alerts_sent"
                  name="Alerts"
                  stroke="#f87171"
                  fill="url(#alertsGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Run duration" subtitle="Milliseconds per run">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <ReTooltip
                  contentStyle={{
                    background: '#0b1228',
                    border: '1px solid #ffffff20',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#fff'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="duration_ms"
                  name="ms"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#fbbf24' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-8">
          <ChartCard title="Alerts dispatched" subtitle="Bar view per run" className="lg:col-span-1">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <ReTooltip
                  contentStyle={{
                    background: '#0b1228',
                    border: '1px solid #ffffff20',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#fff'
                  }}
                />
                <Bar
                  dataKey="alerts_sent"
                  fill="#a855f7"
                  radius={[3, 3, 0, 0]}
                  cursor="pointer"
                  onClick={(d: any) => {
                    const ranAt = d?.payload?.ranAt;
                    if (!ranAt) return;
                    const run = runs.find((r) => r.ran_at === ranAt);
                    if (run) openRunDrawer(run);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-purple-300/80 font-bold">Past 60 min</div>
                <div className="text-lg font-bold flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-purple-300" />
                  Bookings just alerted
                </div>
              </div>
              <span className="text-xs text-blue-200/60">{recentlyAlerted.length} bookings</span>
            </div>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-blue-300/60">
                    <th className="text-left font-semibold py-2 px-2">When</th>
                    <th className="text-left font-semibold py-2 px-2">Traveler</th>
                    <th className="text-left font-semibold py-2 px-2">Item</th>
                    <th className="text-left font-semibold py-2 px-2">Flight</th>
                  </tr>
                </thead>
                <tbody>
                  {recentlyAlerted.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-blue-300/50 text-xs">
                        No bookings have been alerted in the last hour.
                      </td>
                    </tr>
                  )}
                  {recentlyAlerted.map((b) => (
                    <tr key={b.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="py-2 px-2 text-blue-200 whitespace-nowrap">
                        {b.last_alert_sent_at
                          ? new Date(b.last_alert_sent_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—'}
                      </td>
                      <td className="py-2 px-2">
                        <div className="text-white text-xs font-mono">{b.traveler_email}</div>
                        {b.traveler_phone && (
                          <div className="text-blue-300/60 text-[10px]">{b.traveler_phone}</div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-blue-100 text-xs">{b.item_label || b.booking_type || '—'}</td>
                      <td className="py-2 px-2 text-purple-200 text-xs font-mono">
                        {b.metadata?.flight_num || b.metadata?.flightNum || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-blue-300/80 font-bold">Live feed</div>
              <div className="text-lg font-bold flex items-center gap-2">
                <Plane className="w-4 h-4 text-blue-300" />
                Most recent flight snapshots
              </div>
            </div>
            <span className="text-xs text-blue-200/60">{snapshots.length} flights</span>
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-blue-300/60">
                  <th className="text-left font-semibold py-2 px-2">Updated</th>
                  <th className="text-left font-semibold py-2 px-2">Flight</th>
                  <th className="text-left font-semibold py-2 px-2">Status</th>
                  <th className="text-left font-semibold py-2 px-2">Gate</th>
                  <th className="text-left font-semibold py-2 px-2">Term</th>
                  <th className="text-left font-semibold py-2 px-2">Sched</th>
                  <th className="text-left font-semibold py-2 px-2">Est</th>
                  <th className="text-right font-semibold py-2 px-2">Delay</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-blue-300/50 text-xs">
                      No snapshots yet — they're written by the polling job.
                    </td>
                  </tr>
                )}
                {snapshots.map((s, i) => (
                  <tr
                    key={`${s.flight_num}-${s.flight_date}-${i}`}
                    onClick={() => openLatestRunForFlight(s.flight_num)}
                    className="border-t border-white/5 hover:bg-white/5 cursor-pointer transition"
                    title="Click to inspect this flight in the latest polling run"
                  >
                    <td className="py-2 px-2 text-blue-200 whitespace-nowrap">
                      {new Date(s.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2 px-2 text-white font-mono text-xs">
                      {s.flight_num}
                      <span className="text-blue-300/40 ml-1">{s.flight_date}</span>
                    </td>
                    <td className="py-2 px-2">
                      <StatusBadge status={s.flight_status} />
                    </td>
                    <td className="py-2 px-2 text-blue-100 font-mono text-xs">{s.gate || '—'}</td>
                    <td className="py-2 px-2 text-blue-100 font-mono text-xs">{s.terminal || '—'}</td>
                    <td className="py-2 px-2 text-blue-300/80 text-xs">
                      {s.scheduled_departure ? String(s.scheduled_departure).slice(11, 16) : '—'}
                    </td>
                    <td className="py-2 px-2 text-blue-100 text-xs">
                      {s.estimated_departure ? String(s.estimated_departure).slice(11, 16) : '—'}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {typeof s.delay_minutes === 'number' && s.delay_minutes > 0 ? (
                        <span className="text-rose-300 text-xs font-semibold">+{s.delay_minutes}m</span>
                      ) : (
                        <span className="text-emerald-300/70 text-xs">on time</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 text-center text-blue-300/40 text-[11px]">
          Ops console — gated by admin_users RLS. Auto-refreshes every 30 seconds.
        </div>
      </main>

      <RunDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        run={drawerRun}
        focusFlight={focusFlight}
      />
    </div>
  );
};

const accentMap: Record<string, string> = {
  purple: 'from-purple-600/20 to-purple-600/5 border-purple-500/30 text-purple-300',
  blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/30 text-blue-300',
  red: 'from-red-600/20 to-red-600/5 border-red-500/30 text-red-300',
  amber: 'from-amber-600/20 to-amber-600/5 border-amber-500/30 text-amber-300',
  emerald: 'from-emerald-600/20 to-emerald-600/5 border-emerald-500/30 text-emerald-300',
  rose: 'from-rose-600/20 to-rose-600/5 border-rose-500/30 text-rose-300'
};

const Kpi: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: keyof typeof accentMap;
}> = ({ label, value, icon, accent }) => (
  <div className={`rounded-xl bg-gradient-to-br ${accentMap[accent]} border backdrop-blur px-4 py-3`}>
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold opacity-80">
      {icon}
      {label}
    </div>
    <div className="mt-1 text-2xl sm:text-3xl font-black text-white">{value}</div>
  </div>
);

const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, className = '', children }) => (
  <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 ${className}`}>
    <div className="mb-3">
      <div className="text-[11px] uppercase tracking-widest text-blue-300/80 font-bold">{subtitle}</div>
      <div className="text-lg font-bold">{title}</div>
    </div>
    {children}
  </div>
);

const StatusBadge: React.FC<{ status: string | null }> = ({ status }) => {
  if (!status) return <span className="text-blue-300/40 text-xs">—</span>;
  const s = status.toLowerCase();
  let cls = 'bg-blue-500/15 text-blue-200 border-blue-500/30';
  if (s.includes('cancel')) cls = 'bg-rose-500/15 text-rose-200 border-rose-500/30';
  else if (s.includes('delay')) cls = 'bg-amber-500/15 text-amber-200 border-amber-500/30';
  else if (s.includes('active') || s.includes('en-route') || s.includes('en route')) cls = 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30';
  else if (s.includes('landed') || s.includes('arrived')) cls = 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30';
  else if (s.includes('scheduled')) cls = 'bg-blue-500/15 text-blue-200 border-blue-500/30';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-semibold ${cls}`}>
      {status}
    </span>
  );
};

export default Admin;
