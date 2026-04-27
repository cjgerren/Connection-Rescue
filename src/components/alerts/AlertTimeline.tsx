import React from 'react';
import { Plane, DoorOpen, Building2, Clock, Mail, MessageSquare, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export interface AlertEvent {
  ranAt: string;
  flightKey: string; // "AA100|2026-04-26"
  flightNum: string;
  flightDate: string;
  changes: string[]; // raw human-readable diffs
  bookingId: string;
  bookingCode: string;
  itemLabel?: string;
  sms: { ok: boolean; sid?: string; error?: string };
  email: { ok: boolean; id?: string; error?: string };
}

interface ParsedDiff {
  field: 'gate' | 'terminal' | 'departure' | 'other';
  oldValue: string;
  newValue: string;
  raw: string;
}

function parseChange(raw: string): ParsedDiff {
  // formats:
  //  "gate A → B"
  //  "terminal A → B"
  //  "departure 2026-04-26T15:00:00Z → 2026-04-26T15:30:00Z"
  const arrow = raw.includes('→') ? '→' : '->';
  const [head, tail] = raw.split(arrow).map((s) => s.trim());
  const firstSpace = head.indexOf(' ');
  const field = (firstSpace > -1 ? head.slice(0, firstSpace) : head).toLowerCase();
  const oldValue = firstSpace > -1 ? head.slice(firstSpace + 1).trim() : '';
  const newValue = tail ?? '';
  const f = (['gate', 'terminal', 'departure'] as const).find((x) => x === field) ?? 'other';
  return { field: f, oldValue, newValue, raw };
}

function formatDeparture(v: string): string {
  if (!v || v === '—') return v || '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function FieldIcon({ field }: { field: ParsedDiff['field'] }) {
  const cls = 'w-4 h-4';
  if (field === 'gate') return <DoorOpen className={cls} />;
  if (field === 'terminal') return <Building2 className={cls} />;
  if (field === 'departure') return <Clock className={cls} />;
  return <AlertTriangle className={cls} />;
}

function fieldLabel(field: ParsedDiff['field']): string {
  if (field === 'gate') return 'Gate change';
  if (field === 'terminal') return 'Terminal change';
  if (field === 'departure') return 'Departure time change';
  return 'Status change';
}

function fieldColor(field: ParsedDiff['field']): { bg: string; border: string; ring: string; text: string } {
  if (field === 'gate') return { bg: 'bg-red-600/10', border: 'border-red-500/40', ring: 'bg-red-500', text: 'text-red-300' };
  if (field === 'terminal') return { bg: 'bg-amber-600/10', border: 'border-amber-500/40', ring: 'bg-amber-500', text: 'text-amber-300' };
  if (field === 'departure') return { bg: 'bg-blue-600/10', border: 'border-blue-500/40', ring: 'bg-blue-500', text: 'text-blue-300' };
  return { bg: 'bg-slate-600/10', border: 'border-slate-500/40', ring: 'bg-slate-400', text: 'text-slate-300' };
}

function ChannelBadge({
  label,
  icon: Icon,
  ok,
  detail,
}: {
  label: string;
  icon: typeof Mail;
  ok: boolean;
  detail?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
        ok ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
      }`}
      title={detail}
    >
      <Icon className="w-3 h-3" />
      {label}
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    </div>
  );
}

const AlertTimeline: React.FC<{ events: AlertEvent[] }> = ({ events }) => {
  if (!events.length) {
    return (
      <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/5">
        <Plane className="w-10 h-10 mx-auto text-blue-300/50 mb-3" />
        <p className="text-blue-100 text-sm">No alerts yet — your flights have been smooth.</p>
        <p className="text-blue-300/60 text-xs mt-1">
          We'll notify you here the moment a gate, terminal, or departure time changes.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 sm:pl-8">
      {/* timeline rail */}
      <div className="absolute left-2 sm:left-3 top-2 bottom-2 w-px bg-gradient-to-b from-red-500/60 via-white/10 to-transparent" />

      <ol className="space-y-5">
        {events.map((e, idx) => {
          const parsed = e.changes.map(parseChange);
          const primary = parsed[0]?.field ?? 'other';
          const c = fieldColor(primary);
          return (
            <li key={`${e.ranAt}-${e.bookingId}-${idx}`} className="relative">
              {/* dot */}
              <div className={`absolute -left-[18px] sm:-left-[22px] top-3 w-3 h-3 rounded-full ${c.ring} ring-4 ring-[#0b1120]`} />

              <div className={`rounded-2xl border ${c.border} ${c.bg} backdrop-blur p-4 sm:p-5 shadow-lg shadow-black/10`}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className={`flex items-center gap-2 text-xs uppercase tracking-wider font-bold ${c.text}`}>
                      <FieldIcon field={primary} />
                      {fieldLabel(primary)}
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-white text-lg font-bold">{e.flightNum}</span>
                      <span className="text-blue-200/60 text-xs">{e.flightDate}</span>
                    </div>
                    {e.itemLabel && (
                      <div className="text-blue-200/70 text-xs mt-0.5">{e.itemLabel}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-blue-100 text-xs font-medium">
                      {new Date(e.ranAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="text-blue-300/50 text-[10px] mt-0.5 font-mono">REF {e.bookingCode}</div>
                  </div>
                </div>

                {/* diffs */}
                <div className="space-y-2">
                  {parsed.map((p, i) => {
                    const dispOld = p.field === 'departure' ? formatDeparture(p.oldValue) : p.oldValue || '—';
                    const dispNew = p.field === 'departure' ? formatDeparture(p.newValue) : p.newValue || '—';
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 sm:gap-3 bg-black/30 border border-white/5 rounded-lg px-3 py-2"
                      >
                        <div className={`shrink-0 ${c.text}`}>
                          <FieldIcon field={p.field} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-widest text-blue-300/50 font-semibold">From</div>
                          <div className="text-rose-200 line-through text-sm font-mono truncate">{dispOld}</div>
                        </div>
                        <div className={`text-xl font-black ${c.text} px-1`}>→</div>
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-widest text-blue-300/50 font-semibold">To</div>
                          <div className="text-emerald-200 text-sm font-mono font-bold truncate">{dispNew}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* delivery channels */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/5">
                  <span className="text-[10px] uppercase tracking-widest text-blue-300/60 font-semibold mr-1">
                    Delivered via
                  </span>
                  <ChannelBadge
                    label="SMS"
                    icon={MessageSquare}
                    ok={e.sms.ok}
                    detail={e.sms.error || e.sms.sid}
                  />
                  <ChannelBadge
                    label="Email"
                    icon={Mail}
                    ok={e.email.ok}
                    detail={e.email.error || e.email.id}
                  />
                  {!e.sms.ok && !e.email.ok && (
                    <span className="text-rose-300 text-[11px] ml-1">
                      Delivery failed — please check your contact info.
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default AlertTimeline;
