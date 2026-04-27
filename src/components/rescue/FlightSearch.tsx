import React, { useState } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { getFlightStatus } from '@/lib/api';

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
}

interface Props {
  onResult: (flight: LiveFlight) => void;
  compact?: boolean;
}

const FlightSearch: React.FC<Props> = ({ onResult, compact }) => {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Calls the real Node backend at /api/flights/status (or falls back
      // to the existing Supabase edge function if VITE_BACKEND_URL isn't
      // set). API keys never appear in the React bundle.
      const data = await getFlightStatus(value.trim());
      onResult(data as LiveFlight);
      setValue('');
    } catch (err: any) {
      setError(err?.message || 'Could not fetch flight status');
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
        <div className="mt-2 flex items-center gap-1.5 text-red-300 text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </form>
  );
};

export default FlightSearch;
