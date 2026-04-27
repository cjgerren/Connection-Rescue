import React, { useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import {
  Activity,
  Plane,
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Mail,
  MessageSquare,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: PollingRun | null;
  /** Optional flight number to highlight / focus when opened from a snapshot row */
  focusFlight?: string | null;
}

type ReplayState = {
  loading: boolean;
  ok?: boolean;
  message?: string;
};

const RunDetailDrawer: React.FC<Props> = ({ open, onOpenChange, run, focusFlight }) => {
  const [filter, setFilter] = useState('');
  const [replay, setReplay] = useState<Record<string, ReplayState>>({});

  // Keep filter in sync with focusFlight when drawer opens
  React.useEffect(() => {
    if (open) {
      setFilter(focusFlight || '');
      setReplay({});
    }
  }, [open, focusFlight]);

  const flights: any[] = useMemo(() => {
    if (!run) return [];
    const summary = run.summary;
    if (Array.isArray(summary)) return summary;
    if (Array.isArray(summary?.flights)) return summary.flights;
    return [];
  }, [run]);

  const visibleFlights = useMemo(() => {
    if (!filter.trim()) return flights;
    const q = filter.trim().toLowerCase();
    return flights.filter((f) => {
      const fn = String(f?.flight_num || f?.flightNum || '').toLowerCase();
      return fn.includes(q);
    });
  }, [flights, filter]);

  async function handleReplay(bookingId: string, flightNum: string, change: any) {
    if (!bookingId) return;
    setReplay((p) => ({ ...p, [bookingId + change?.field]: { loading: true } }));
    try {
      const payload: any = {
        type: 'gate_change',
        bookingId,
        flightNum,
        oldGate: change?.from ?? change?.old ?? null,
        newGate: change?.to ?? change?.new ?? null,
        departureTime: change?.departure_time ?? null
      };
      const { data, error } = await supabase.functions.invoke('send-booking-sms', { body: payload });
      if (error) throw error;
      setReplay((p) => ({
        ...p,
        [bookingId + change?.field]: {
          loading: false,
          ok: !!data?.ok,
          message: data?.ok ? `SMS resent · sid ${String(data.sid ?? '').slice(-8)}` : data?.error || 'Send failed'
        }
      }));
    } catch (e: any) {
      setReplay((p) => ({
        ...p,
        [bookingId + change?.field]: { loading: false, ok: false, message: e?.message || 'Replay failed' }
      }));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl bg-[#0a1024] border-l border-purple-600/30 text-white overflow-y-auto"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 text-white">
            <Activity className="w-4 h-4 text-purple-300" />
            Polling run detail
          </SheetTitle>
          <SheetDescription className="text-blue-200/60 font-mono text-[11px]">
            {run ? (
              <>
                {new Date(run.ran_at).toLocaleString()} · run id {run.id.slice(0, 8)}
              </>
            ) : (
              'No run selected'
            )}
          </SheetDescription>
        </SheetHeader>

        {!run && (
          <div className="py-12 text-center text-blue-300/50 text-sm">
            Click a chart bar or a flight snapshot row to inspect it here.
          </div>
        )}

        {run && (
          <div className="mt-4 space-y-5">
            {/* Run summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MiniStat icon={<Plane className="w-3.5 h-3.5" />} label="Flights" value={run.flights_checked} accent="blue" />
              <MiniStat icon={<Bell className="w-3.5 h-3.5" />} label="Alerts" value={run.alerts_sent} accent="rose" />
              <MiniStat icon={<Clock className="w-3.5 h-3.5" />} label="Duration" value={`${run.duration_ms}ms`} accent="amber" />
              <MiniStat
                icon={run.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                label="Status"
                value={run.ok ? 'OK' : 'FAIL'}
                accent={run.ok ? 'emerald' : 'rose'}
              />
            </div>

            {run.error && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
                <div className="font-semibold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Run error</div>
                <div className="text-rose-300/90 font-mono mt-1">{run.error}</div>
              </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-300/60" />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter by flight number…"
                  className="w-full bg-black/40 border border-white/10 focus:border-purple-500 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-blue-300/40 outline-none"
                />
              </div>
              <span className="text-[11px] text-blue-300/60 whitespace-nowrap">
                {visibleFlights.length}/{flights.length}
              </span>
            </div>

            {/* Per-flight summary */}
            <div className="space-y-3">
              {visibleFlights.length === 0 && (
                <div className="text-center text-xs text-blue-300/50 py-8 border border-dashed border-white/10 rounded-lg">
                  {flights.length === 0 ? 'No flight detail in summary' : 'No flights match this filter'}
                </div>
              )}
              {visibleFlights.map((f, idx) => (
                <FlightCard
                  key={(f.flight_num || f.flightNum || idx) + '-' + idx}
                  flight={f}
                  replay={replay}
                  onReplay={handleReplay}
                  highlight={focusFlight && (String(f.flight_num || f.flightNum || '').toUpperCase() === focusFlight.toUpperCase())}
                />
              ))}
            </div>

            {/* Raw JSON */}
            <details className="rounded-lg border border-white/10 bg-black/40">
              <summary className="px-3 py-2 cursor-pointer text-[11px] uppercase tracking-widest text-blue-300/70 font-bold hover:text-white">
                Raw summary jsonb
              </summary>
              <pre className="px-3 pb-3 text-[10px] text-blue-100/80 overflow-x-auto font-mono">
                {JSON.stringify(run.summary, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

// ===== Sub-components =======================================================

const MiniStat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: 'blue' | 'rose' | 'amber' | 'emerald';
}> = ({ icon, label, value, accent }) => {
  const accents: Record<string, string> = {
    blue: 'border-blue-500/30 text-blue-300 bg-blue-500/10',
    rose: 'border-rose-500/30 text-rose-300 bg-rose-500/10',
    amber: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
    emerald: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
  };
  return (
    <div className={`rounded-lg border ${accents[accent]} px-2.5 py-2`}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider opacity-80 font-bold">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-base font-black text-white">{value}</div>
    </div>
  );
};

const FlightCard: React.FC<{
  flight: any;
  highlight?: boolean | null;
  replay: Record<string, ReplayState>;
  onReplay: (bookingId: string, flightNum: string, change: any) => void;
}> = ({ flight, highlight, replay, onReplay }) => {
  const fn = flight?.flight_num || flight?.flightNum || '???';
  const changes: any[] = Array.isArray(flight?.changes)
    ? flight.changes.map((c: any) => (typeof c === 'string' ? { field: 'change', text: c } : c))
    : [];
  const results: any[] = Array.isArray(flight?.results)
    ? flight.results
    : Array.isArray(flight?.alerts)
      ? flight.alerts
      : [];

  return (
    <div className={`rounded-xl border ${highlight ? 'border-purple-500/60 bg-purple-500/5 shadow-lg shadow-purple-500/10' : 'border-white/10 bg-white/5'} p-3`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Plane className="w-3.5 h-3.5 text-blue-300" />
          <span className="font-mono font-bold text-white">{fn}</span>
          {flight?.flight_date && (
            <span className="text-blue-300/50 text-[10px]">{flight.flight_date}</span>
          )}
          {flight?.status && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-blue-100">
              {flight.status}
            </span>
          )}
        </div>
        {flight?.error && (
          <span className="text-[10px] text-rose-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />error
          </span>
        )}
      </div>

      {/* Changes */}
      {changes.length > 0 && (
        <div className="mt-2 space-y-1">
          {changes.map((c, i) => (
            <div key={i} className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1 font-mono">
              {c.text || `${c.field}: ${c.from ?? c.old ?? '—'} → ${c.to ?? c.new ?? '—'}`}
            </div>
          ))}
        </div>
      )}

      {/* Per-booking results (alert sends) */}
      {results.length > 0 && (
        <div className="mt-2 space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest text-blue-300/60 font-bold">Alerts dispatched</div>
          {results.map((r, i) => {
            const bid = r.bookingId || r.booking_id || '';
            const sms = r.sms || {};
            const email = r.email || {};
            const key = bid + 'gate';
            const rep = replay[key];
            return (
              <div key={i} className="rounded-lg border border-white/10 bg-black/30 p-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="font-mono text-blue-100">
                    booking <span className="text-purple-300">{String(bid).slice(0, 8)}</span>
                    {r.email_to && <span className="text-blue-300/60 ml-2">{r.email_to}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <ChannelBadge icon={<MessageSquare className="w-3 h-3" />} label="SMS" ok={!!sms.ok} info={sms.sid || sms.error} />
                    <ChannelBadge icon={<Mail className="w-3 h-3" />} label="Email" ok={!!email.ok} info={email.id || email.error} />
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onReplay(bid, fn, { field: 'gate', from: r.oldGate, to: r.newGate, departure_time: r.departureTime })}
                    disabled={!bid || rep?.loading}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-100 disabled:opacity-40 transition"
                  >
                    {rep?.loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Replay alert
                  </button>
                  {rep?.message && (
                    <span className={`text-[10px] ${rep.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {rep.ok ? <CheckCircle2 className="inline w-3 h-3 mr-0.5" /> : <XCircle className="inline w-3 h-3 mr-0.5" />}
                      {rep.message}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {changes.length === 0 && results.length === 0 && (
        <div className="text-[11px] text-blue-300/50 mt-1.5">No changes detected; no alerts fired.</div>
      )}
    </div>
  );
};

const ChannelBadge: React.FC<{ icon: React.ReactNode; label: string; ok: boolean; info?: string }> = ({ icon, label, ok, info }) => (
  <span
    title={info || (ok ? 'Delivered' : 'Not sent')}
    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${
      ok ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200/70'
    }`}
  >
    {icon}
    {label}
    {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
  </span>
);

export default RunDetailDrawer;
