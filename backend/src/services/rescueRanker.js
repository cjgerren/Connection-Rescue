// rescueRanker — turns a raw list of Duffel offers into "rescue options"
// the traveler can actually choose from.
//
// Inputs:  Duffel offers (from /air/offer_requests), the original disrupted
//          flight context (origin, destination, scheduled arrival), and a
//          set of "nearby" airports that count as acceptable substitutes.
//
// Outputs: a normalized RescueOption[] array, each annotated with a score
//          and labels for the four hero categories the product surfaces:
//            • best       — overall winner (weighted score)
//            • fastest    — earliest arrival at destination (or nearby)
//            • cheapest   — lowest extra cost
//            • lowestStress — fewest connections, longest layovers, most seats
//
// Ranking factors (in priority order from the spec):
//   1. Earliest arrival
//   2. Same destination airport
//   3. Nearby airport acceptable
//   4. Lowest extra cost
//   5. Fewest connections
//   6. Enough connection time (>= 45 min)
//   7. Seat availability

const DEFAULT_NEARBY = {
  LGA: ['JFK', 'EWR', 'HPN', 'ISP'],
  JFK: ['LGA', 'EWR', 'HPN'],
  EWR: ['LGA', 'JFK', 'HPN'],
  ORD: ['MDW', 'RFD'],
  MDW: ['ORD', 'RFD'],
  LAX: ['BUR', 'LGB', 'SNA', 'ONT'],
  SFO: ['OAK', 'SJC'],
  DCA: ['IAD', 'BWI'],
  IAD: ['DCA', 'BWI'],
  BWI: ['DCA', 'IAD'],
  BOS: ['MHT', 'PVD'],
  DFW: ['DAL'],
  DAL: ['DFW'],
  HOU: ['IAH'],
  IAH: ['HOU'],
  MIA: ['FLL', 'PBI'],
  FLL: ['MIA', 'PBI'],
};

const MIN_CONNECTION_MIN = 45;
const SEATS_FLOOR = 1;

function minutesBetween(a, b) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

function normalizeOffer(offer, ctx) {
  const slice = offer.slices?.[0];
  if (!slice) return null;
  const segments = slice.segments || [];
  if (!segments.length) return null;

  const first = segments[0];
  const last = segments[segments.length - 1];
  const depart = first.departing_at;
  const arrive = last.arriving_at;

  // Layover sanity — sum of gaps between segments
  const layovers = [];
  for (let i = 0; i < segments.length - 1; i++) {
    layovers.push(minutesBetween(segments[i].arriving_at, segments[i + 1].departing_at));
  }
  const minLayover = layovers.length ? Math.min(...layovers) : null;
  const tightConnection = minLayover !== null && minLayover < MIN_CONNECTION_MIN;

  const arrivesAt = last.destination?.iata_code || ctx.destination;
  const sameDest = arrivesAt === ctx.destination;
  const nearby = (ctx.nearby || []).includes(arrivesAt);
  const acceptableDest = sameDest || nearby;

  const totalAmount = parseFloat(offer.total_amount || '0');
  const seatsLeft =
    offer.available_services?.length ??
    offer.passenger_count ??
    SEATS_FLOOR; // Duffel doesn't always expose; default to 1 so it doesn't filter out

  return {
    id: offer.id,
    offerId: offer.id,
    flightNum: segments.map((s) => `${s.marketing_carrier?.iata_code || ''}${s.marketing_carrier_flight_number || ''}`).join(' + '),
    carrier: first.marketing_carrier?.name || first.operating_carrier?.name || 'Unknown',
    carrierIata: first.marketing_carrier?.iata_code,
    from: first.origin?.iata_code,
    to: arrivesAt,
    toCity: last.destination?.city_name || last.destination?.name || arrivesAt,
    depart,
    arrive,
    durationMin: minutesBetween(depart, arrive),
    connections: Math.max(0, segments.length - 1),
    minLayoverMin: minLayover,
    tightConnection,
    seatsLeft,
    price: totalAmount,
    currency: offer.total_currency || 'USD',
    sameDest,
    nearbyDest: nearby,
    acceptableDest,
    raw: offer,
  };
}

/**
 * Score lower = better. Each factor maps to a small additive penalty so a
 * cheap, fast, nonstop, on-destination flight crushes everything else.
 */
function scoreOption(o, ctx) {
  let score = 0;

  // 1. Earliest arrival vs original scheduled arrival (or "now" if unknown).
  const targetArrive = ctx.originalArrivalISO ? new Date(ctx.originalArrivalISO).getTime() : Date.now();
  const arriveDelta = (new Date(o.arrive).getTime() - targetArrive) / 60000; // minutes late
  score += Math.max(0, arriveDelta) * 1.0; // 1 point per minute late

  // 2. Same destination >> nearby >> wrong city
  if (!o.acceptableDest) score += 10_000;
  else if (!o.sameDest) score += 60; // ~1h equivalent penalty

  // 4. Cost (Duffel returns USD-equivalent total)
  score += o.price * 2; // $1 ~= 2 minutes

  // 5. Connections
  score += o.connections * 45;

  // 6. Tight connection penalty
  if (o.tightConnection) score += 90;

  // 7. Low-seat warning (encourages booking, but only mildly)
  if (o.seatsLeft <= 2) score += 20;

  return score;
}

/**
 * @param {Array} offers       Duffel offers
 * @param {Object} ctx
 * @param {string} ctx.origin           e.g. 'ORD'
 * @param {string} ctx.destination      e.g. 'LGA'
 * @param {string} [ctx.originalArrivalISO]
 * @param {string[]} [ctx.nearby]       overrides default nearby list
 */
export function rankOffers(offers, ctx) {
  const nearby = ctx.nearby || DEFAULT_NEARBY[ctx.destination] || [];
  const enrichedCtx = { ...ctx, nearby };

  const normalized = offers
    .map((o) => normalizeOffer(o, enrichedCtx))
    .filter(Boolean)
    .filter((o) => o.acceptableDest)        // drop "wrong city" entirely
    .filter((o) => o.seatsLeft >= SEATS_FLOOR);

  for (const o of normalized) o.score = scoreOption(o, enrichedCtx);

  const ranked = [...normalized].sort((a, b) => a.score - b.score);

  // Award category badges
  const fastest = [...normalized].sort(
    (a, b) => new Date(a.arrive) - new Date(b.arrive),
  )[0];
  const cheapest = [...normalized].sort((a, b) => a.price - b.price)[0];
  const lowestStress = [...normalized].sort((a, b) => {
    if (a.connections !== b.connections) return a.connections - b.connections;
    if (a.tightConnection !== b.tightConnection) return a.tightConnection ? 1 : -1;
    return b.seatsLeft - a.seatsLeft;
  })[0];

  const best = ranked[0];

  for (const o of ranked) {
    o.badges = [];
    if (best && o.id === best.id) o.badges.push('best');
    if (fastest && o.id === fastest.id) o.badges.push('fastest');
    if (cheapest && o.id === cheapest.id) o.badges.push('cheapest');
    if (lowestStress && o.id === lowestStress.id) o.badges.push('lowestStress');
  }

  return {
    options: ranked,
    bestId: best?.id || null,
    fastestId: fastest?.id || null,
    cheapestId: cheapest?.id || null,
    lowestStressId: lowestStress?.id || null,
  };
}
