import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Real database-backed admin auth.
// ---------------------------------
// Replaces the previous hardcoded ADMIN_EMAILS / localStorage allowlist.
// Flow:
//   1. supabase.auth manages the session (persisted in supabase's own storage,
//      NOT window.localStorage — it survives reloads and refresh-token rotation).
//   2. After we have a session, we call the verify-admin edge function which
//      checks the admin_invites table (server-side, service role) and upserts
//      an admin_users row for the user. This row is RLS-restricted so the user
//      can only ever see their own.
//   3. We also do a client-side sanity check: select from admin_users where
//      user_id = auth.uid(). RLS guarantees we only get a row back if the
//      logged-in user is in fact an admin.
//
// Returns { session, user, isAdmin, loading, error, signIn, signUp, signOut }.

export interface UseAdminAuth {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isOwner: boolean;
  role: 'admin' | 'owner' | null;
  loading: boolean;
  error: string | null;
  adminEmail: string | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ ok: boolean; error?: string; needsConfirm?: boolean }>;
  signOut: () => Promise<void>;
  refreshAdminStatus: () => Promise<void>;
}

export function useAdminAuth(): UseAdminAuth {
  const [session, setSession] = useState<Session | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<'admin' | 'owner' | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const lastVerifiedFor = useRef<string | null>(null);

  const verifyAdmin = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setIsAdmin(false);
      setAdminEmail(null);
      setRole(null);
      lastVerifiedFor.current = null;
      return;
    }
    // Avoid re-verifying for the same user repeatedly
    if (lastVerifiedFor.current === s.user.id) return;
    lastVerifiedFor.current = s.user.id;

    try {
      // Step 1: server-side promote-or-check via edge function
      const { data: vData, error: vErr } = await supabase.functions.invoke('verify-admin', {
        body: {}
      });
      if (vErr) {
        console.warn('verify-admin invoke error', vErr);
      }

      // Step 2: client-side sanity check using RLS — auth.uid() must match user_id
      const { data: row } = await supabase
        .from('admin_users')
        .select('email, role')
        .eq('user_id', s.user.id)
        .maybeSingle();

      const ok = !!row || !!vData?.isAdmin;
      setIsAdmin(ok);
      const resolvedRole = (row?.role || vData?.role || null) as 'admin' | 'owner' | null;
      setRole(resolvedRole);
      setAdminEmail(row?.email || vData?.email || s.user.email || null);
      if (!ok) {
        setError('This account is not on the admin allowlist.');
      } else {
        setError(null);
      }
    } catch (e: any) {
      console.error('verifyAdmin failed', e);
      setIsAdmin(false);
      setRole(null);
      setError(e?.message || 'Failed to verify admin status');
    }
  }, []);


  // Boot: read existing session + subscribe
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const s = data.session ?? null;
        setSession(s);
        setUser(s?.user ?? null);
        await verifyAdmin(s);
      } catch (e: any) {
        setError(e?.message || 'Auth init failed');
      } finally {
        setLoading(false);
      }
      const sub = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s ?? null);
        setUser(s?.user ?? null);
        // Defer verification so React state settles
        setTimeout(() => { verifyAdmin(s ?? null); }, 0);
      });
      unsub = () => sub?.data?.subscription?.unsubscribe?.();
    })();
    return () => { unsub?.(); };
  }, [verifyAdmin]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    if (error) {
      setError(error.message);
      return { ok: false, error: error.message };
    }
    setSession(data.session);
    setUser(data.user);
    lastVerifiedFor.current = null;
    await verifyAdmin(data.session);
    return { ok: true };
  }, [verifyAdmin]);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({ email: trimmed, password });
    if (error) {
      setError(error.message);
      return { ok: false, error: error.message };
    }
    // If email confirmation is required, session will be null
    const needsConfirm = !data.session;
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      lastVerifiedFor.current = null;
      await verifyAdmin(data.session);
    }
    return { ok: true, needsConfirm };
  }, [verifyAdmin]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setRole(null);
    setAdminEmail(null);
    lastVerifiedFor.current = null;
  }, []);

  const refreshAdminStatus = useCallback(async () => {
    lastVerifiedFor.current = null;
    await verifyAdmin(session);
  }, [session, verifyAdmin]);

  return {
    session,
    user,
    isAdmin,
    isOwner: role === 'owner',
    role,
    loading,
    error,
    adminEmail,
    signIn,
    signUp,
    signOut,
    refreshAdminStatus
  };
}

