import React from 'react';
import { CheckCircle2, X, Sparkles, ExternalLink } from 'lucide-react';
import { Flight, Hotel, Lounge } from '@/data/rescueData';
import { flightHandoffUrl, hotelHandoffUrl, loungeHandoffUrl } from '@/lib/handoff.mjs';

interface Props {
  selectedFlight: Flight | null;
  selectedHotel: Hotel | null;
  selectedLounge: Lounge | null;
  onClear: () => void;
  demoMode?: boolean;
  onDemoFinish?: () => void;
}

const ConfirmationBar: React.FC<Props> = ({
  selectedFlight,
  selectedHotel,
  selectedLounge,
  onClear,
  demoMode = false,
  onDemoFinish,
}) => {
  const count = [selectedFlight, selectedHotel, selectedLounge].filter(Boolean).length;
  if (count === 0) return null;

  const airport = selectedFlight?.from;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl shadow-2xl shadow-emerald-900/40 border border-emerald-400/30 overflow-hidden">
        <div className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <p className="font-bold text-sm">Rescue Assist confirmed — {count}/3 selected</p>
            </div>
            <p className="text-xs text-emerald-50/90 truncate mt-0.5">
              Tickets, rooms, and passes are booked outside ConnectionRescue.
              {selectedFlight && ` ${selectedFlight.flightNum}`}
              {selectedHotel && ` · ${selectedHotel.name.split(' ').slice(0, 3).join(' ')}`}
              {selectedLounge && ` · ${selectedLounge.name}`}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedFlight && (
                <a
                  href={flightHandoffUrl({
                    flightNum: selectedFlight.flightNum,
                    carrier: selectedFlight.carrier,
                    from: selectedFlight.from,
                    to: selectedFlight.to,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-[11px] font-semibold hover:bg-white/25"
                >
                  Airline site <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {selectedHotel && (
                <a
                  href={hotelHandoffUrl({ name: selectedHotel.name, airport })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-[11px] font-semibold hover:bg-white/25"
                >
                  Hotel search <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {selectedLounge && (
                <a
                  href={loungeHandoffUrl({
                    name: selectedLounge.name,
                    terminal: selectedLounge.terminal,
                    airport,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-[11px] font-semibold hover:bg-white/25"
                >
                  Lounge map <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          {demoMode && (
            <button
              onClick={() => onDemoFinish?.()}
              className="px-4 py-2 rounded-lg bg-white text-emerald-700 font-bold text-sm hover:bg-emerald-50 transition shrink-0"
            >
              Finish Demo
            </button>
          )}
          <button onClick={onClear} className="p-2 hover:bg-white/10 rounded-lg transition" aria-label="Reset">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationBar;
