import React, { useState } from 'react';
import { Coffee, MapPin, Star, Check, ArrowRight, KeyRound, CreditCard, Wifi, Users } from 'lucide-react';
import { LOUNGES, Lounge } from '@/data/rescueData';

interface Props {
  selectedLounge: Lounge | null;
  setSelectedLounge: (l: Lounge | null) => void;
}

// Simulate user memberships
const MY_MEMBERSHIPS = ['Admirals Club Member', 'AAdvantage Executive Platinum', 'Priority Pass Select'];

const LoungeAccess: React.FC<Props> = ({ selectedLounge, setSelectedLounge }) => {
  const [filter, setFilter] = useState<'all' | 'access' | 'closest'>('all');

  const enriched = LOUNGES.map((l) => ({
    ...l,
    hasAccess: l.memberAccess.some((m) => MY_MEMBERSHIPS.includes(m)),
  }));

  let filtered = enriched;
  if (filter === 'access') filtered = enriched.filter((l) => l.hasAccess);
  if (filter === 'closest') filtered = [...enriched].sort((a, b) => parseInt(a.walkTime) - parseInt(b.walkTime));

  return (
    <section id="lounges" className="bg-slate-50 py-14 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-red-600 text-xs font-bold uppercase tracking-widest">Step 3</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mt-1">Wait in luxury</h2>
            <p className="text-slate-600 mt-2 max-w-xl">
              Lounges near your gate. We've matched your memberships and offered day passes for the rest.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All lounges' },
              { id: 'access', label: 'My access' },
              { id: 'closest', label: 'Closest first' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  filter === f.id
                    ? 'bg-blue-950 text-white'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map((lounge) => {
            const selected = selectedLounge?.id === lounge.id;
            return (
              <div
                key={lounge.id}
                className={`bg-white rounded-2xl overflow-hidden border-2 transition-all ${
                  selected ? 'border-red-500 shadow-2xl shadow-red-100' : 'border-slate-200 hover:shadow-xl'
                }`}
              >
                <div className="grid grid-cols-5">
                  <div className="col-span-2 relative">
                    <img src={lounge.image} alt={lounge.name} className="w-full h-full object-cover min-h-[220px]" />
                    {lounge.hasAccess && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
                        <KeyRound className="w-3 h-3" />
                        FREE ACCESS
                      </span>
                    )}
                  </div>

                  <div className="col-span-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{lounge.name}</h3>
                        <p className="text-xs text-slate-500">{lounge.terminal}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold">{lounge.rating}</span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-red-600" />
                        <span className="font-medium">{lounge.gate}</span>
                        <span className="text-slate-400">•</span>
                        <span>{lounge.walkTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Capacity:{' '}
                          <span
                            className={`font-semibold ${
                              lounge.capacity === 'Light'
                                ? 'text-emerald-600'
                                : lounge.capacity === 'Moderate'
                                ? 'text-amber-600'
                                : 'text-red-600'
                            }`}
                          >
                            {lounge.capacity}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {lounge.amenities.slice(0, 3).map((a) => (
                        <span key={a} className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-medium">
                          {a}
                        </span>
                      ))}
                      {lounge.amenities.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          +{lounge.amenities.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        {lounge.hasAccess ? (
                          <>
                            <p className="text-emerald-600 font-bold text-sm flex items-center gap-1">
                              <Check className="w-4 h-4" /> Included
                            </p>
                            <p className="text-[10px] text-slate-500">Member access</p>
                          </>
                        ) : (
                          <>
                            <p className="text-slate-900 font-bold">${lounge.dayPass}</p>
                            <p className="text-[10px] text-slate-500">Day pass</p>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedLounge(selected ? null : lounge)}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                          selected
                            ? 'bg-emerald-600 text-white'
                            : lounge.hasAccess
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-blue-950 hover:bg-blue-900 text-white'
                        }`}
                      >
                        {selected ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Reserved
                          </>
                        ) : lounge.hasAccess ? (
                          <>
                            Enter Lounge <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-3.5 h-3.5" /> Buy Pass
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Membership wallet */}
        <div className="mt-10 p-6 bg-gradient-to-r from-blue-950 to-[#0a1d3a] rounded-2xl border border-red-500/30">
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest mb-3">
            <Wifi className="w-4 h-4" />
            Your Membership Wallet
          </div>
          <div className="flex flex-wrap gap-2">
            {MY_MEMBERSHIPS.map((m) => (
              <span
                key={m}
                className="px-3 py-1.5 rounded-full bg-white/10 text-white text-sm border border-white/15 flex items-center gap-1.5"
              >
                <Coffee className="w-3.5 h-3.5 text-red-400" />
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoungeAccess;
