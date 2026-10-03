import React, { useState } from 'react';
import { Lock, Loader2, ShieldCheck, Plane, Hotel, Coffee } from 'lucide-react';
import { createCheckoutSession, RESCUE_SERVICE_FEE_CENTS } from '@/lib/api';

interface Props {
  flightNumber: string;
  flightKey: string;
  sessionId: string;
  routeLabel: string;
  travelerName?: string;
}

const priceLabel = `$${(RESCUE_SERVICE_FEE_CENTS / 100).toFixed(2)}`;

const RescueAssistGate: React.FC<Props> = ({ flightNumber, flightKey, sessionId, routeLabel, travelerName }) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!sessionId) {
      setError('Rescue session is not ready yet. Refresh and try again.');
      return;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email so Stripe can send the test receipt.');
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phone && phoneDigits.length < 7) {
      setError('Phone number looks too short.');
      return;
    }

    setLoading(true);
    try {
      const origin = window.location.origin;
      const session = await createCheckoutSession({
        bookingType: 'bundle',
        amountCents: 0,
        currency: 'usd',
        itemLabel: 'ConnectionRescue Rescue Assist',
        traveler: { email, name: travelerName, phone: phone || undefined },
        successUrl: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}&rescue_session=${encodeURIComponent(sessionId)}&flight=${encodeURIComponent(flightKey)}`,
        cancelUrl: `${origin}/booking-cancelled?rescue_session=${encodeURIComponent(sessionId)}&flight=${encodeURIComponent(flightKey)}`,
        metadata: {
          rescue_session_id: sessionId,
          flight_num: flightKey,
          product: 'rescue_assist',
        },
      });
      if (!session?.url) {
        throw new Error('Checkout did not return a URL. Options stay locked.');
      }
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout could not start. Options stay locked.');
      setLoading(false);
    }
  };

  return (
    <section id="rescue-assist" data-testid="rescue-assist-gate" data-rescue-options="locked" className="bg-slate-50 py-14 scroll-mt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#0a1d3a] to-blue-950 px-6 py-6 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              Rescue Assist required
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Status is free. Options are locked.</h2>
            <p className="mt-2 text-sm text-blue-100 leading-relaxed">
              {flightNumber} {routeLabel} disruption status stays visible without paying.
              Replacement flights, hotels, and lounges stay hidden until Stripe confirms this Rescue Assist checkout.
            </p>
          </div>

          <div className="px-6 py-6 space-y-5">
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <LockedItem icon={<Plane className="w-4 h-4" />} label="Rebooking options" />
              <LockedItem icon={<Hotel className="w-4 h-4" />} label="Hotel options" />
              <LockedItem icon={<Coffee className="w-4 h-4" />} label="Lounge options" />
            </div>

            <div className="flex items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Rescue Assist</p>
                <p className="text-xs text-slate-500 mt-1">One-time for this rescue session. Airfare is not included.</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">{priceLabel}</p>
            </div>

            <form onSubmit={startCheckout} className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Mobile (optional)</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+1 555 123 4567"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                />
              </label>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {loading ? 'Redirecting to Stripe…' : `Unlock options · ${priceLabel}`}
              </button>
            </form>

            <div className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Demo checkout is Stripe test mode at the {priceLabel} assist fee. After payment is confirmed, curated options
                appear with links to book outside this app. ConnectionRescue does not issue tickets and is not production-ready.
                No live Stripe keys are bundled here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const LockedItem: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-slate-500">
    <Lock className="w-3.5 h-3.5" />
    <span className="text-slate-400">{icon}</span>
    <span className="font-medium">{label}</span>
  </div>
);

export default RescueAssistGate;
