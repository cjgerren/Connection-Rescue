export type AirportInfo = {
  code: string;
  name: string;
  city: string;
  state?: string;
  lat: number;
  lng: number;
};

export const AIRPORTS: AirportInfo[] = [
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', state: 'GA', lat: 33.6407, lng: -84.4277 },
  { code: 'AUS', name: 'Austin-Bergstrom International', city: 'Austin', state: 'TX', lat: 30.1975, lng: -97.6664 },
  { code: 'BNA', name: 'Nashville International', city: 'Nashville', state: 'TN', lat: 36.1263, lng: -86.6774 },
  { code: 'BOS', name: 'Boston Logan International', city: 'Boston', state: 'MA', lat: 42.3656, lng: -71.0096 },
  { code: 'BWI', name: 'Baltimore/Washington International', city: 'Baltimore', state: 'MD', lat: 39.1774, lng: -76.6684 },
  { code: 'CLT', name: 'Charlotte Douglas International', city: 'Charlotte', state: 'NC', lat: 35.214, lng: -80.9431 },
  { code: 'DCA', name: 'Ronald Reagan Washington National', city: 'Washington', state: 'DC', lat: 38.8512, lng: -77.0402 },
  { code: 'DEN', name: 'Denver International', city: 'Denver', state: 'CO', lat: 39.8561, lng: -104.6737 },
  { code: 'DFW', name: 'Dallas Fort Worth International', city: 'Dallas-Fort Worth', state: 'TX', lat: 32.8998, lng: -97.0403 },
  { code: 'DTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit', state: 'MI', lat: 42.2162, lng: -83.3554 },
  { code: 'EWR', name: 'Newark Liberty International', city: 'Newark', state: 'NJ', lat: 40.6895, lng: -74.1745 },
  { code: 'FLL', name: 'Fort Lauderdale-Hollywood International', city: 'Fort Lauderdale', state: 'FL', lat: 26.0726, lng: -80.1527 },
  { code: 'HNL', name: 'Daniel K. Inouye International', city: 'Honolulu', state: 'HI', lat: 21.3187, lng: -157.9225 },
  { code: 'IAD', name: 'Washington Dulles International', city: 'Washington', state: 'DC', lat: 38.9531, lng: -77.4565 },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', state: 'TX', lat: 29.9902, lng: -95.3368 },
  { code: 'IND', name: 'Indianapolis International', city: 'Indianapolis', state: 'IN', lat: 39.7173, lng: -86.2944 },
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', state: 'NY', lat: 40.6413, lng: -73.7781 },
  { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', state: 'NV', lat: 36.084, lng: -115.1537 },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', state: 'CA', lat: 33.9416, lng: -118.4085 },
  { code: 'LGA', name: 'LaGuardia', city: 'New York', state: 'NY', lat: 40.7769, lng: -73.874 },
  { code: 'MCO', name: 'Orlando International', city: 'Orlando', state: 'FL', lat: 28.4312, lng: -81.3081 },
  { code: 'MIA', name: 'Miami International', city: 'Miami', state: 'FL', lat: 25.7959, lng: -80.287 },
  { code: 'MSP', name: 'Minneapolis-Saint Paul International', city: 'Minneapolis-Saint Paul', state: 'MN', lat: 44.8848, lng: -93.2223 },
  { code: 'ORD', name: "Chicago O'Hare International", city: 'Chicago', state: 'IL', lat: 41.9742, lng: -87.9073 },
  { code: 'PDX', name: 'Portland International', city: 'Portland', state: 'OR', lat: 45.5898, lng: -122.5951 },
  { code: 'PHL', name: 'Philadelphia International', city: 'Philadelphia', state: 'PA', lat: 39.8744, lng: -75.2424 },
  { code: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', state: 'AZ', lat: 33.4352, lng: -112.0101 },
  { code: 'SAN', name: 'San Diego International', city: 'San Diego', state: 'CA', lat: 32.7338, lng: -117.1933 },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', state: 'WA', lat: 47.4502, lng: -122.3088 },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', state: 'CA', lat: 37.6213, lng: -122.379 },
  { code: 'SLC', name: 'Salt Lake City International', city: 'Salt Lake City', state: 'UT', lat: 40.7899, lng: -111.9791 },
  { code: 'TPA', name: 'Tampa International', city: 'Tampa', state: 'FL', lat: 27.9755, lng: -82.5332 },
];

const airportByCode = new Map(AIRPORTS.map((airport) => [airport.code, airport]));

export function getAirportInfo(code: string | null | undefined) {
  const normalized = String(code || '').trim().toUpperCase();
  return airportByCode.get(normalized) || null;
}

export function getAirportCity(code: string | null | undefined, fallback = '') {
  return getAirportInfo(code)?.city || fallback;
}

function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radiusMiles = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusMiles * Math.asin(Math.sqrt(h));
}

export function nearestAirport(location: { lat: number; lng: number } | null | undefined) {
  if (!location) return null;
  return AIRPORTS.reduce<{ airport: AirportInfo; miles: number } | null>((best, airport) => {
    const miles = distanceMiles(location, airport);
    if (!best || miles < best.miles) return { airport, miles };
    return best;
  }, null);
}
