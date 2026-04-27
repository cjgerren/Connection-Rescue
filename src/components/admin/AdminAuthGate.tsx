import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Lock, ShieldCheck, Mail, KeyRound, Loader2, UserPlus, LogIn } from 'lucide-react';
import { UseAdminAuth } from '@/hooks/useAdminAuth';

interface Props {
  auth: UseAdminAuth;
  title?: string;
  subtitle?: string;
}

// Shared sign-in/sign-up UI for /admin and /admin/sms.
// Uses real database auth via the useAdminAuth hook (no localStorage allowlist).
const AdminAuthGate: React.FC<Props> = ({
  auth,
  title = 'Ops Console',
  subtitle = 'Admin-only — alerting pipeline monitor'
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const visibleError = localError || auth.error;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setInfo(null);

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setLocalError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signin') {
        const r = await auth.signIn(trimmed, password);
        if (!r.ok) setLocalError(r.error || 'Sign in failed');
      } else {
        const r = await auth.signUp(trimmed, password);
        if (!r.ok) {
          setLocalError(r.error || 'Sign up failed');
        } else if (r.needsConfirm) {
          setInfo('Check your email to confirm the account, then come back here to sign in.');
        } else {
          setInfo('Account created. Verifying admin status…');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1d3a] via-[#0d2347] to-[#0a1d3a] text-white">
      <div className="max-w-md mx-auto px-4 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-blue-200/70 hover:text-white text-sm mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to ConnectionRescue
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-600/40">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-blue-200/60 text-xs">{subtitle}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-2 mt-6 mb-5 rounded-xl border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => { setMode('signin'); setLocalError(null); setInfo(null); }}
              className={`text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                mode === 'signin' ? 'bg-purple-600 text-white shadow' : 'text-blue-200/70 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setLocalError(null); setInfo(null); }}
              className={`text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                mode === 'signup' ? 'bg-purple-600 text-white shadow' : 'text-blue-200/70 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Sign up
            </button>
          </div>

          <p className="text-blue-100 text-sm mb-5">
            {mode === 'signin'
              ? 'Sign in with database to view the live polling dashboard.'
              : 'Create an admin account. Your email must be on the admin invite list.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-blue-300/70 font-semibold flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops@connectionrescue.app"
                autoFocus
                autoComplete="email"
                className="mt-1 w-full bg-black/40 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40 rounded-lg px-4 py-3 text-white placeholder:text-blue-300/40 outline-none transition"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest text-blue-300/70 font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3 h-3" /> Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="mt-1 w-full bg-black/40 border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40 rounded-lg px-4 py-3 text-white placeholder:text-blue-300/40 outline-none transition"
              />
            </div>

            {visibleError && (
              <div className="flex items-center gap-2 text-rose-300 text-xs bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                {visibleError}
              </div>
            )}
            {info && (
              <div className="flex items-center gap-2 text-emerald-200 text-xs bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold py-3 rounded-lg shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {mode === 'signin' ? 'Sign in with database' : 'Create admin account'}
            </button>
          </form>

          <p className="text-blue-300/40 text-[11px] text-center mt-5">
            Auth backed by database · admin_users RLS policy · session persisted by database.auth, not window.localStorage.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAuthGate;
