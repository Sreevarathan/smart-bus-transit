create extension if not exists pgcrypto;

create table if not exists routes (
  id text primary key,
  route_name text not null,
  start_city text not null,
  end_city text not null
);

create table if not exists route_stops (
  route_id text not null references routes(id) on delete cascade,
  stop_sequence integer not null,
  stop_name text not null,
  primary key (route_id, stop_sequence),
  unique (route_id, stop_name)
);

create table if not exists buses (
  id uuid primary key default gen_random_uuid(),
  bus_no text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references buses(id),
  route_id text not null references routes(id),
  start_city text not null,
  end_city text not null,
  current_stop_sequence integer not null default 0,
  status text not null default 'active'
    check (status in ('active', 'completed', 'reset')),
  control_mode text not null default 'esp32'
    check (control_mode in ('simulation', 'esp32')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_active_trip_per_bus
on trips(bus_id) where status = 'active';

create table if not exists passenger_groups (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id),
  ticket_count integer not null check (ticket_count > 0),
  board_sequence integer not null,
  destination_sequence integer not null,
  status text not null default 'valid'
    check (status in ('valid', 'cancelled')),
  created_at timestamptz not null default now(),
  check (destination_sequence > board_sequence)
);

create table if not exists passenger_profiles (
  id uuid primary key default gen_random_uuid(),
  passenger_name text not null check (length(trim(passenger_name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists system_events (
  id bigint generated always as identity primary key,
  bus_id uuid references buses(id),
  trip_id uuid references trips(id),
  event_type text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into routes (id, route_name, start_city, end_city)
values
  ('chennai_kanyakumari', 'Chennai to Kanyakumari', 'Chennai', 'Kanyakumari'),
  ('coimbatore_thoothukudi', 'Coimbatore to Thoothukudi', 'Coimbatore', 'Thoothukudi')
on conflict (id) do nothing;

insert into route_stops (route_id, stop_sequence, stop_name)
values
  ('chennai_kanyakumari', 0, 'Chennai'),
  ('chennai_kanyakumari', 1, 'Chengalpattu'),
  ('chennai_kanyakumari', 2, 'Villupuram'),
  ('chennai_kanyakumari', 3, 'Trichy'),
  ('chennai_kanyakumari', 4, 'Virudhunagar'),
  ('chennai_kanyakumari', 5, 'Kovilpatti'),
  ('chennai_kanyakumari', 6, 'Tirunelveli'),
  ('chennai_kanyakumari', 7, 'Nagercoil'),
  ('chennai_kanyakumari', 8, 'Kanyakumari'),
  ('coimbatore_thoothukudi', 0, 'Coimbatore'),
  ('coimbatore_thoothukudi', 1, 'Pollachi'),
  ('coimbatore_thoothukudi', 2, 'Oddanchatram'),
  ('coimbatore_thoothukudi', 3, 'Dindigul'),
  ('coimbatore_thoothukudi', 4, 'Madurai'),
  ('coimbatore_thoothukudi', 5, 'Virudhunagar'),
  ('coimbatore_thoothukudi', 6, 'Kovilpatti'),
  ('coimbatore_thoothukudi', 7, 'Thoothukudi')
on conflict do nothing;
