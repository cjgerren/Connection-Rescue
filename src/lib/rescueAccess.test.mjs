import assert from 'node:assert/strict';
import {
  bindFlight,
  createAssistStore,
  isConfirmedCheckout,
  isOptionsUnlocked,
  normalizeFlightKey,
  parseAssistStore,
  rememberConfirmation,
} from './rescueAccess.mjs';
import { flightHandoffUrl, hotelHandoffUrl, loungeHandoffUrl } from './handoff.mjs';

const store = createAssistStore();
store.session.flightKey = 'AA2487';

assert.equal(normalizeFlightKey(' aa 2487 '), 'AA2487');
assert.equal(isConfirmedCheckout({}), false);
assert.equal(isConfirmedCheckout({ bookingStatus: 'pending', paymentStatus: 'unpaid' }), false);
assert.equal(isConfirmedCheckout({ bookingStatus: 'open' }), false);
assert.equal(isConfirmedCheckout({ paymentStatus: 'no_payment_required' }), false);
assert.equal(isConfirmedCheckout({ bookingStatus: 'confirmed' }), true);
assert.equal(isConfirmedCheckout({ bookingStatus: 'paid' }), true);
assert.equal(isConfirmedCheckout({ bookingStatus: 'booked' }), true);
assert.equal(isConfirmedCheckout({ paymentStatus: 'paid' }), true);
assert.equal(isOptionsUnlocked(store, 'AA2487'), false);

const pending = rememberConfirmation(store, {
  flightKey: 'AA2487',
  rescueSessionId: store.session.id,
  bookingStatus: 'pending',
  paymentStatus: 'unpaid',
  stripeSessionId: 'cs_test_pending',
});
assert.equal(pending, store);
assert.equal(isOptionsUnlocked(pending, 'AA2487'), false);

const paid = rememberConfirmation(store, {
  flightKey: 'AA 2487',
  rescueSessionId: 'session-aa',
  bookingStatus: 'confirmed',
  paymentStatus: 'paid',
  stripeSessionId: 'cs_test_paid',
});
assert.equal(isOptionsUnlocked(paid, 'AA2487'), true);
assert.equal(isOptionsUnlocked(paid, 'UA100'), false);

const stripeOnly = rememberConfirmation(store, {
  flightKey: 'DL404',
  rescueSessionId: 'session-dl',
  bookingStatus: null,
  paymentStatus: 'paid',
  stripeSessionId: 'cs_test_stripe_only',
});
assert.equal(isOptionsUnlocked(stripeOnly, 'DL404'), true);

const switched = bindFlight(paid, 'UA 100');
assert.equal(switched.session.flightKey, 'UA100');
assert.notEqual(switched.session.id, paid.session.id);
assert.equal(isOptionsUnlocked(switched, 'UA100'), false);
assert.equal(isOptionsUnlocked(bindFlight(switched, 'AA2487'), 'AA2487'), true);

const tampered = parseAssistStore(JSON.stringify({
  version: 1,
  session: { id: 'x', flightKey: 'AA2487' },
  confirmations: {
    AA2487: { status: 'confirmed', bookingStatus: 'requires_payment', paymentStatus: 'unpaid' },
  },
}));
assert.equal(isOptionsUnlocked(tampered, 'AA2487'), false);
assert.equal(parseAssistStore('not-json'), null);
assert.equal(parseAssistStore(JSON.stringify({ version: 2, session: { id: 'x' }, confirmations: {} })), null);

const flightUrl = flightHandoffUrl({ carrier: 'American Airlines', flightNum: 'AA 1192', from: 'ORD', to: 'LGA' });
const hotelUrl = hotelHandoffUrl({ name: 'Hilton OHare', airport: 'ORD' });
const loungeUrl = loungeHandoffUrl({ name: 'Admirals Club', terminal: 'Terminal 3', airport: 'ORD' });
assert.match(flightUrl, /^https:\/\/www\.google\.com\/travel\/flights\?/);
assert.match(hotelUrl, /^https:\/\/www\.google\.com\/travel\/hotels\?/);
assert.match(loungeUrl, /^https:\/\/www\.google\.com\/maps\/search\/\?/);
assert.equal(flightUrl.includes('sk_live'), false);
assert.equal(flightUrl.includes('sk_test'), false);

console.log('rescue access gate tests passed');
