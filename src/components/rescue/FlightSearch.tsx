import React, { useState } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { getDelayInsight } from '@/lib/api';
import type { DelayInsight } from './DelayInsightCard';
import { mergeDelayInsightResponse } from '@/lib/delayInsight';
import { ORIGINAL_FLIGHT } from '@/data/rescueData';

export interface LiveFlight {
  source: string;
  flightNumber: string;
  carrier: string;
  status: string;
  statusRaw: string;
  delayMinutes: number;
  reason: string | null;
  departure: {
    airport: string;
    city: string;
    gate: string | null;
    terminal: string | null;
    scheduled: string | null;
    estimated: string | null;
    actual: string | null;
  };
  arrival: {
    airport: string;
    city: string;
    gate: string | null;
    terminal: string | null;
    scheduled: string | null;
    estimated: string | null;
    actual: string | null;
  };
  aircraft: string | null;
  live: { altitude: number; speed: number; heading: number } | null;
  usedFallback: boolean;
  apiConfigured: boolean;
  delayInsight?: DelayInsight | null;
}

interface Props {
  onResult: (flight: LiveFlight) => void;
  compact?: boolean;
}

const FlightSearch: React.FC<Props> = ({ onResult, compact }) => {
  const [value, setValue] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [lastSearch, setLastSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeFlightInput = (raw: string) => {
    const compact = raw.trim().toUpperCase().replace(/[\s-]+/g, '');
    if (/^\d{2,5}$/.test(compact)) return `AA${compact}`;
    return compact;
  };

  const continueWithManualPlan = (flightNumber: string) => {
    const normalized = flightNumber.trim().toUpperCase().replace(/\s+/g, '');
    const manualFlight: LiveFlight = {
      source: 'manual',
      flightNumber: normalized || ORIGINAL_FLIGHT.flightNum.replace(/\s+/g, ''),
      carrier: 'Airline pending',
      status: 'MONITORING',
      statusRaw: 'manual',
      delayMinutes: 0,
      reason: 'Live flight lookup did not return a match. Continue with a manual rescue plan and confirm details with the airline.',
      departure: {
        airport: ORIGINAL_FLIGHT.from,
        city: "Chicago O'Hare",
        gate: ORIGINAL_FLIGHT.gate,
        terminal: null,
        scheduled: null,
        estimated: null,
        actual: null,
      },
      arrival: {
        airport: ORIGINAL_FLIGHT.to,
        city: ORIGINAL_FLIGHT.toCity,
        gate: null,
        terminal: null,
        scheduled: null,
        estimated: null,
        actual: null,
      },
      aircraft: null,
      live: null,
      usedFallback: true,
      apiConfigured: true,
      delayInsight: null,
    };
    onResult(manualFlight);
    setError(null);
    setValue('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    const flightNumber = normalizeFlightInput(value);
    setLastSearch(flightNumber);
    setLoading(true);
    setError(null);
    try {
      const data = await getDelayInsight({ flightNumber, date: searchDate || undefined });
      onResult(mergeDelayInsightResponse(data));
      setValue('');
    } catch (err: unknown) {
      const message = String(err instanceof Error ? err.message : '');
      const normalizedMessage = message.toLowerCase().replace(/_/g, ' ');
      const isFetchFailure =
        normalizedMessage.includes('failed to fetch') ||
        normalizedMessage.includes('networkerror') ||
        normalizedMessage.includes('network request failed') ||
        normalizedMessage.includes('load failed');
      if (normalizedMessage.includes('invalid flight code')) {
        setError('Use airline + number (example: AA3828), or just digits (example: 3828).');
        return;
      }

      continueWithManualPlan(flightNumber);
      if (normalizedMessage.includes('flight not found')) {
        setError('No live match found. Loaded a manual rescue plan so you can keep moving.');
      } else if (normalizedMessage.includes('could not reach backend') || isFetchFailure) {
        setError('Live tracking backend is unreachable. Continue with a manual rescue plan while backend connection is restored.');
      } else {
        setError('Live lookup is temporarily unavailable. Loaded a manual rescue plan so you can keep moving.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? 'w-full' : 'w-full max-w-md'}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200/70 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={compact ? 'Flight # e.g. AA2487' : 'Enter flight number or PNR (e.g. AA2487)'}
          className="w-full pl-9 pr-24 py-2 rounded-full bg-white/10 border border-white/20 text-white placeholder-blue-200/50 text-sm focus:outline-none focus:bg-white/15 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/30 transition"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50 transition flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Track'}
        </button>
      </div>
      {error && (
        <div className="mt-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-100 text-xs">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
          {(error.startsWith('No live match') || error.startsWith('Live tracking backend is unreachable')) && (
            <button
              type="button"
              onClick={() => continueWithManualPlan(lastSearch || value)}
              className="mt-2 rounded-full bg-white/15 px-3 py-1.5 font-semibold text-white hover:bg-white/25 transition"
            >
              Continue with manual rescue plan
            </button>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-blue-100/80">
        <label htmlFor="flight-date" className="whitespace-nowrap">Departure date (optional)</label>
        <input
          id="flight-date"
          type="date"
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-white focus:border-red-400/60 focus:outline-none"
          max="2099-12-31"
        />
      </div>
    </form>
  );
};

export default FlightSearch;
