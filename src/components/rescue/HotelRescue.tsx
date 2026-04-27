import React from 'react';
import { Hotel as HotelIcon, Star, Check, ArrowRight, Ticket } from 'lucide-react';
import { HOTELS, Hotel } from '@/data/rescueData';

interface Props {
  selectedHotel: Hotel | null;
  setSelectedHotel: (h: Hotel | null) => void;
}

const HotelRescue: React.FC<Props> = ({ selectedHotel, setSelectedHotel }) => {
  return (
    <section id="hotels" className="bg-white py-14 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-red-600 text-xs font-bold uppercase tracking-widest">Step 2</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mt-1">Stay tonight, fly tomorrow</h2>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-950 to-blue-900 rounded-2xl p-5 mb-8 flex flex-wrap items-center justify-between gap-4 border border-red-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold">Distressed-Passenger Voucher Issued</p>
              <p className="text-blue-200 text-sm">American Airlines covers 1 night at on-airport partner.</p>
            </div>
          </div>
          <span className="px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-bold">VOUCHER ACTIVE</span>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {HOTELS.map((hotel) => {
            const selected = selectedHotel?.id === hotel.id;
            return (
              <div
                key={hotel.id}
                className={`bg-white rounded-2xl overflow-hidden border-2 transition-all hover:-translate-y-1 ${
                  selected ? 'border-red-500 shadow-2xl shadow-red-100' : 'border-slate-200 shadow-sm hover:shadow-xl'
                }`}
              >
                <div className="relative h-48 overflow-hidden">
                  <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />
                  {hotel.voucherCovered && (
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold">
                      COVERED BY VOUCHER
                    </span>
                  )}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg drop-shadow-lg">{hotel.name}</h3>
                    <div className="flex items-center gap-1 bg-white/95 px-2 py-1 rounded-full">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-slate-900">{hotel.rating}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <HotelIcon className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800">{hotel.distance}</p>
                      <p className="text-xs">{hotel.shuttle}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {hotel.amenities.slice(0, 4).map((a) => (
                      <span key={a} className="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-700">
                        {a}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-500 line-through">${hotel.retailPrice}/night</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {hotel.airlineRate === 0 ? 'FREE' : `$${hotel.airlineRate}`}
                        {hotel.airlineRate > 0 && <span className="text-sm font-normal text-slate-500">/night</span>}
                      </p>
                      <p className="text-[10px] text-slate-500">Airline distressed rate</p>
                    </div>
                    <button
                      onClick={() => setSelectedHotel(selected ? null : hotel)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                        selected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-950 hover:bg-blue-900 text-white'
                      }`}
                    >
                      {selected ? (
                        <>
                          <Check className="w-4 h-4" /> Booked
                        </>
                      ) : (
                        <>
                          Book Now <ArrowRight className="w-4 h-4" />
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

export default HotelRescue;
