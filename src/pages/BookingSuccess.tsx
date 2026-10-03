import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Plane, Mail, Receipt, ArrowRight, Loader2, Lock } from 'lucide-react';
import { getCheckoutStatus } from '@/lib/api';
import Footer from '@/components/rescue/Footer';
import { isConfirmedCheckout, loadAssistStore, rememberConfirmation, saveAssistStore } from '@/lib/rescueAccess.mjs';

interface Booking {
  id: string;
  traveler_email: string;
  booking_type: string | null;
  item_label: string | null;
  amount_cents: number | null;
  currency: string | null;
  status: string;
  created_at: string | null;
}

type Outcome = 'loading' | 'confirmed' | 'pending' | 'error' | 'missing';

const BookingSuccess: React.FC = () => {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const rescueSessionId = params.get('rescue_session');
  const flightKey = params.get('flight');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(sessionId ? 'loading' : 'missing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setOutcome('missing');
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const fetchBooking = async () => {
      try {
        const data = await getCheckoutStatus(sessionId);
        if (cancelled) return;

        if (data.booking) setBooking(data.booking as Booking);

        const confirmed = isConfirmedCheckout({
          bookingStatus: data.booking?.status,
          paymentStatus: data.paymentStatus,
        });

        if (confirmed) {
          const next = rememberConfirmation(loadAssistStore(window.localStorage), {
            flightKey,
            rescueSessionId,
            stripeSessionId: sessionId,
            bookingStatus: data.booking?.status || null,
            paymentStatus: data.paymentStatus,
          });
          saveAssistStore(window.localStorage, next);
          setOutcome('confirmed');
          return;
        }

        if (attempts < 8) {
          attempts += 1;
          setTimeout(fetchBooking, 1500);
          return;
        }

        setOutcome('pending');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Booking status could not be verified.');
        setOutcome('error');
      }
    };

    fetchBooking();
    return () => { cancelled = true; };
  }, [sessionId, rescueSessionId, flightKey]);

  const amount = booking ? (((booking.amount_cents ?? 0) / 100).toFixed(2)) : null;
  const loading = outcome === 'loading';
  const confirmed = outcome === 'confirmed';

  const headline = loading
    ? 'Confirming your rescue…'
    : confirmed
      ? "You're all set."
      : outcome === 'missing'
        ? 'No checkout session to confirm.'
        : 'Options stay locked.';

  const detail = loading
    ? 'Stripe is finalizing your payment. This usually takes just a few seconds.'
    : confirmed
      ? 'Payment is confirmed. Curated flights, hotels, and lounges are now visible for this rescue session. Tickets are still booked outside the app.'
      : outcome === 'error'
        ? 'Checkout status could not be verified, so replacement options stay hidden.'
        : outcome === 'missing'
          ? 'Open Rescue Assist from the flight status screen and finish Stripe checkout before options can appear.'
          : 'Stripe has not reported this checkout as paid, confirmed, or booked. Replacement flights, hotels, and lounges stay hidden.';

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
              <Plane className="w-4 h-4 text-white -rotate-45" />
            </div>
            <p className="text-slate-900 font-bold">
              Connection<span className="text-red-600">Rescue</span>
            </p>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ring-8 ${confirmed || loading ? 'bg-emerald-100 ring-emerald-50' : 'bg-amber-100 ring-amber-50'}`}>
            {loading ? (
              <Loader2 className="w-9 h-9 text-emerald-600 animate-spin" />
            ) : confirmed ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            ) : (
              <Lock className="w-10 h-10 text-amber-600" />
            )}
          </div>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${confirmed || loading ? 'text-emerald-700' : 'text-amber-700'}`}>
            {loading ? 'Finalizing booking' : confirmed ? 'Booking confirmed' : 'Not confirmed'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{headline}</h1>
          <p className="mt-3 text-slate-600 max-w-lg mx-auto">{detail}</p>
          {error && (
            <p className="mt-3 text-sm text-red-700 max-w-lg mx-auto">{error}</p>
          )}
        </div>

        {booking && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
              <Receipt className="w-5 h-5 text-slate-400" />
              <p className="font-semibold text-slate-900 text-sm">Booking summary</p>
              <span
                className={`ml-auto text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                  ['paid', 'confirmed', 'booked'].includes(booking.status)
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {booking.status}
              </span>
            </div>
            <dl className="divide-y divide-slate-100 text-sm">
              <div className="px-5 py-3 flex items-center justify-between">
                <dt className="text-slate-500">Confirmation</dt>
                <dd className="font-mono text-slate-900">{booking.id.slice(0, 8).toUpperCase()}</dd>
              </div>
              <div className="px-5 py-3 flex items-center justify-between">
                <dt className="text-slate-500">Type</dt>
                <dd className="font-semibold text-slate-900 capitalize">{booking.booking_type}</dd>
              </div>
              <div className="px-5 py-3 flex items-start justify-between gap-4">
                <dt className="text-slate-500 shrink-0">Item</dt>
                <dd className="font-medium text-slate-900 text-right">{booking.item_label}</dd>
              </div>
              <div className="px-5 py-3 flex items-center justify-between">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">{booking.traveler_email}</dd>
              </div>
              <div className="px-5 py-3 flex items-center justify-between">
                <dt className="text-slate-500">Amount paid</dt>
                <dd className="font-mono font-bold text-slate-900 text-base">
                  ${amount} {booking.currency?.toUpperCase() || 'USD'}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {confirmed && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900">Check your inbox</p>
              <p className="text-blue-800 mt-1">
                We've sent your Stripe receipt
                {booking && <> to <strong>{booking.traveler_email}</strong></>}.
                Buy the replacement flight directly with the airline. This app does not issue the ticket.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            to={confirmed ? `/?flight=${encodeURIComponent(flightKey || '')}#flights` : '/#rescue-assist'}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition"
          >
            {confirmed ? 'View rescue options' : 'Back to flight status'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Not production-ready. A confirmed Stripe test payment only unlocks options in this browser for the flight on the checkout.
        </p>
      </main>

      <Footer />
    </div>
  );
};

export default BookingSuccess;
