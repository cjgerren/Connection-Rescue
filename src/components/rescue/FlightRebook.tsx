import React, { useEffect, useMemo, useState } from 'react';
import { Plane, Clock, Users, MapPin, Check, ArrowRight, Filter, Loader2, AlertCircle, Info } from 'lucide-react';
import { ALTERNATE_FLIGHTS, Flight, ORIGINAL_FLIGHT, PLANE_IMG } from '@/data/rescueData';
import { searchRescueOptions, type RescueOption, isBackendConfigured } from '@/lib/api';
import { useTraveler } from '@/contexts/TravelerContext';
import type { LiveFlight } from './FlightSearch';

interface Props {
  selectedFlight: Flight | null;
  setSelectedFlight: (f: Flight | null) => void;
  liveFlight: LiveFlight | null;
}

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

const describeDestination = (option: RescueOption) => {
  if (option.sameDest) return 'Original destination';
  if (option.nearbyDest) return 'Nearby airport';
  return 'Alternate arrival';
};

const mapOptionToFlight = (option: RescueOption, runId: string | null): Flight => ({
  id: option.id,
  flightNum: option.flightNum,
  carrier: option.carrier,
  from: option.from,
  to: option.to,
  toCity: option.toCity,
  depart: option.depart,
  arrive: option.arrive,
  duration: formatDuration(option.durationMin),
  seatsLeft: option.seatsLeft,
  price: option.price,
  status: option.tightConnection ? 'Tight connection' : option.connections > 0 ? `${option.connections} stop${option.connections > 1 ? 's' : ''}` : 'Nonstop',
  distanceFromDest: describeDestination(option),
  connections: option.connections,
  offerId: option.offerId,
  runId,
  totalAmount: option.price.toFixed(2),
  currency: option.currency,
  sameDest: option.sameDest,
  source: 'live',
});

const FlightRebook: React.FC<Props> = ({ selectedFlight, setSelectedFlight, liveFlight }) => {
  const { profile } = useTraveler();
  const [filter, setFilter] = useState<'all' | 'exact' | 'nearby'>('all');
  const [options, setOptions] = useState<Flight[]>(ALTERNATE_FLIGHTS);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingLiveResults, setUsingLiveResults] = useState(false);

  const departureDate =
    liveFlight?.departure.scheduled?.slice(0, 10) ||
    (profile.boardingPass?.departureDate && /^\d{4}-\d{2}-\d{2}$/.test(profile.boardingPass.departureDate)
      ? profile.boardingPass.departureDate
      : null);
  const searchOrigin = liveFlight?.departure.airport || profile.boardingPass?.from || null;
  const searchDestination = liveFlight?.arrival.airport || profile.boardingPass?.to || null;
  const destinationLabel = liveFlight?.arrival.city || profile.boardingPass?.toCity || ORIGINAL_FLIGHT.toCity;
  const destinationAirport = searchDestination || ORIGINAL_FLIGHT.to;
  const originalFlight = liveFlight?.flightNumber || profile.boardingPass?.flightNumber || undefined;
  const originalArrivalISO = liveFlight?.arrival.estimated || liveFlight?.arrival.scheduled || undefined;

  useEffect(() => {
    let cancelled = false;

    if (!isBackendConfigured || !searchOrigin || !searchDestination || !departureDate) {
      setOptions(ALTERNATE_FLIGHTS);
      setUsingLiveResults(false);
      setLoadError(null);
      return;
    }

    setLoading(true);
    setLoadError(null);

    searchRescueOptions({
      origin: searchOrigin,
      destination: searchDestination,
      departureDate,
      originalFlight,
      originalArrivalISO,
    })
      .then((data) => {
        if (cancelled) return;
        if (data.options.length === 0) {
          setOptions(ALTERNATE_FLIGHTS);
          setUsingLiveResults(false);
          setLoadError('No live rescue options were returned yet. Showing curated fallback flights for now.');
          return;
        }
        setOptions(data.options.map((option) => mapOptionToFlight(option, data.runId)));
        setUsingLiveResults(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setOptions(ALTERNATE_FLIGHTS);
        setUsingLiveResults(false);
        setLoadError((err as Error).message || 'Could not load live rescue options.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [departureDate, originalArrivalISO, originalFlight, searchDestination, searchOrigin]);

  const filtered = useMemo(() => options.filter((f) => {
    const exact = f.sameDest ?? f.to === ORIGINAL_FLIGHT.to;
    if (filter === 'exact') return exact;
    if (filter === 'nearby') return !exact;
    return true;
  }), [filter, options]);

  return (
    <section id="flights" className="bg-slate-50 py-14 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl mb-8">
          <img src={PLANE_IMG} className="w-full h-44 object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950 via-blue-950/80 to-transparent flex items-center">
            <div className="px-8">
              <p className="text-red-400 text-xs font-bold uppercase tracking-widest">Step 1</p>
              <h2 className="text-white text-3xl lg:text-4xl font-bold mt-1">Rebook to {destinationLabel}</h2>
              <p className="text-blue-100 mt-1">Same destination — or land at a nearby airport, faster.</p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading live rescue options from the booking backend…
          </div>
        )}

        {!loading && usingLiveResults && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <Info className="h-4 w-4" />
            Showing live rebooking inventory. Selecting one of these flights can proceed through the production checkout flow.
          </div>
        )}

        {!loading && loadError && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="h-4 w-4" />
            {loadError}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filter:</span>
          </div>
          {[
            { id: 'all', label: 'All flights' },
            { id: 'exact', label: `Direct to ${destinationAirport}` },
            { id: 'nearby', label: 'Nearby airports' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as typeof filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                filter === f.id
                  ? 'bg-blue-950 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-red-400'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-sm text-slate-500">{filtered.length} options found</span>
        </div>

        <div className="space-y-3">
          {filtered.map((flight) => {
            const selected = selectedFlight?.id === flight.id;
            const sameDest = flight.sameDest ?? flight.to === ORIGINAL_FLIGHT.to;
            return (
              <div
                key={flight.id}
                className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${
                  selected ? 'border-red-500 shadow-xl shadow-red-100' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-5 lg:p-6 grid lg:grid-cols-12 gap-5 items-center">
                  <div className="lg:col-span-2 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                      <Plane className="w-5 h-5 text-white -rotate-45" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{flight.flightNum}</p>
                      <p className="text-xs text-slate-500">{flight.carrier}</p>
                    </div>
                  </div>

                  <div className="lg:col-span-5 flex items-center gap-4">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{flight.depart}</p>
                      <p className="text-sm text-slate-500">{flight.from}</p>
                    </div>
                    <div className="flex-1 px-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="flex-1 h-px bg-slate-300" />
                        <Clock className="w-3 h-3" />
                        <span>{flight.duration}</span>
                        <span className="flex-1 h-px bg-slate-300" />
                      </div>
                      <p className="text-center text-[10px] text-slate-400 mt-1">
                        {typeof flight.connections === 'number'
                          ? flight.connections === 0
                            ? 'Nonstop'
                            : `${flight.connections} stop${flight.connections > 1 ? 's' : ''}`
                          : 'Nonstop'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{flight.arrive}</p>
                      <p className="text-sm text-slate-500">{flight.to}</p>
                    </div>
                  </div>

                  <div className="lg:col-span-3 flex flex-wrap gap-2 text-xs">
                    <span
                      className={`px-2.5 py-1 rounded-full font-semibold ${
                        flight.status === 'On Time' || flight.status === 'Nonstop'
                          ? 'bg-green-100 text-green-700'
                          : flight.status === 'Boarding' || flight.status.includes('stop')
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {flight.status}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {flight.seatsLeft} seats
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${
                        sameDest ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <MapPin className="w-3 h-3" />
                      {flight.distanceFromDest}
                    </span>
                  </div>

                  <div className="lg:col-span-2 flex flex-col items-end gap-2">
                    <div className="text-right">
                      {flight.price === 0 ? (
                        <p className="text-emerald-600 font-bold">No fee</p>
                      ) : (
                        <p className="text-slate-900 font-bold">+${flight.price.toFixed(2)}</p>
                      )}
                      <p className="text-[11px] text-slate-500">
                        {flight.source === 'live' ? `Rebooking • ${(flight.currency || 'USD').toUpperCase()}` : 'Demo pricing'}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFlight(selected ? null : flight)}
                      className={`w-full lg:w-auto px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 justify-center ${
                        selected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {selected ? (
                        <>
                          <Check className="w-4 h-4" /> Selected
                        </>
                      ) : (
                        <>
                          Rebook <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FlightRebook;
