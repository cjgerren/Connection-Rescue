import React, { useState } from 'react';
import LegalLayout from '@/components/legal/LegalLayout';
import { Trash2, Mail, CheckCircle, AlertCircle, Shield, Clock } from 'lucide-react';
import { useTraveler } from '@/contexts/TravelerContext';

const DataDeletion: React.FC = () => {
  const { clearProfile } = useTraveler();
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [scope, setScope] = useState<'all' | 'partial'>('all');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [localCleared, setLocalCleared] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    const subject = `Data deletion request: ${scope}`;
    const body = [
      `Email: ${email}`,
      `Scope: ${scope}`,
      '',
      'Reason:',
      reason || 'Not provided',
    ].join('\n');

    window.location.href = `mailto:privacy@connectionrescue.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus('success');
  };

  const handleLocalClear = () => {
    clearProfile();
    setLocalCleared(true);
    setTimeout(() => setLocalCleared(false), 3000);
  };

  return (
    <LegalLayout
      title="Data & Account Deletion"
      subtitle="Erase your boarding-pass profile from this device, or request full account deletion. Required by Google Play."
    >
      <h2>Quick: erase data on this device</h2>
      <p>This removes your scanned boarding pass, location grant, and preferences from this device only. Use it if you're handing
        the device to someone else or just want to start fresh. No email required.</p>
      <div className="not-prose my-6 p-6 rounded-2xl border border-slate-200 bg-slate-50">
        <button
          onClick={handleLocalClear}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
        >
          <Trash2 className="w-4 h-4" />
          Erase this device's profile
        </button>
        {localCleared && (
          <p className="mt-3 text-sm text-emerald-700 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> Local profile cleared.
          </p>
        )}
      </div>

      <h2>Full account deletion</h2>
      <p>Submit the form below to permanently delete the account associated with the email you provide. We'll:</p>
      <ul>
        <li>Confirm the request via the email on file (within 24 hours).</li>
        <li>Cancel active subscriptions and stop all notifications.</li>
        <li>Erase personal data within <strong>30 days</strong> from production systems.</li>
        <li>Purge backups within <strong>90 days</strong>.</li>
      </ul>
      <p>We are legally required to retain certain booking and tax records for up to 7 years; these are pseudonymized
        (your name and contact info are removed).</p>

      <div className="not-prose my-6 grid sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <Shield className="w-5 h-5 text-red-600 mb-2" />
          <p className="text-sm font-semibold text-slate-900">Verified</p>
          <p className="text-xs text-slate-600 mt-0.5">Email confirmation prevents abuse.</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <Clock className="w-5 h-5 text-red-600 mb-2" />
          <p className="text-sm font-semibold text-slate-900">30-day SLA</p>
          <p className="text-xs text-slate-600 mt-0.5">Production data deleted within 30 days.</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <Trash2 className="w-5 h-5 text-red-600 mb-2" />
          <p className="text-sm font-semibold text-slate-900">Backups purged</p>
          <p className="text-xs text-slate-600 mt-0.5">Encrypted backups expire in 90 days.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="not-prose space-y-4 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">Email on your account</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">What should we delete?</label>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className={`p-3 rounded-lg border cursor-pointer text-sm ${scope === 'all' ? 'border-red-600 bg-red-50' : 'border-slate-300 bg-white'}`}>
              <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} className="sr-only" />
              <p className="font-semibold text-slate-900">Everything (close account)</p>
              <p className="text-xs text-slate-600 mt-0.5">All personal data, bookings, preferences.</p>
            </label>
            <label className={`p-3 rounded-lg border cursor-pointer text-sm ${scope === 'partial' ? 'border-red-600 bg-red-50' : 'border-slate-300 bg-white'}`}>
              <input type="radio" name="scope" checked={scope === 'partial'} onChange={() => setScope('partial')} className="sr-only" />
              <p className="font-semibold text-slate-900">Boarding-pass scans only</p>
              <p className="text-xs text-slate-600 mt-0.5">Keep account, erase scan history.</p>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Helps us improve the app."
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white font-semibold hover:from-red-700 hover:to-red-900 transition disabled:opacity-60"
        >
          {status === 'loading' ? 'Submitting…' : status === 'success' ? 'Request received' : 'Submit deletion request'}
        </button>

        {status === 'success' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Got it. Check your inbox for a confirmation link within 24 hours. After confirmation, deletion completes within 30 days.</p>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Something went wrong. Email <a href="mailto:privacy@connectionrescue.app" className="underline">privacy@connectionrescue.app</a> directly.</p>
          </div>
        )}
      </form>

      <h2>Other ways to reach us</h2>
      <p>
        Email: <a href="mailto:privacy@connectionrescue.app">privacy@connectionrescue.app</a><br />
        Mail: ConnectionRescue, Inc., 1209 Orange Street, Wilmington, DE 19801, USA
      </p>
      <p>We respond to all requests within 30 days as required by GDPR, CCPA, and Google Play User Data policy.</p>
    </LegalLayout>
  );
};

export default DataDeletion;
