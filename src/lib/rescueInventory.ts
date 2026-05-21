import {
  ALTERNATE_FLIGHTS,
  HOTELS,
  LOUNGES,
  ORIGINAL_FLIGHT,
  type Flight,
  type Hotel,
  type Lounge,
} from '@/data/rescueData';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type OptionType = 'flight' | 'hotel' | 'lounge';

type CoverageSource = 'supabase' | 'fallback';

export type RescueInventory = {
  flights: Flight[];
  hotels: Hotel[];
  lounges: Lounge[];
  source: CoverageSource;
  coverage: {
    flights: CoverageSource;
    hotels: CoverageSource;
    lounges: CoverageSource;
  };
  warnings: string[];
};

type InventoryRow = {
  option_type: OptionType;
  option_key: string;
  sort_order: number | null;
  payload: unknown;
};

type InventoryArgs = {
  airportIata: string | null | undefined;
  destinationIata: string | null | undefined;
  destinationCity: string | null | undefined;
};

function normalizeIata(value: string | null | undefined, fallback = '') {
  const normalized = String(value || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readText(record: Record<string, unknown>, key: string, fallback = '') {
  const value = record[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function readNumber(record: Record<string, unknown>, key: string, fallback = 0) {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function readBoolean(record: Record<string, unknown>, key: string, fallback = false) {
  const value = record[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return fallback;
}

function readStringArray(record: Record<string, unknown>, key: string, fallback: string[] = []) {
  const value = record[key];
  if (!Array.isArray(value)) return fallback;
  const out = value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  return out.length ? out : fallback;
}

function buildFallbackFlights(origin: string, destination: string, destinationLabel: string) {
  return ALTERNATE_FLIGHTS.map((flight) => {
    const sameDest = flight.sameDest ?? flight.id === 'f3';
    return {
      ...flight,
      from: origin,
      to: sameDest ? destination : flight.to,
      toCity: sameDest ? destinationLabel : flight.toCity,
      sameDest,
      source: 'mock' as const,
      distanceFromDest: sameDest ? 'Original destination' : flight.distanceFromDest,
    };
  });
}

function mapFlightRow(
  row: InventoryRow,
  index: number,
  origin: string,
  destination: string,
  destinationLabel: string,
): Flight {
  const fallback = buildFallbackFlights(origin, destination, destinationLabel)[index % ALTERNATE_FLIGHTS.length];
  const payload = asRecord(row.payload);
  const sameDest = readBoolean(payload, 'sameDest', readBoolean(payload, 'isExactDestination', fallback.sameDest ?? false));
  const to = sameDest ? destination : normalizeIata(readText(payload, 'to', fallback.to), fallback.to);

  return {
    ...fallback,
    id: `inv-${origin}-${row.option_key}`,
    flightNum: readText(payload, 'flightNum', fallback.flightNum),
    carrier: readText(payload, 'carrier', fallback.carrier),
    from: normalizeIata(readText(payload, 'from', origin), origin),
    to,
    toCity: sameDest ? destinationLabel : readText(payload, 'toCity', fallback.toCity),
    depart: readText(payload, 'depart', fallback.depart),
    arrive: readText(payload, 'arrive', fallback.arrive),
    duration: readText(payload, 'duration', fallback.duration),
    seatsLeft: Math.max(0, Math.round(readNumber(payload, 'seatsLeft', fallback.seatsLeft))),
    price: Math.max(0, readNumber(payload, 'price', fallback.price)),
    status: readText(payload, 'status', fallback.status),
    distanceFromDest: sameDest
      ? 'Original destination'
      : readText(payload, 'distanceFromDest', fallback.distanceFromDest || 'Nearby airport option'),
    connections: Math.max(0, Math.round(readNumber(payload, 'connections', fallback.connections || 0))),
    offerId: readText(payload, 'offerId', fallback.offerId || '') || undefined,
    runId: readText(payload, 'runId', fallback.runId || '') || undefined,
    totalAmount: readText(payload, 'totalAmount', fallback.totalAmount || '') || undefined,
    currency: readText(payload, 'currency', fallback.currency || 'usd'),
    sameDest,
    source: 'live',
  };
}

function mapHotelRow(row: InventoryRow, index: number): Hotel {
  const fallback = HOTELS[index % HOTELS.length];
  const payload = asRecord(row.payload);

  return {
    ...fallback,
    id: `inv-${row.option_key}`,
    name: readText(payload, 'name', fallback.name),
    distance: readText(payload, 'distance', fallback.distance),
    shuttle: readText(payload, 'shuttle', fallback.shuttle),
    rating: Math.max(0, Math.min(5, readNumber(payload, 'rating', fallback.rating))),
    amenities: readStringArray(payload, 'amenities', fallback.amenities),
    retailPrice: Math.max(0, readNumber(payload, 'retailPrice', fallback.retailPrice)),
    airlineRate: Math.max(0, readNumber(payload, 'airlineRate', fallback.airlineRate)),
    voucherCovered: readBoolean(payload, 'voucherCovered', fallback.voucherCovered),
    image: readText(payload, 'image', fallback.image),
  };
}

function normalizeCapacity(value: string, fallback: Lounge['capacity']) {
  if (value === 'Light' || value === 'Moderate' || value === 'Busy') return value;
  return fallback;
}

function mapLoungeRow(row: InventoryRow, index: number): Lounge {
  const fallback = LOUNGES[index % LOUNGES.length];
  const payload = asRecord(row.payload);

  return {
    ...fallback,
    id: `inv-${row.option_key}`,
    name: readText(payload, 'name', fallback.name),
    terminal: readText(payload, 'terminal', fallback.terminal),
    gate: readText(payload, 'gate', fallback.gate),
    walkTime: readText(payload, 'walkTime', fallback.walkTime),
    amenities: readStringArray(payload, 'amenities', fallback.amenities),
    memberAccess: readStringArray(payload, 'memberAccess', fallback.memberAccess),
    dayPass: Math.max(0, readNumber(payload, 'dayPass', fallback.dayPass)),
    rating: Math.max(0, Math.min(5, readNumber(payload, 'rating', fallback.rating))),
    capacity: normalizeCapacity(readText(payload, 'capacity', fallback.capacity), fallback.capacity),
    image: readText(payload, 'image', fallback.image),
  };
}

function fallbackInventory(origin: string, destination: string, destinationLabel: string): RescueInventory {
  return {
    flights: buildFallbackFlights(origin, destination, destinationLabel),
    hotels: HOTELS,
    lounges: LOUNGES,
    source: 'fallback',
    coverage: {
      flights: 'fallback',
      hotels: 'fallback',
      lounges: 'fallback',
    },
    warnings: [],
  };
}

export async function fetchRescueInventory(args: InventoryArgs): Promise<RescueInventory> {
  const origin = normalizeIata(args.airportIata, ORIGINAL_FLIGHT.from);
  const destination = normalizeIata(args.destinationIata, ORIGINAL_FLIGHT.to);
  const destinationLabel = String(args.destinationCity || '').trim() || ORIGINAL_FLIGHT.toCity;
  const fallback = fallbackInventory(origin, destination, destinationLabel);

  if (!isSupabaseConfigured) {
    return {
      ...fallback,
      warnings: ['Supabase is not configured. Showing fallback rescue inventory.'],
    };
  }

  const { data, error } = await supabase
    .from('airport_rescue_inventory')
    .select('option_type, option_key, sort_order, payload')
    .eq('airport_iata', origin)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return {
      ...fallback,
      warnings: [`SaaS inventory lookup failed for ${origin}: ${error.message}`],
    };
  }

  const rows = (data || []) as InventoryRow[];
  if (!rows.length) {
    return {
      ...fallback,
      warnings: [`No SaaS inventory found for ${origin}. Showing fallback options.`],
    };
  }

  const flightRows = rows.filter((row) => row.option_type === 'flight');
  const hotelRows = rows.filter((row) => row.option_type === 'hotel');
  const loungeRows = rows.filter((row) => row.option_type === 'lounge');

  const flights = flightRows.length
    ? flightRows.map((row, index) => mapFlightRow(row, index, origin, destination, destinationLabel))
    : fallback.flights;
  const hotels = hotelRows.length
    ? hotelRows.map((row, index) => mapHotelRow(row, index))
    : fallback.hotels;
  const lounges = loungeRows.length
    ? loungeRows.map((row, index) => mapLoungeRow(row, index))
    : fallback.lounges;

  const warnings: string[] = [];
  if (!flightRows.length) warnings.push(`Flight inventory for ${origin} missing in SaaS; using fallback flights.`);
  if (!hotelRows.length) warnings.push(`Hotel inventory for ${origin} missing in SaaS; using fallback hotels.`);
  if (!loungeRows.length) warnings.push(`Lounge inventory for ${origin} missing in SaaS; using fallback lounges.`);

  return {
    flights,
    hotels,
    lounges,
    source: 'supabase',
    coverage: {
      flights: flightRows.length ? 'supabase' : 'fallback',
      hotels: hotelRows.length ? 'supabase' : 'fallback',
      lounges: loungeRows.length ? 'supabase' : 'fallback',
    },
    warnings,
  };
}
