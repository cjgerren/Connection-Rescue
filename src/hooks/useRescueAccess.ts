import { useEffect, useState } from 'react';
import {
  ASSIST_STORAGE_KEY,
  bindFlight,
  isOptionsUnlocked,
  loadAssistStore,
  normalizeFlightKey,
  saveAssistStore,
} from '@/lib/rescueAccess.mjs';

export function useRescueAccess(flightNumber?: string | null) {
  const flightKey = normalizeFlightKey(flightNumber || '');
  const [store, setStore] = useState(() =>
    loadAssistStore(typeof window === 'undefined' ? null : window.localStorage),
  );

  useEffect(() => {
    setStore((current) => bindFlight(current, flightKey));
  }, [flightKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    saveAssistStore(window.localStorage, store);
  }, [store]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refresh = (event?: StorageEvent) => {
      if (event && event.key && event.key !== ASSIST_STORAGE_KEY) return;
      setStore(bindFlight(loadAssistStore(window.localStorage), flightKey));
    };
    const onFocus = () => refresh();
    const onStorage = (event: Event) => refresh(event as StorageEvent);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [flightKey]);

  return {
    unlocked: isOptionsUnlocked(store, flightKey),
    flightKey,
    sessionId: store?.session?.id || '',
  };
}
