import React from 'react';
import { AlertTriangle, Clock, MapPin, Plane, CheckCircle, Radio, Info, Sparkles, UserCheck } from 'lucide-react';
import { ORIGINAL_FLIGHT, HERO_IMG } from '@/data/rescueData';
import { LiveFlight } from './FlightSearch';
import { useTraveler } from '@/contexts/TravelerContext';
import DelayInsightCard from './DelayInsightCard';
import DelaySignalPrompt from './DelaySignalPrompt';

interface HeroProps {
  onStartRescue: () => void;
  liveFlight: LiveFlight | null;
  onFlightUpdated?: (flight: LiveFlight) => void;
  onPersonalize?: () => void;
  onViewPricing?: () => void;
}


const formatTime = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const Hero: React.FC<HeroProps> = ({ onStartRescue, liveFlight, onFlightUpdated, onPersonalize, onViewPricing }) => {
  const { profile, hasProfile } = useTraveler();
  const bp = profile.boardingPass;
  const firstName = bp?.passengerName?.split('/')?.pop()?.split(' ')?.[0] || '';

  const isLive = !!liveFlight;
  const isDisrupted = liveFlight
    ? ['CANCELED', 'DIVERTED', 'DISRUPTED', 'Delayed'].includes(liveFlight.status)
    : true;

  // Pick display values from live flight or fallback to demo
  const flightNum = liveFlight?.flightNumber || ORIGINAL_FLIGHT.flightNum;
  const fromCode = liveFlight?.departure.airport || ORIGINAL_FLIGHT.from;
  const fromCity = liveFlight?.departure.city || 'Chicago O\'Hare';
  const toCode = liveFlight?.arrival.airport || ORIGINAL_FLIGHT.to;
  const toCity = liveFlight?.arrival.city || ORIGINAL_FLIGHT.toCity;
  const departTime = liveFlight ? formatTime(liveFlight.departure.scheduled) : ORIGINAL_FLIGHT.scheduled;
  const gate = liveFlight?.departure.gate || ORIGINAL_FLIGHT.gate;
  const status = liveFlight?.status || 'CANCELED';
  const reason = liveFlight?.reason || ORIGINAL_FLIGHT.reason;
  const carrier = liveFlight?.carrier || 'American Airlines';
  const delayMin = liveFlight?.delayMinutes || 0;

  const statusColor = isDisrupted ? 'red' : 'emerald';

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={HERO_IMG} alt="Luxury terminal" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1d3a]/95 via-[#0a1d3a]/80 to-[#0a1d3a]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1d3a] via-transparent to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Demo mode banner */}
        {liveFlight?.usedFallback && (
          <div className="mb-6 inline-flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-100 text-xs max-w-2xl backdrop-blur">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              <span className="font-semibold">Demo mode:</span> Showing simulated data because no AviationStack API key is configured. Add{' '}
              <code className="px-1 py-0.5 bg-black/20 rounded">AVIATIONSTACK_API_KEY</code> to enable real-time flight status.
            </p>
          </div>
        )}

        {/* Personalized greeting / setup CTA */}
        {hasProfile && firstName ? (
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-100 text-xs backdrop-blur">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Welcome back, <span className="font-semibold capitalize">{firstName.toLowerCase()}</span> — monitoring {bp?.flightNumber || 'your trip'}{profile.locationGranted ? ' · location enabled' : ''}</span>
          </div>
        ) : !hasProfile && onPersonalize ? (
          <button
            onClick={onPersonalize}
            className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-600/30 to-red-500/20 border border-red-400/40 text-white text-xs backdrop-blur hover:bg-red-600/40 transition group"
          >
            <Sparkles className="w-3.5 h-3.5 text-red-300 group-hover:text-red-200" />
            <span>Personalize: scan boarding pass · share location</span>
            <span className="text-red-300">→</span>
          </button>
        ) : null}


        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-${statusColor}-600/20 border border-${statusColor}-500/40 backdrop-blur mb-5`}>
              {isLive ? (
                <Radio className={`w-3.5 h-3.5 text-${statusColor}-300 animate-pulse`} />
              ) : (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
              <span className={`text-${statusColor}-200 text-xs font-semibold uppercase tracking-wider`}>
                {isLive ? (isDisrupted ? 'Live Disruption Detected' : 'Live Status — Tracking') : 'Disruption Detected'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.05]">
              {isDisrupted ? (
                <>
                  Don't panic.<br />
                  <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                    You're rescued.
                  </span>
                </>
              ) : (
                <>
                  You're on track.<br />
                  <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                    Smooth flying.
                  </span>
                </>
              )}
            </h1>

            <p className="mt-5 text-lg text-blue-100/90 max-w-xl leading-relaxed">
              {isDisrupted ? (
                <>
                  Your flight {flightNum} from {fromCode} to {toCode} is {status.toLowerCase()}.
                  We've already lined up your recovery — rebook, find a hotel, and access a lounge in seconds.
                </>
              ) : (
                <>
                  {flightNum} ({carrier}) is {status.toLowerCase()}. Departs {departTime} from gate {gate}. We'll alert you the moment anything changes.
                </>
              )}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={onStartRescue}
                className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold shadow-2xl shadow-red-900/40 hover:shadow-red-700/50 hover:scale-[1.02] transition-all"
              >
                <Plane className="w-5 h-5" />
                {isDisrupted ? 'Start Rescue Plan' : 'Pre-Plan Rescue'}
              </button>
              <button
                onClick={onViewPricing}
                className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white font-medium hover:bg-white/15 transition"
              >
                Concierge Coming Soon
              </button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              <Stat label="Avg. Rebook" value="< 90s" />
              <Stat label="Travelers Saved" value="2.4M+" />
              <Stat label="Partner Lounges" value="780" />
            </div>
          </div>

          {/* Flight Status Card */}
          <div className="relative">
            <div className={`absolute -inset-4 bg-gradient-to-br ${isDisrupted ? 'from-red-600/20 to-blue-600/20' : 'from-emerald-600/20 to-blue-600/20'} blur-3xl`} />
            <div className="relative bg-white/[0.06] backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 ${isDisrupted ? 'text-red-400' : 'text-emerald-400'} text-sm font-semibold uppercase tracking-wider`}>
                  {isDisrupted ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  {isLive ? `Live: ${status}` : 'Original Itinerary — Canceled'}
                </div>
                {isLive && (
                  <span className="text-[10px] text-blue-200/60 uppercase tracking-wider">
                    {liveFlight.usedFallback ? 'Simulated' : 'Real-time'}
                  </span>
                )}
              </div>

              <div className="mt-1 text-blue-100 text-sm font-medium">
                {flightNum} • {carrier}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-blue-200/70 text-xs uppercase tracking-wider">Departure</p>
                  <p className="text-white text-4xl font-bold">{fromCode}</p>
                  <p className="text-blue-100 text-sm mt-1 truncate max-w-[140px]">{fromCity}</p>
                </div>
                <div className="flex-1 px-4">
                  <div className={`relative h-px bg-gradient-to-r ${isDisrupted ? 'from-red-500/0 via-red-500 to-red-500/0' : 'from-emerald-500/0 via-emerald-500 to-emerald-500/0'}`}>
                    <Plane className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 ${isDisrupted ? 'text-red-400' : 'text-emerald-400'} rotate-90`} />
                  </div>
                  <p className={`text-center ${isDisrupted ? 'text-red-300' : 'text-emerald-300'} text-xs mt-2 font-medium`}>{status.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-200/70 text-xs uppercase tracking-wider">Arrival</p>
                  <p className="text-white text-4xl font-bold">{toCode}</p>
                  <p className="text-blue-100 text-sm mt-1 truncate max-w-[140px]">{toCity}</p>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-3 gap-3 text-sm">
                <InfoRow icon={<Clock className="w-4 h-4" />} label="Scheduled" value={departTime} />
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Gate" value={gate || '—'} />
                <InfoRow
                  icon={<Plane className="w-4 h-4" />}
                  label={delayMin > 0 ? 'Delay' : 'Status'}
                  value={delayMin > 0 ? `+${delayMin} min` : status}
                />
              </div>

              {reason && (
                <div className={`mt-5 p-3 ${isDisrupted ? 'bg-red-950/40 border-red-500/30 text-red-100' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100'} border rounded-lg text-sm`}>
                  <span className="font-semibold">{isDisrupted ? 'Reason' : 'Note'}:</span> {reason}
                </div>
              )}

              {liveFlight?.delayInsight && (
                <>
                  <DelayInsightCard insight={liveFlight.delayInsight} />
                  {onFlightUpdated && <DelaySignalPrompt liveFlight={liveFlight} onFlightUpdated={onFlightUpdated} />}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="border-l-2 border-red-500 pl-3">
    <p className="text-white text-xl font-bold">{value}</p>
    <p className="text-blue-200/70 text-xs">{label}</p>
  </div>
);

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div>
    <div className="flex items-center gap-1.5 text-blue-200/60 text-[10px] uppercase tracking-wider">
      {icon}
      {label}
    </div>
    <p className="text-white font-semibold text-sm mt-0.5 truncate">{value}</p>
  </div>
);

export default Hero;
