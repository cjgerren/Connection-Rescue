// Client-side Rescue Assist gate.
// Flight status stays free. Curated flights, hotels, and lounges render only
// after this browser session records a confirmed Stripe checkout.
// This is not a server-side entitlement check and is not production-ready.

export const ASSIST_STORAGE_KEY = 'connection-rescue.assist-access.v1';

const CONFIRMED_BOOKING_STATUSES = new Set(['paid', 'confirmed', 'booked']);

export function normalizeFlightKey(flightNumber) {
  return String(flightNumber || '').trim().toUpperCase().replace(/[\s-]+/g, '');
}

export function isConfirmedCheckout(input = {}) {
  const booking = String(input.bookingStatus || '').trim().toLowerCase();
  const payment = String(input.paymentStatus || '').trim().toLowerCase();
  if (CONFIRMED_BOOKING_STATUSES.has(booking)) return true;
  // Stripe Checkout payment_status. Do not treat no_payment_required as paid.
  if (payment === 'paid') return true;
  return false;
}

export function createId() {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') return cryptoObj.randomUUID();
  return `rs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createAssistStore() {
  return {
    version: 1,
    session: { id: createId(), flightKey: null },
    confirmations: {},
  };
}

export function parseAssistStore(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !data.session?.id || typeof data.confirmations !== 'object' || !data.confirmations) {
      return null;
    }
    return {
      version: 1,
      session: {
        id: String(data.session.id),
        flightKey: data.session.flightKey ? normalizeFlightKey(data.session.flightKey) : null,
      },
      confirmations: data.confirmations,
    };
  } catch {
    return null;
  }
}

export function loadAssistStore(storage) {
  if (!storage || typeof storage.getItem !== 'function') return createAssistStore();
  return parseAssistStore(storage.getItem(ASSIST_STORAGE_KEY)) || createAssistStore();
}

export function saveAssistStore(storage, store) {
  if (!storage || typeof storage.setItem !== 'function' || !store) return;
  storage.setItem(ASSIST_STORAGE_KEY, JSON.stringify(store));
}

function isConfirmedRecord(record) {
  if (!record || record.status !== 'confirmed') return false;
  return isConfirmedCheckout({
    bookingStatus: record.bookingStatus,
    paymentStatus: record.paymentStatus,
  });
}

export function bindFlight(store, flightNumber) {
  if (!store?.session) return store;
  const flightKey = normalizeFlightKey(flightNumber);
  if (!flightKey || store.session.flightKey === flightKey) return store;
  const prior = store.confirmations?.[flightKey];
  if (prior?.rescueSessionId) {
    return { ...store, session: { id: String(prior.rescueSessionId), flightKey } };
  }
  if (!store.session.flightKey) {
    return { ...store, session: { ...store.session, flightKey } };
  }
  return { ...store, session: { id: createId(), flightKey } };
}

export function isOptionsUnlocked(store, flightNumber) {
  if (!store?.confirmations) return false;
  const flightKey = normalizeFlightKey(flightNumber) || store.session?.flightKey || '';
  if (flightKey) return isConfirmedRecord(store.confirmations[flightKey]);
  const sessionKey = store.session?.id ? `session:${store.session.id}` : '';
  return sessionKey ? isConfirmedRecord(store.confirmations[sessionKey]) : false;
}

export function rememberConfirmation(store, input = {}) {
  if (!store || !isConfirmedCheckout(input)) return store;
  const flightKey = normalizeFlightKey(input.flightKey || input.flightNumber || '');
  const rescueSessionId = String(input.rescueSessionId || store.session?.id || createId());
  const key = flightKey || `session:${rescueSessionId}`;
  const record = {
    status: 'confirmed',
    rescueSessionId,
    flightKey: flightKey || null,
    stripeSessionId: input.stripeSessionId || null,
    bookingStatus: input.bookingStatus ? String(input.bookingStatus).toLowerCase() : null,
    paymentStatus: input.paymentStatus ? String(input.paymentStatus).toLowerCase() : null,
    confirmedAt: input.confirmedAt || new Date().toISOString(),
  };
  return {
    version: 1,
    session: {
      id: rescueSessionId,
      flightKey: flightKey || store.session?.flightKey || null,
    },
    confirmations: {
      ...(store.confirmations || {}),
      [key]: record,
    },
  };
}
