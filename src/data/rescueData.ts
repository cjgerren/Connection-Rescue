export const HERO_IMG = 'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236273224_00866fb9.jpg';
export const PLANE_IMG = 'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236513946_c03aa8b8.png';

export const LOUNGE_IMAGES = [
  'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236291491_9b5cb101.jpg',
  'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236315200_89ffd784.png',
  'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236298193_48700a10.png',
  'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236294287_77d1d78f.jpg',
];

export const HOTEL_IMAGES = [
  'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236332640_cbceb852.jpg',
  'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236400005_badf2795.png',
  'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236457610_1832d9f8.jpg',
];

export type Flight = {
  id: string;
  flightNum: string;
  carrier: string;
  from: string;
  to: string;
  toCity: string;
  depart: string;
  arrive: string;
  duration: string;
  seatsLeft: number;
  price: number;
  status: string;
  distanceFromDest?: string;
  connections?: number;
  offerId?: string;
  runId?: string | null;
  totalAmount?: string;
  currency?: string;
  sameDest?: boolean;
  source?: 'mock' | 'live';
};

export const ORIGINAL_FLIGHT = {
  flightNum: 'AA 2487',
  from: 'ORD',
  to: 'LGA',
  toCity: 'New York',
  scheduled: '6:45 PM',
  status: 'CANCELED' as const,
  reason: 'Severe weather at destination',
  gate: 'H12',
};

export const ALTERNATE_FLIGHTS: Flight[] = [
  {
    id: 'f1',
    flightNum: 'AA 1192',
    carrier: 'American Airlines',
    from: 'ORD',
    to: 'JFK',
    toCity: 'New York',
    depart: '8:20 PM',
    arrive: '11:38 PM',
    duration: '2h 18m',
    seatsLeft: 4,
    price: 0,
    status: 'On Time',
    distanceFromDest: '12 mi from LGA',
    source: 'mock',
  },
  {
    id: 'f2',
    flightNum: 'AA 0734',
    carrier: 'American Airlines',
    from: 'ORD',
    to: 'EWR',
    toCity: 'Newark',
    depart: '9:05 PM',
    arrive: '12:24 AM',
    duration: '2h 19m',
    seatsLeft: 11,
    price: 0,
    status: 'Boarding',
    distanceFromDest: '18 mi from LGA',
    source: 'mock',
  },
  {
    id: 'f3',
    flightNum: 'AA 2210',
    carrier: 'American Airlines',
    from: 'ORD',
    to: 'LGA',
    toCity: 'New York',
    depart: '6:15 AM (next day)',
    arrive: '9:32 AM',
    duration: '2h 17m',
    seatsLeft: 22,
    price: 0,
    status: 'On Time',
    distanceFromDest: 'Original destination',
    source: 'mock',
  },
  {
    id: 'f4',
    flightNum: 'AA 4421',
    carrier: 'American Eagle',
    from: 'ORD',
    to: 'HPN',
    toCity: 'White Plains',
    depart: '7:50 PM',
    arrive: '11:02 PM',
    duration: '2h 12m',
    seatsLeft: 2,
    price: 89,
    status: 'Delayed',
    distanceFromDest: '24 mi from LGA',
    source: 'mock',
  },
];

export type Lounge = {
  id: string;
  name: string;
  terminal: string;
  gate: string;
  walkTime: string;
  amenities: string[];
  memberAccess: string[];
  dayPass: number;
  rating: number;
  capacity: 'Light' | 'Moderate' | 'Busy';
  image: string;
};

export const LOUNGES: Lounge[] = [
  {
    id: 'l1',
    name: 'Admirals Club',
    terminal: 'Terminal 3',
    gate: 'Near Gate H6',
    walkTime: '3 min walk',
    amenities: ['Premium Bar', 'Hot Buffet', 'Showers', 'Workspaces', 'Wi-Fi'],
    memberAccess: ['Admirals Club Member', 'AAdvantage Executive Platinum', 'Citi / AAdvantage Executive Card'],
    dayPass: 79,
    rating: 4.8,
    capacity: 'Moderate',
    image: LOUNGE_IMAGES[0],
  },
  {
    id: 'l2',
    name: 'Flagship Lounge',
    terminal: 'Terminal 3',
    gate: 'Near Gate K19',
    walkTime: '8 min walk',
    amenities: ['À la carte Dining', 'Champagne Bar', 'Spa Suites', 'Quiet Rooms'],
    memberAccess: ['Flagship First / Business International', 'ConciergeKey'],
    dayPass: 150,
    rating: 4.9,
    capacity: 'Light',
    image: LOUNGE_IMAGES[1],
  },
  {
    id: 'l3',
    name: 'Chase Sapphire Lounge',
    terminal: 'Terminal 5',
    gate: 'Near Gate M12',
    walkTime: '12 min walk (train)',
    amenities: ['Wellness Room', 'Craft Cocktails', 'Local Cuisine', 'Family Room'],
    memberAccess: ['Chase Sapphire Reserve', 'Priority Pass Select'],
    dayPass: 65,
    rating: 4.7,
    capacity: 'Busy',
    image: LOUNGE_IMAGES[2],
  },
  {
    id: 'l4',
    name: 'United Club',
    terminal: 'Terminal 1',
    gate: 'Near Gate B18',
    walkTime: '15 min walk',
    amenities: ['Buffet', 'Bar', 'Wi-Fi', 'Charging Stations'],
    memberAccess: ['United Club Member', 'Star Alliance Gold'],
    dayPass: 59,
    rating: 4.4,
    capacity: 'Moderate',
    image: LOUNGE_IMAGES[3],
  },
];

export type Hotel = {
  id: string;
  name: string;
  distance: string;
  shuttle: string;
  rating: number;
  amenities: string[];
  retailPrice: number;
  airlineRate: number;
  voucherCovered: boolean;
  image: string;
};

export const HOTELS: Hotel[] = [
  {
    id: 'h1',
    name: 'Hilton Chicago O\'Hare Airport',
    distance: 'On-airport',
    shuttle: 'Underground walkway, 5 min',
    rating: 4.6,
    amenities: ['Free Wi-Fi', 'Pool', '24/7 Room Service', 'Late Checkout'],
    retailPrice: 289,
    airlineRate: 0,
    voucherCovered: true,
    image: HOTEL_IMAGES[0],
  },
  {
    id: 'h2',
    name: 'Hyatt Regency O\'Hare Chicago',
    distance: '0.4 mi',
    shuttle: 'Complimentary shuttle, every 15 min',
    rating: 4.5,
    amenities: ['Spa', 'Restaurant', 'Fitness Center', 'Concierge'],
    retailPrice: 245,
    airlineRate: 49,
    voucherCovered: false,
    image: HOTEL_IMAGES[1],
  },
  {
    id: 'h3',
    name: 'Renaissance O\'Hare Suites',
    distance: '1.2 mi',
    shuttle: 'Complimentary shuttle, every 30 min',
    rating: 4.4,
    amenities: ['Suites Only', 'Lounge Access', 'Breakfast Included'],
    retailPrice: 219,
    airlineRate: 79,
    voucherCovered: false,
    image: HOTEL_IMAGES[2],
  },
];
