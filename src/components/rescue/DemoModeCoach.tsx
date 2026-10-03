import React from 'react';
import { CheckCircle2, PlayCircle, X } from 'lucide-react';

interface DemoModeCoachProps {
  active: boolean;
  step: number;
  completed: {
    flight: boolean;
    hotel: boolean;
    lounge: boolean;
  };
  onNext: () => void;
  onClose: () => void;
  optionsUnlocked?: boolean;
}

const STEP_COPY = [
  {
    title: 'Step 1: Simulate a disruption',
    desc: 'Load a realistic delayed-flight example so users can see what the rescue dashboard means.',
    cta: 'Load Demo Disruption',
  },
  {
    title: 'Step 2: Rebook flight',
    desc: 'Pick the fastest alternative route and explain why nearby-airport options show up.',
    cta: 'Select Recommended Flight',
  },
  {
    title: 'Step 3: Secure hotel',
    desc: 'Choose an overnight option and teach when airline vouchers apply.',
    cta: 'Select Voucher Hotel',
  },
  {
    title: 'Step 4: Reserve lounge',
    desc: 'Show membership-aware lounge matching so users know where to wait comfortably.',
    cta: 'Select Closest Lounge',
  },
  {
    title: 'Demo complete',
    desc: 'The rescue summary is now populated. Users can repeat the demo or continue normally.',
    cta: 'Exit Demo Mode',
  },
];

const DemoModeCoach: React.FC<DemoModeCoachProps> = ({ active, step, completed, onNext, onClose, optionsUnlocked = false }) => {
  if (!active) return null;

  const current = { ...STEP_COPY[Math.min(step, STEP_COPY.length - 1)] };
  if (!optionsUnlocked && step >= 1 && step < 4) {
    current.title = 'Rescue Assist comes before options';
    current.desc = 'Disruption status is free. Replacement flights, hotels, and lounges stay hidden until Stripe checkout is confirmed.';
    current.cta = 'Review Rescue Assist';
  }
  const progress = Math.min(step + 1, STEP_COPY.length);

  return (
    <section className="sticky top-16 z-30 border-b border-amber-200 bg-amber-50/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700">
          <PlayCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            Guided Demo · {progress}/{STEP_COPY.length}
          </p>
          <p className="truncate text-sm font-semibold text-slate-900">{current.title}</p>
          <p className="hidden text-xs text-slate-700 sm:block">{current.desc}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <Status label="Flight" done={completed.flight} />
            <Status label="Hotel" done={completed.hotel} />
            <Status label="Lounge" done={completed.lounge} />
          </div>
        </div>
        <button
          onClick={onNext}
          className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
        >
          {current.cta}
        </button>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-slate-500 hover:bg-white/70 hover:text-slate-700"
          aria-label="Close demo mode"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
};

const Status: React.FC<{ label: string; done: boolean }> = ({ label, done }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600'}`}>
    <CheckCircle2 className={`h-3 w-3 ${done ? 'text-emerald-600' : 'text-slate-400'}`} />
    {label}
  </span>
);

export default DemoModeCoach;
