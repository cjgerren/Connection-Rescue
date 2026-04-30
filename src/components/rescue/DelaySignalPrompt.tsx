import React, { useState } from 'react';
import { Loader2, MessageSquarePlus, Send } from 'lucide-react';
import { submitDelayReport } from '@/lib/api';
import type { LiveFlight } from './FlightSearch';
import { mergeDelayInsightResponse } from '@/lib/delayInsight';

interface Props {
  liveFlight: LiveFlight;
  onFlightUpdated: (flight: LiveFlight) => void;
}

type FlagKey =
  | 'boarded'
  | 'returned_to_gate'
  | 'maintenance_mentioned'
  | 'weather_mentioned'
  | 'crew_mentioned'
  | 'paperwork_mentioned';

const quickFlags: Array<{ key: FlagKey; label: string }> = [
  { key: 'boarded', label: 'Already boarded' },
  { key: 'returned_to_gate', label: 'Returned to gate' },
  { key: 'maintenance_mentioned', label: 'Maintenance mentioned' },
  { key: 'weather_mentioned', label: 'Weather mentioned' },
  { key: 'crew_mentioned', label: 'Crew issue mentioned' },
  { key: 'paperwork_mentioned', label: 'Paperwork mentioned' },
];

const DelaySignalPrompt: React.FC<Props> = ({ liveFlight, onFlightUpdated }) => {
  const [notes, setNotes] = useState('');
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>({
    boarded: false,
    returned_to_gate: false,
    maintenance_mentioned: false,
    weather_mentioned: false,
    crew_mentioned: false,
    paperwork_mentioned: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const flightKey = liveFlight.delayInsight?.flightKey;
  const reportType = notes.trim() ? 'traveler_note' : 'traveler_flag_update';

  const toggleFlag = (key: FlagKey) => {
    setFlags((current) => ({ ...current, [key]: !current[key] }));
    setSuccess(null);
    setError(null);
  };

  const hasAnyFlag = Object.values(flags).some(Boolean);
  const canSubmit = !!flightKey && !loading && (notes.trim().length > 0 || hasAnyFlag);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !flightKey) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await submitDelayReport({
        flightKey,
        flightNumber: liveFlight.flightNumber,
        reportType,
        freeText: notes.trim() || undefined,
        structuredFlags: flags,
        reportedAt: new Date().toISOString(),
      });

      if (response?.delayInsight) {
        onFlightUpdated(mergeDelayInsightResponse(response.delayInsight));
      }

      setNotes('');
      setFlags({
        boarded: false,
        returned_to_gate: false,
        maintenance_mentioned: false,
        weather_mentioned: false,
        crew_mentioned: false,
        paperwork_mentioned: false,
      });
      setSuccess('Thanks. Delay insight updated with your report.');
    } catch (err: any) {
      setError(err?.message || 'Could not submit your update');
    } finally {
      setLoading(false);
    }
  };

  if (!flightKey) return null;

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/70">
        <MessageSquarePlus className="w-3.5 h-3.5 text-red-300" />
        Help us refine this delay
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {quickFlags.map((flag) => (
          <button
            key={flag.key}
            type="button"
            onClick={() => toggleFlag(flag.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              flags[flag.key]
                ? 'border-red-400/50 bg-red-500/20 text-white'
                : 'border-white/10 bg-white/5 text-blue-100/75 hover:bg-white/10'
            }`}
          >
            {flag.label}
          </button>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSuccess(null);
          setError(null);
        }}
        placeholder="What did the captain or gate agent say?"
        className="mt-3 min-h-[84px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-blue-200/35 outline-none transition focus:border-red-400/50 focus:bg-white/10"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-blue-100/55">
          Your update improves the likely cause and ETA range for this flight.
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit update
        </button>
      </div>

      {error && <div className="mt-3 text-xs text-rose-300">{error}</div>}
      {success && <div className="mt-3 text-xs text-emerald-300">{success}</div>}
    </form>
  );
};

export default DelaySignalPrompt;
