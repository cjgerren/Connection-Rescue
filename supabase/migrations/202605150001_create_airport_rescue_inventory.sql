create extension if not exists pgcrypto;

create table if not exists public.airport_rescue_inventory (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  airport_iata text not null check (airport_iata ~ '^[A-Z]{3}$'),
  option_type text not null check (option_type in ('flight', 'hotel', 'lounge')),
  option_key text not null check (length(trim(option_key)) > 0),
  sort_order integer not null default 100,
  is_active boolean not null default true,
  payload jsonb not null default '{}'::jsonb
);

create unique index if not exists airport_rescue_inventory_unique_idx
  on public.airport_rescue_inventory (airport_iata, option_type, option_key);

create index if not exists airport_rescue_inventory_lookup_idx
  on public.airport_rescue_inventory (airport_iata, option_type, is_active, sort_order);

create or replace function public.set_airport_rescue_inventory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_airport_rescue_inventory_updated_at on public.airport_rescue_inventory;
create trigger trg_airport_rescue_inventory_updated_at
before update on public.airport_rescue_inventory
for each row
execute function public.set_airport_rescue_inventory_updated_at();

alter table public.airport_rescue_inventory enable row level security;

grant select on table public.airport_rescue_inventory to anon, authenticated;

drop policy if exists "airport_rescue_inventory_public_read" on public.airport_rescue_inventory;
create policy "airport_rescue_inventory_public_read"
  on public.airport_rescue_inventory
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "airport_rescue_inventory_no_client_mutation" on public.airport_rescue_inventory;
create policy "airport_rescue_inventory_no_client_mutation"
  on public.airport_rescue_inventory
  for all
  to public
  using (false)
  with check (false);

with airports(code) as (
  values
    ('ATL'), ('AUS'), ('BNA'), ('BOS'), ('BWI'), ('CLT'), ('DCA'), ('DEN'),
    ('DFW'), ('DTW'), ('EWR'), ('FLL'), ('HNL'), ('IAD'), ('IAH'), ('IND'),
    ('JFK'), ('LAS'), ('LAX'), ('LGA'), ('MCO'), ('MIA'), ('MSP'), ('ORD'),
    ('PDX'), ('PHL'), ('PHX'), ('SAN'), ('SEA'), ('SFO'), ('SLC'), ('TPA')
)
insert into public.airport_rescue_inventory (airport_iata, option_type, option_key, sort_order, payload)
select
  airports.code,
  flight_templates.option_type,
  flight_templates.option_key,
  flight_templates.sort_order,
  flight_templates.payload
from airports
cross join lateral (
  values
    (
      'flight'::text,
      'f1'::text,
      10,
      jsonb_build_object(
        'flightNum', 'AA 1192',
        'carrier', 'American Airlines',
        'depart', '8:20 PM',
        'arrive', '11:38 PM',
        'duration', '2h 18m',
        'seatsLeft', 4,
        'price', 0,
        'status', 'On Time',
        'distanceFromDest', '12 mi from destination',
        'connections', 0,
        'sameDest', false,
        'source', 'live'
      )
    ),
    (
      'flight'::text,
      'f2'::text,
      20,
      jsonb_build_object(
        'flightNum', 'AA 0734',
        'carrier', 'American Airlines',
        'depart', '9:05 PM',
        'arrive', '12:24 AM',
        'duration', '2h 19m',
        'seatsLeft', 11,
        'price', 0,
        'status', 'Boarding',
        'distanceFromDest', '18 mi from destination',
        'connections', 1,
        'sameDest', false,
        'source', 'live'
      )
    ),
    (
      'flight'::text,
      'f3'::text,
      30,
      jsonb_build_object(
        'flightNum', 'AA 2210',
        'carrier', 'American Airlines',
        'depart', '6:15 AM (next day)',
        'arrive', '9:32 AM',
        'duration', '2h 17m',
        'seatsLeft', 22,
        'price', 0,
        'status', 'On Time',
        'distanceFromDest', 'Original destination',
        'connections', 0,
        'sameDest', true,
        'source', 'live'
      )
    ),
    (
      'flight'::text,
      'f4'::text,
      40,
      jsonb_build_object(
        'flightNum', 'AA 4421',
        'carrier', 'American Eagle',
        'depart', '7:50 PM',
        'arrive', '11:02 PM',
        'duration', '2h 12m',
        'seatsLeft', 2,
        'price', 89,
        'status', 'Delayed',
        'distanceFromDest', '24 mi from destination',
        'connections', 0,
        'sameDest', false,
        'source', 'live'
      )
    )
) as flight_templates(option_type, option_key, sort_order, payload)
on conflict (airport_iata, option_type, option_key) do update
set
  sort_order = excluded.sort_order,
  payload = excluded.payload,
  is_active = true,
  updated_at = now();

with airports(code) as (
  values
    ('ATL'), ('AUS'), ('BNA'), ('BOS'), ('BWI'), ('CLT'), ('DCA'), ('DEN'),
    ('DFW'), ('DTW'), ('EWR'), ('FLL'), ('HNL'), ('IAD'), ('IAH'), ('IND'),
    ('JFK'), ('LAS'), ('LAX'), ('LGA'), ('MCO'), ('MIA'), ('MSP'), ('ORD'),
    ('PDX'), ('PHL'), ('PHX'), ('SAN'), ('SEA'), ('SFO'), ('SLC'), ('TPA')
)
insert into public.airport_rescue_inventory (airport_iata, option_type, option_key, sort_order, payload)
select
  airports.code,
  hotel_templates.option_type,
  hotel_templates.option_key,
  hotel_templates.sort_order,
  hotel_templates.payload
from airports
cross join lateral (
  values
    (
      'hotel'::text,
      'h1'::text,
      10,
      jsonb_build_object(
        'name', airports.code || ' Airport Hotel Alpha',
        'distance', 'On-airport',
        'shuttle', 'Walkway or shuttle, 5 min',
        'rating', 4.6,
        'amenities', jsonb_build_array('Free Wi-Fi', '24/7 Desk', 'Fitness Center', 'Late Checkout'),
        'retailPrice', 289,
        'airlineRate', 0,
        'voucherCovered', true,
        'image', 'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236332640_cbceb852.jpg'
      )
    ),
    (
      'hotel'::text,
      'h2'::text,
      20,
      jsonb_build_object(
        'name', airports.code || ' Airport Hotel Bravo',
        'distance', '0.6 mi',
        'shuttle', 'Complimentary shuttle, every 15 min',
        'rating', 4.4,
        'amenities', jsonb_build_array('Restaurant', 'Business Center', 'Wi-Fi', 'Quiet Rooms'),
        'retailPrice', 239,
        'airlineRate', 49,
        'voucherCovered', false,
        'image', 'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236400005_badf2795.png'
      )
    ),
    (
      'hotel'::text,
      'h3'::text,
      30,
      jsonb_build_object(
        'name', airports.code || ' Airport Suites',
        'distance', '1.3 mi',
        'shuttle', 'Complimentary shuttle, every 30 min',
        'rating', 4.3,
        'amenities', jsonb_build_array('Suites', 'Breakfast Included', 'Lounge Access', 'Wi-Fi'),
        'retailPrice', 219,
        'airlineRate', 79,
        'voucherCovered', false,
        'image', 'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236457610_1832d9f8.jpg'
      )
    )
) as hotel_templates(option_type, option_key, sort_order, payload)
on conflict (airport_iata, option_type, option_key) do update
set
  sort_order = excluded.sort_order,
  payload = excluded.payload,
  is_active = true,
  updated_at = now();

with airports(code) as (
  values
    ('ATL'), ('AUS'), ('BNA'), ('BOS'), ('BWI'), ('CLT'), ('DCA'), ('DEN'),
    ('DFW'), ('DTW'), ('EWR'), ('FLL'), ('HNL'), ('IAD'), ('IAH'), ('IND'),
    ('JFK'), ('LAS'), ('LAX'), ('LGA'), ('MCO'), ('MIA'), ('MSP'), ('ORD'),
    ('PDX'), ('PHL'), ('PHX'), ('SAN'), ('SEA'), ('SFO'), ('SLC'), ('TPA')
)
insert into public.airport_rescue_inventory (airport_iata, option_type, option_key, sort_order, payload)
select
  airports.code,
  lounge_templates.option_type,
  lounge_templates.option_key,
  lounge_templates.sort_order,
  lounge_templates.payload
from airports
cross join lateral (
  values
    (
      'lounge'::text,
      'l1'::text,
      10,
      jsonb_build_object(
        'name', airports.code || ' Signature Lounge',
        'terminal', 'Main Terminal',
        'gate', 'Near central concourse',
        'walkTime', '5 min walk',
        'amenities', jsonb_build_array('Premium Bar', 'Hot Buffet', 'Showers', 'Wi-Fi'),
        'memberAccess', jsonb_build_array('Priority Pass Select', 'Airline Club Member'),
        'dayPass', 69,
        'rating', 4.8,
        'capacity', 'Moderate',
        'image', 'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236291491_9b5cb101.jpg'
      )
    ),
    (
      'lounge'::text,
      'l2'::text,
      20,
      jsonb_build_object(
        'name', airports.code || ' Premium Club',
        'terminal', 'International Terminal',
        'gate', 'Near security checkpoint',
        'walkTime', '8 min walk',
        'amenities', jsonb_build_array('Dining', 'Quiet Rooms', 'Workspaces', 'Showers'),
        'memberAccess', jsonb_build_array('Business International', 'ConciergeKey'),
        'dayPass', 89,
        'rating', 4.7,
        'capacity', 'Light',
        'image', 'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236315200_89ffd784.png'
      )
    ),
    (
      'lounge'::text,
      'l3'::text,
      30,
      jsonb_build_object(
        'name', airports.code || ' Traveler Lounge',
        'terminal', 'Domestic Terminal',
        'gate', 'Near gates 10-20',
        'walkTime', '12 min walk',
        'amenities', jsonb_build_array('Snacks', 'Coffee', 'Charging', 'Wi-Fi'),
        'memberAccess', jsonb_build_array('Priority Pass Select'),
        'dayPass', 59,
        'rating', 4.4,
        'capacity', 'Busy',
        'image', 'https://d64gsuwffb70l.cloudfront.net/69ee77eaf3db31a37c1b56c0_1777236298193_48700a10.png'
      )
    )
) as lounge_templates(option_type, option_key, sort_order, payload)
on conflict (airport_iata, option_type, option_key) do update
set
  sort_order = excluded.sort_order,
  payload = excluded.payload,
  is_active = true,
  updated_at = now();
