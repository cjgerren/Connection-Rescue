import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle, Plane, ArrowLeft, RefreshCw, MessageSquare } from 'lucide-react';
import Footer from '@/components/rescue/Footer';

const BookingCancelled: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white flex flex-col">
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
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-6 ring-8 ring-amber-50">
            <XCircle className="w-10 h-10 text-amber-600" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-3">
            Checkout cancelled
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            No charge was made.
          </h1>
          <p className="mt-3 text-slate-600 max-w-lg mx-auto">
            You exited Stripe before completing payment, so your rescue plan was not booked.
            Your selections are still saved — you can finish whenever you're ready.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-900">What you can do next</h2>
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-3">
              <RefreshCw className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <span><strong>Try again.</strong> Tap Confirm in the rescue bar to reopen Stripe Checkout.</span>
            </li>
            <li className="flex gap-3">
              <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <span><strong>Need help?</strong> Reach our 24/7 ops team — we can hand-book you over the phone.</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to my rescue plan
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 text-slate-900 font-semibold text-sm hover:bg-slate-50 transition"
          >
            Contact support
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingCancelled;
