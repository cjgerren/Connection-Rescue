import React, { useState } from 'react';
import { ArrowRight, BadgeDollarSign, Clock3, Loader2, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';
import { RESCUE_SERVICE_FEE_CENTS, submitConciergeInterest } from '@/lib/api';

const POLL_KEY = 'connectionrescue.concierge_interest';

type Vote = 'yes' | 'no';

const rescueAssistPrice = `$${(RESCUE_SERVICE_FEE_CENTS / 100).toFixed(2)}`;

const PricingSection: React.FC = () => {
  const [vote, setVote] = useState<Vote | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = window.localStorage.getItem(POLL_KEY);
    return saved === 'yes' || saved === 'no' ? saved : null;
  });
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const saveVote = (nextVote: Vote) => {
    setVote(nextVote);
    setSubmitState('idle');
    setMessage(null);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(POLL_KEY, nextVote);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!vote) {
      setSubmitState('error');
      setMessage('Choose yes or no first so the feedback is useful.');
      return;
    }

    const normalizedEmail = email.trim();
    if (normalizedEmail && !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setSubmitState('error');
      setMessage('Enter a valid email or leave it blank.');
      return;
    }

    setSaving(true);
    setSubmitState('idle');
    setMessage(null);

    try {
      await submitConciergeInterest({
        vote,
        email: normalizedEmail || undefined,
        notes: notes.trim() || undefined,
        page: 'pricing_section',
      });
      setSubmitState('success');
      setMessage('Interest saved. You can update your response any time by submitting again.');
    } catch (error) {
      setSubmitState('error');
      setMessage(error instanceof Error ? error.message : 'Could not save your feedback right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <div className="flex items-center gap-2 text-red-500 text-sm font-semibold uppercase tracking-wider">
        <Sparkles className="w-4 h-4" />
        Pricing Model
      </div>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">Keep the rescue fee small. Charge only when it helps.</h2>
          <p className="mt-3 max-w-3xl text-slate-600 text-sm sm:text-base leading-relaxed">
            Travelers still pay for the replacement flight, hotel, or lounge they choose. ConnectionRescue should charge a separate
            one-time assist fee for the recovery workflow, not a fake concierge promise you do not staff yet.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <BadgeDollarSign className="w-3.5 h-3.5" />
              Launch Recommendation
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Rescue Assist</h3>
                <p className="mt-1 text-slate-600 text-sm">One-time per disruption incident</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-slate-900">{rescueAssistPrice}</p>
                <p className="text-xs text-slate-500">airfare sold separately</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 grid gap-4 sm:grid-cols-2">
            <Feature
              icon={<Clock3 className="w-4 h-4" />}
              title="Fast recovery flow"
              description="Ranked replacement options, prefilled traveler info, and direct checkout."
            />
            <Feature
              icon={<ShieldCheck className="w-4 h-4" />}
              title="Stress reduction"
              description="Clear next-best options without searching five airline tabs while stranded."
            />
            <Feature
              icon={<MessageSquare className="w-4 h-4" />}
              title="Confirmation alerts"
              description="Email confirmation now, with SMS alerts when your backend messaging is enabled."
            />
            <Feature
              icon={<ArrowRight className="w-4 h-4" />}
              title="Simple positioning"
              description="Easy to explain: pay a small assist fee only when you actually need rescue."
            />
          </div>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 border border-amber-200">
            Coming Soon
          </div>
          <h3 className="mt-4 text-2xl font-bold text-slate-900">Live Concierge</h3>
          <p className="mt-2 text-slate-700 text-sm leading-relaxed">
            Do not sell live human rescue until you have real staffing. For now, present it as a roadmap feature and test demand.
          </p>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-white/80 p-4">
            <p className="text-sm font-semibold text-slate-900">Would you use live concierge support if it launched later?</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                onClick={() => saveVote('yes')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  vote === 'yes'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Yes, I would use it
              </button>
              <button
                onClick={() => saveVote('no')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  vote === 'no'
                    ? 'bg-slate-900 text-white shadow'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                No, self-serve is enough
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Email for waitlist updates</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">What would you expect from it?</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Manual rebooking, SMS support, hotel fallback, airline coordination..."
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Save feedback
              </button>
            </form>
            <p className="mt-3 text-xs text-slate-500">
              Responses are now saved to your backend when it is configured. Your yes/no vote is also cached locally in this browser.
            </p>
            {message && (
              <div
                className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
                  submitState === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : submitState === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const Feature: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2 text-red-600">
      {icon}
      <p className="text-sm font-semibold text-slate-900">{title}</p>
    </div>
    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>
  </div>
);

export default PricingSection;
