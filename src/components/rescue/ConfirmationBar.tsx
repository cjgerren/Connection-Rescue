import React, { useState } from 'react';
import { CheckCircle2, X, Sparkles, Loader2, CreditCard, ShieldCheck, Lock, Phone } from 'lucide-react';
import { Flight, Hotel, Lounge } from '@/data/rescueData';
import { createCheckoutSession, RESCUE_SERVICE_FEE_CENTS } from '@/lib/api';
import { useTraveler } from '@/contexts/TravelerContext';

interface Props {
  selectedFlight: Flight | null;
  selectedHotel: Hotel | null;
  selectedLounge: Lounge | null;
  onClear: () => void;
}

const ConfirmationBar: React.FC<Props> = ({ selectedFlight, selectedHotel, selectedLounge, onClear }) => {
  const { profile } = useTraveler();
  const [showCheckout, setShowCheckout] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = [selectedFlight, selectedHotel, selectedLounge].filter(Boolean).length;
  if (count === 0) return null;

  // Flights are guidance-only in AviationStack mode, so the replacement fare
  // is purchased directly with the airline and is never charged here.
  // hotels show airlineRate (the traveler's distress rate), lounges charge dayPass.
  const flightCents = selectedFlight?.offerId ? Math.max(0, selectedFlight.price) * 100 : 0;
  const hotelCents = selectedHotel ? Math.max(0, selectedHotel.airlineRate) * 100 : 0;
  const loungeCents = selectedLounge ? Math.max(0, selectedLounge.dayPass) * 100 : 0;
  const serviceFeeCents = count > 0 ? RESCUE_SERVICE_FEE_CENTS : 0;
  const subtotalCents = flightCents + hotelCents + loungeCents;
  const totalCents = subtotalCents + serviceFeeCents;
  const totalDollars = (totalCents / 100).toFixed(2);

  const bookingType: 'flight' | 'hotel' | 'lounge' | 'bundle' =
    count > 1
      ? 'bundle'
      : selectedFlight
      ? 'flight'
      : selectedHotel
      ? 'hotel'
      : 'lounge';

  const itemLabel = [
    selectedFlight && `Flight ${selectedFlight.flightNum} → ${selectedFlight.toCity}`,
    selectedHotel && `Hotel: ${selectedHotel.name}`,
    selectedLounge && `Lounge: ${selectedLounge.name}`,
  ]
    .filter(Boolean)
    .join(' + ') || 'ConnectionRescue Booking';

  const travelerName = profile.boardingPass?.passengerName ?? undefined;
  const hasBookableFlight = !!selectedFlight?.offerId;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email so we can send your confirmation.');
      return;
    }
    if (totalCents <= 0) {
      setError('This rescue plan is fully covered — no payment is required. You can close this confirmation.');
      return;
    }
    // Light client-side phone validation (optional field). If provided, must
    // contain at least 7 digits — server re-normalizes to E.164 before SMS.
    const phoneDigits = phone.replace(/\D/g, '');
    if (phone && phoneDigits.length < 7) {
      setError('Phone number looks too short. Include country code, e.g. +1 555 123 4567.');
      return;
    }

    setLoading(true);
    try {
      const origin = window.location.origin;
      const session = await createCheckoutSession({
        runId: selectedFlight?.runId ?? null,
        offerId: hasBookableFlight ? selectedFlight?.offerId : undefined,
        totalAmount: hasBookableFlight ? selectedFlight?.totalAmount : undefined,
        currency: selectedFlight?.currency || 'usd',
        bookingType,
        amountCents: hotelCents + loungeCents,
        itemLabel,
        traveler: {
          email,
          name: travelerName,
          phone: phone || undefined,
        },
        successUrl: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/booking-cancelled`,
        metadata: {
          flight_id: selectedFlight?.id ?? null,
          hotel_id: selectedHotel?.id ?? null,
          lounge_id: selectedLounge?.id ?? null,
          flight_num: selectedFlight?.flightNum ?? null,
        },
      });

      window.location.href = session.url;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };


  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl shadow-2xl shadow-emerald-900/40 border border-emerald-400/30 overflow-hidden">
          <div className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                <p className="font-bold text-sm">Rescue Plan Active — {count}/3 confirmed</p>
                {totalCents > 0 && (
                  <span className="ml-auto sm:ml-2 bg-white/15 rounded-md px-2 py-0.5 text-xs font-mono">
                    ${totalDollars}
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-50/90 truncate mt-0.5">
                {selectedFlight && `${selectedFlight.flightNum} `}
                {selectedHotel && `· ${selectedHotel.name.split(' ').slice(0, 3).join(' ')} `}
                {selectedLounge && `· ${selectedLounge.name}`}
              </p>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className="px-4 py-2 rounded-lg bg-white text-emerald-700 font-bold text-sm hover:bg-emerald-50 transition shrink-0 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Confirm
            </button>
            <button onClick={onClear} className="p-2 hover:bg-white/10 rounded-lg transition" aria-label="Reset">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showCheckout && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Confirm rescue booking</p>
                  <p className="text-[11px] text-slate-500">Secure checkout via Stripe</p>
                </div>
              </div>
              <button
                onClick={() => { setShowCheckout(false); setError(null); }}
                className="p-2 hover:bg-slate-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
                {selectedFlight && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Flight guidance {selectedFlight.flightNum}</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {selectedFlight.offerId ? `$${selectedFlight.price.toFixed(2)}` : 'Booked separately'}
                    </span>
                  </div>
                )}
                {selectedHotel && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 truncate pr-2">{selectedHotel.name}</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {selectedHotel.airlineRate > 0 ? `$${selectedHotel.airlineRate.toFixed(2)}` : 'Voucher'}
                    </span>
                  </div>
                )}
                {selectedLounge && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">{selectedLounge.name}</span>
                    <span className="font-mono font-semibold text-slate-900">
                      ${selectedLounge.dayPass.toFixed(2)}
                    </span>
                  </div>
                )}
                {serviceFeeCents > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Rescue Assist fee</span>
                    <span className="font-mono font-semibold text-slate-900">
                      ${(serviceFeeCents / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="font-mono font-bold text-slate-900 text-lg">${totalDollars}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Replacement airfare is purchased directly with the airline in AviationStack mode. The Rescue Assist fee covers the
                ConnectionRescue self-serve recovery workflow and confirmation handling for this incident.
              </p>

              <form onSubmit={handleConfirm} className="space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Email for confirmation</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    autoFocus
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3 h-3" />
                    Mobile for SMS alerts
                    <span className="text-slate-400 font-medium normal-case tracking-normal">(optional)</span>
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 123 4567"
                    inputMode="tel"
                    autoComplete="tel"
                    className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <span className="mt-1 block text-[11px] text-slate-500 leading-snug">
                    Get a text confirmation + real-time gate-change alerts. Msg &amp; data rates may apply. Reply STOP to opt out.
                  </span>
                </label>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
                {selectedFlight && !selectedFlight.offerId && (
                  <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    This flight choice is guidance only. ConnectionRescue will charge the Rescue Assist fee, but the replacement
                    flight itself still needs to be purchased directly with the airline.
                  </div>
                )}


                <button
                  type="submit"
                  disabled={loading || totalCents <= 0}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold text-sm hover:from-emerald-500 hover:to-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirecting to Stripe…
                    </>
                  ) : totalCents <= 0 ? (
                    'No payment required'
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Pay ${totalDollars} securely
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> 256-bit TLS</span>
                  <span>·</span>
                  <span>Powered by Stripe</span>
                  <span>·</span>
                  <span>PCI-DSS</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfirmationBar;
