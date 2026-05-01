import React, { useEffect, useMemo, useState } from 'react';
import { Plane, Clock, Users, MapPin, Check, ArrowRight, Filter, Info } from 'lucide-react';
import { ALTERNATE_FLIGHTS, Flight, ORIGINAL_FLIGHT, PLANE_IMG } from '@/data/rescueData';
import { useTraveler } from '@/contexts/TravelerContext';
import type { LiveFlight } from './FlightSearch';
import { getAirportCity } from '@/data/airports';

interface Props {
  selectedFlight: Flight | null;
  setSelectedFlight: (f: Flight | null) => void;
  liveFlight: LiveFlight | null;
}

const buildGuidanceFlights = (origin: string, destination: string, destinationLabel: string): Flight[] =>
  ALTERNATE_FLIGHTS.map((flight) => {
    const sameDest = flight.id === 'f3';

    return {
      ...flight,
      from: origin,
      to: sameDest ? destination : flight.to,
      toCity: sameDest ? destinationLabel : flight.toCity,
      sameDest,
      source: 'mock',
      distanceFromDest: sameDest ? 'Original destination' : flight.distanceFromDest,
    };
  });

const FlightRebook: React.FC<Props> = ({ selectedFlight, setSelectedFlight, liveFlight }) => {
  const { profile } = useTraveler();
  const [filter, setFilter] = useState<'all' | 'exact' | 'nearby'>('all');
  const searchOrigin = liveFlight?.departure.airport || profile.boardingPass?.from || ORIGINAL_FLIGHT.from;
  const searchDestination = liveFlight?.arrival.airport || profile.boardingPass?.to || ORIGINAL_FLIGHT.to;
  const destinationLabel =
    liveFlight?.arrival.city ||
    profile.boardingPass?.toCity ||
    getAirportCity(searchDestination, ORIGINAL_FLIGHT.toCity);
  const destinationAirport = searchDestination || ORIGINAL_FLIGHT.to;
  const [options, setOptions] = useState<Flight[]>(buildGuidanceFlights(searchOrigin, searchDestination, destinationLabel));

  useEffect(() => {
    setOptions(buildGuidanceFlights(searchOrigin, searchDestination, destinationLabel));
  }, [destinationLabel, searchDestination, searchOrigin]);

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

        <div className="mb-5 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <Info className="h-4 w-4" />
          AviationStack mode is active. These are guided rescue suggestions based on your disrupted route, and the replacement
          flight itself must still be purchased directly with the airline.
        </div>

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
                        <p className="text-emerald-600 font-bold">Guidance only</p>
                      ) : (
                        <p className="text-slate-900 font-bold">Est. airline fare +${flight.price.toFixed(2)}</p>
                      )}
                        <p className="text-[11px] text-slate-500">
                          {flight.source === 'live' ? `Rebooking • ${(flight.currency || 'USD').toUpperCase()}` : 'Book directly with airline'}
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
                          Choose option <ArrowRight className="w-4 h-4" />
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
