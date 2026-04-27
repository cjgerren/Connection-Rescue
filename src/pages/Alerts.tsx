import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, RefreshCw, Bell, LogOut, Plane, AlertTriangle, MessageSquare, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AlertTimeline, { AlertEvent } from '@/components/alerts/AlertTimeline';

const STORAGE_KEY = 'rescue.alerts.email';

interface BookingRow {
  id: string;
  traveler_email: string;
  item_label: string | null;
  last_alert_sent_at: string | null;
  metadata: any;
}

interface PollingRunRow {
  id: string;
  ran_at: string;
  alerts_sent: number;
  ok: boolean;
  summary: any;
}

const Alerts: React.FC = () => {
  const [email, setEmail] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(STORAGE_KEY) || '';
  });
  const [pendingEmail, setPendingEmail] = useState('');
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [runs, setRuns] = useState<PollingRunRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const loadData = useCallback(async (forEmail: string) => {
    if (!forEmail) return;
    setLoading(true);
    setError(null);
    try {
      const { data: bookingRows, error: bErr } = await supabase
        .from('bookings')
        .select('id, traveler_email, item_label, last_alert_sent_at, metadata')
        .eq('traveler_email', forEmail.toLowerCase().trim());
      if (bErr) throw bErr;

      const { data: runRows, error: rErr } = await supabase
        .from('flight_polling_runs')
        .select('id, ran_at, alerts_sent, ok, summary')
        .gt('alerts_sent', 0)
        .order('ran_at', { ascending: false })
        .limit(200);
      if (rErr) throw rErr;

      setBookings(bookingRows || []);
      setRuns(runRows || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (email) loadData(email);
  }, [email, refreshTick, loadData]);

  const events = useMemo<AlertEvent[]>(() => {
    if (!email || !bookings.length || !runs.length) return [];
    const myBookingIds = new Set(bookings.map((b) => b.id));
    const bookingMap = new Map(bookings.map((b) => [b.id, b]));
    const out: AlertEvent[] = [];

    for (const run of runs) {
      const summary = run.summary;
      if (!Array.isArray(summary)) continue;
      for (const entry of summary) {
        if (!entry?.changed || !Array.isArray(entry?.results)) continue;
        const flightKey: string = entry.flight || '';
        const [flightNum, flightDate] = flightKey.split('|');
        const changes: string[] = Array.isArray(entry.changes) ? entry.changes : [];
        for (const r of entry.results) {
          if (!r?.bookingId || !myBookingIds.has(r.bookingId)) continue;
          const b = bookingMap.get(r.bookingId);
          const sms = r.sms || {};
          const emailRes = r.email || {};
          out.push({
            ranAt: run.ran_at,
            flightKey,
            flightNum: flightNum || 'Unknown',
            flightDate: flightDate || '',
            changes,
            bookingId: r.bookingId,
            bookingCode: String(r.bookingId).slice(0, 8).toUpperCase(),
            itemLabel: b?.item_label || undefined,
            sms: {
              ok: !!(sms.ok || sms?.data?.ok || sms?.sid),
              sid: sms.sid || sms?.data?.sid,
              error: sms.error || sms?.data?.error,
            },
            email: {
              ok: !!(emailRes.ok || emailRes.id),
              id: emailRes.id,
              error: emailRes.error,
            },
          });
        }
      }
    }
    // newest first
    out.sort((a, b) => new Date(b.ranAt).getTime() - new Date(a.ranAt).getTime());
    return out;
  }, [bookings, runs, email]);

  const stats = useMemo(() => {
    const totalAlerts = events.length;
    const gateChanges = events.filter((e) => e.changes.some((c) => c.startsWith('gate'))).length;
    const terminalChanges = events.filter((e) => e.changes.some((c) => c.startsWith('terminal'))).length;
    const departureChanges = events.filter((e) => e.changes.some((c) => c.startsWith('departure'))).length;
    const smsDelivered = events.filter((e) => e.sms.ok).length;
    const emailDelivered = events.filter((e) => e.email.ok).length;
    const lastAlert =
      bookings
        .map((b) => b.last_alert_sent_at)
        .filter(Boolean)
        .sort()
        .pop() || null;
    return { totalAlerts, gateChanges, terminalChanges, departureChanges, smsDelivered, emailDelivered, lastAlert };
  }, [events, bookings]);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pendingEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, trimmed);
    setEmail(trimmed);
    setPendingEmail('');
  };

  const handleSignOut = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setEmail('');
    setBookings([]);
    setRuns([]);
  };

  // === Sign-in gate ===
  if (!email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1d3a] via-[#0d2347] to-[#0a1d3a] text-white">
        <div className="max-w-md mx-auto px-4 py-16">
          <Link to="/" className="inline-flex items-center gap-2 text-blue-200/70 hover:text-white text-sm mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to ConnectionRescue
          </Link>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-600/40">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Alert Timeline</h1>
                <p className="text-blue-200/60 text-xs">Every gate, terminal, and time change we ever sent you</p>
              </div>
            </div>

            <p className="text-blue-100 text-sm mt-6 mb-5">
              Enter the email address you used at booking — we'll pull every alert ever dispatched for your flights.
            </p>

            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-blue-300/70 font-semibold">Booking email</label>
                <input
                  type="email"
                  value={pendingEmail}
                  onChange={(e) => setPendingEmail(e.target.value)}
                  placeholder="you@airline.com"
                  autoFocus
                  className="mt-1 w-full bg-black/40 border border-white/10 focus:border-red-500 focus:ring-2 focus:ring-red-500/40 rounded-lg px-4 py-3 text-white placeholder:text-blue-300/40 outline-none transition"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold py-3 rounded-lg shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                View My Alerts
              </button>
            </form>

            <p className="text-blue-300/40 text-[11px] text-center mt-5">
              We'll only show alerts associated with bookings under this email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // === Authenticated view ===
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1d3a] via-[#0b1120] to-[#0a1d3a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a1d3a]/90 backdrop-blur border-b border-red-600/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-blue-200/80 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> Rescue Center
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRefreshTick((x) => x + 1)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/10 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-blue-200 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-red-400 text-xs uppercase tracking-widest font-bold">
            <Bell className="w-3.5 h-3.5" /> Real-time alert history
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">
            Every change to <span className="text-red-500">your flights</span>, on one timeline
          </h1>
          <p className="text-blue-200/70 text-sm mt-2">
            Signed in as <span className="text-white font-semibold">{email}</span> · {bookings.length} booking{bookings.length === 1 ? '' : 's'} monitored
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard label="Total alerts" value={stats.totalAlerts} icon={<Bell className="w-4 h-4" />} accent="red" />
          <StatCard label="Gate changes" value={stats.gateChanges} icon={<Plane className="w-4 h-4" />} accent="red" />
          <StatCard label="Terminal changes" value={stats.terminalChanges} icon={<Plane className="w-4 h-4" />} accent="amber" />
          <StatCard label="Time changes" value={stats.departureChanges} icon={<Plane className="w-4 h-4" />} accent="blue" />
        </div>

        {/* Delivery summary */}
        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-300" />
              <span className="text-sm text-blue-100">SMS delivered</span>
            </div>
            <span className="text-white font-bold">
              {stats.smsDelivered}
              <span className="text-blue-300/50 font-normal text-xs"> / {stats.totalAlerts}</span>
            </span>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-300" />
              <span className="text-sm text-blue-100">Email delivered</span>
            </div>
            <span className="text-white font-bold">
              {stats.emailDelivered}
              <span className="text-blue-300/50 font-normal text-xs"> / {stats.totalAlerts}</span>
            </span>
          </div>
        </div>

        {/* Error / loading */}
        {error && (
          <div className="mb-6 flex items-start gap-2 text-rose-200 bg-rose-500/10 border border-rose-500/40 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Couldn't load alerts</div>
              <div className="text-rose-300/80 text-xs mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {loading && !events.length && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 h-28 animate-pulse" />
            ))}
          </div>
        )}

        {/* Timeline */}
        {!loading && <AlertTimeline events={events} />}

        {/* Footer note */}
        <div className="mt-12 text-center text-blue-300/40 text-[11px]">
          Alerts are dispatched the instant our poller detects a change — no refresh required.
        </div>
      </main>
    </div>
  );
};

const accentMap: Record<string, string> = {
  red: 'from-red-600/20 to-red-600/5 border-red-500/30 text-red-300',
  amber: 'from-amber-600/20 to-amber-600/5 border-amber-500/30 text-amber-300',
  blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/30 text-blue-300',
};

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; accent: keyof typeof accentMap }> = ({
  label,
  value,
  icon,
  accent,
}) => (
  <div className={`rounded-xl bg-gradient-to-br ${accentMap[accent]} border backdrop-blur px-4 py-3`}>
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold opacity-80">
      {icon}
      {label}
    </div>
    <div className="mt-1 text-3xl font-black text-white">{value}</div>
  </div>
);

export default Alerts;
