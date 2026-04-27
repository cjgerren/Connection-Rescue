import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Plane, Mail, Receipt, ArrowRight, Loader2 } from 'lucide-react';
import { getCheckoutStatus } from '@/lib/api';
import Footer from '@/components/rescue/Footer';

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

const BookingSuccess: React.FC = () => {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const fetchBooking = async () => {
      let keepPolling = false;
      try {
        const data = await getCheckoutStatus(sessionId);
        if (cancelled) return;

        if (data.booking) {
          setBooking(data.booking as Booking);
          if (!['paid', 'confirmed', 'booked'].includes(data.booking.status) && attempts < 8) {
            attempts++;
            keepPolling = true;
            setTimeout(fetchBooking, 1500);
            return;
          }
        } else if (attempts < 8) {
          attempts++;
          keepPolling = true;
          setTimeout(fetchBooking, 1500);
          return;
        }
      } finally {
        if (!cancelled && !keepPolling) setLoading(false);
      }
    };

    fetchBooking();
    return () => { cancelled = true; };
  }, [sessionId]);

  const amount = booking ? (((booking.amount_cents ?? 0) / 100).toFixed(2)) : null;

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
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-6 ring-8 ring-emerald-50">
            {loading ? (
              <Loader2 className="w-9 h-9 text-emerald-600 animate-spin" />
            ) : (
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            )}
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 mb-3">
            {loading ? 'Finalizing booking' : 'Booking confirmed'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            {loading ? 'Confirming your rescue…' : 'You\'re all set.'}
          </h1>
          <p className="mt-3 text-slate-600 max-w-lg mx-auto">
            {loading
              ? 'Stripe is finalizing your payment. This usually takes just a few seconds.'
              : 'Payment received. A receipt and your rescue guidance summary are on their way to your inbox.'}
          </p>
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

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-blue-900">Check your inbox</p>
            <p className="text-blue-800 mt-1">
              We've sent your Stripe receipt and your rescue summary
              {booking && <> to <strong>{booking.traveler_email}</strong></>}.
              If you selected a replacement flight, purchase it directly with the airline using the option you chose in the app.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition"
          >
            Back to ConnectionRescue
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingSuccess;
