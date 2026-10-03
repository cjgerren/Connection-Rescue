// Public deep links only. ConnectionRescue does not book the ticket, room, or pass.

export function flightHandoffUrl({ flightNum, from, to, carrier } = {}) {
  const query = [
    carrier,
    flightNum ? `flight ${flightNum}` : '',
    from && to ? `from ${from} to ${to}` : '',
  ].filter(Boolean).join(' ');
  const params = new URLSearchParams({ q: query || 'flights' });
  return `https://www.google.com/travel/flights?${params.toString()}`;
}

export function hotelHandoffUrl({ name, airport } = {}) {
  const query = [name, airport ? `near ${airport}` : ''].filter(Boolean).join(' ');
  const params = new URLSearchParams({ q: query || 'airport hotel' });
  return `https://www.google.com/travel/hotels?${params.toString()}`;
}

export function loungeHandoffUrl({ name, terminal, airport } = {}) {
  const query = [name, terminal, airport].filter(Boolean).join(' ');
  const params = new URLSearchParams({ api: '1', query: query || 'airport lounge' });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}
