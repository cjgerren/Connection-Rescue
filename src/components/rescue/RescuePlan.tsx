import React from 'react';
import { Plane, Hotel, Coffee, Check, ArrowRight, Sparkles } from 'lucide-react';
import { Flight, Hotel as HotelT, Lounge } from '@/data/rescueData';

interface Props {
  selectedFlight: Flight | null;
  selectedHotel: HotelT | null;
  selectedLounge: Lounge | null;
  onJump: (v: string) => void;
}

const RescuePlan: React.FC<Props> = ({ selectedFlight, selectedHotel, selectedLounge, onJump }) => {
  const steps = [
    {
      id: 'flights',
      title: 'Rebook your flight',
      desc: 'Pick the next available flight to your destination — or to a nearby airport.',
      icon: <Plane className="w-6 h-6" />,
      done: !!selectedFlight,
      doneLabel: selectedFlight ? `${selectedFlight.flightNum} → ${selectedFlight.to} • ${selectedFlight.depart}` : '',
    },
    {
      id: 'hotels',
      title: 'Secure overnight stay',
      desc: 'If you need to bunk down, claim your airline-issued voucher or premium upgrade.',
      icon: <Hotel className="w-6 h-6" />,
      done: !!selectedHotel,
      doneLabel: selectedHotel ? selectedHotel.name : '',
    },
    {
      id: 'lounges',
      title: 'Find your lounge',
      desc: 'Use your membership or grab a day pass — refresh in luxury while you wait.',
      icon: <Coffee className="w-6 h-6" />,
      done: !!selectedLounge,
      doneLabel: selectedLounge ? `${selectedLounge.name} • ${selectedLounge.gate}` : '',
    },
  ];

  const completed = steps.filter((s) => s.done).length;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-red-500 text-sm font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Your Rescue Plan
          </div>
          <h2 className="mt-2 text-3xl lg:text-4xl font-bold text-slate-900">3 steps. Zero stress.</h2>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-sm text-slate-500">Plan progress</p>
          <p className="text-2xl font-bold text-slate-900">{completed}/3</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-10">
        <div
          className="h-full bg-gradient-to-r from-red-500 to-red-700 transition-all duration-700"
          style={{ width: `${(completed / 3) * 100}%` }}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((step, i) => (
          <button
            key={step.id}
            onClick={() => onJump(step.id)}
            className={`group relative text-left p-6 rounded-2xl border-2 transition-all hover:-translate-y-1 ${
              step.done
                ? 'bg-gradient-to-br from-blue-950 to-blue-900 border-red-500 text-white shadow-xl shadow-red-900/20'
                : 'bg-white border-slate-200 hover:border-red-400 hover:shadow-xl'
            }`}
          >
            <div className="flex items-start justify-between">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  step.done ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'
                }`}
              >
                {step.done ? <Check className="w-6 h-6" /> : step.icon}
              </div>
              <span
                className={`text-xs font-bold px-2 py-1 rounded-full ${
                  step.done ? 'bg-green-500/20 text-green-300' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {step.done ? 'CONFIRMED' : `STEP ${i + 1}`}
              </span>
            </div>

            <h3 className={`mt-5 text-xl font-bold ${step.done ? 'text-white' : 'text-slate-900'}`}>
              {step.title}
            </h3>
            <p className={`mt-2 text-sm ${step.done ? 'text-blue-100/80' : 'text-slate-600'}`}>
              {step.done ? step.doneLabel : step.desc}
            </p>

            <div className={`mt-4 flex items-center gap-1 text-sm font-semibold ${step.done ? 'text-red-300' : 'text-red-600'}`}>
              {step.done ? 'View / change' : 'Begin step'}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default RescuePlan;
