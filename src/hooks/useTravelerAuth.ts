import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface UseTravelerAuth {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  travelerEmail: string | null;
  signInWithOtp: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

export function useTravelerAuth(): UseTravelerAuth {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const booted = useRef(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      } catch (e: any) {
        setError(e?.message || 'Failed to restore traveler session');
      } finally {
        booted.current = true;
        setLoading(false);
      }

      const sub = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession ?? null);
        setUser(nextSession?.user ?? null);
      });
      unsub = () => sub.data.subscription.unsubscribe();
    })();

    return () => {
      unsub?.();
    };
  }, []);

  const signInWithOtp = useCallback(async (email: string) => {
    setError(null);
    const trimmed = email.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/alerts`,
      },
    });

    if (error) {
      setError(error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    if (!booted.current) return;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setError(null);
  }, []);

  return {
    session,
    user,
    loading,
    error,
    travelerEmail: user?.email ?? null,
    signInWithOtp,
    signOut,
  };
}
