export function getAirlineName(flightNumber = '') {
  const code = String(flightNumber).toUpperCase();

  if (code.startsWith('AA')) return 'American Airlines';
  if (code.startsWith('DL')) return 'Delta Air Lines';
  if (code.startsWith('UA')) return 'United Airlines';
  if (code.startsWith('WN')) return 'Southwest Airlines';
  if (code.startsWith('B6')) return 'JetBlue';
  if (code.startsWith('AS')) return 'Alaska Airlines';
  if (code.startsWith('NK')) return 'Spirit Airlines';
  if (code.startsWith('F9')) return 'Frontier Airlines';

  return 'Tracked Flight';
}
