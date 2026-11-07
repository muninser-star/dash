create table public.dash_school_routes (
  id text primary key check (id ~ '^[a-z0-9_-]{1,32}$'),
  label text not null check (length(btrim(label)) between 1 and 120),
  place text not null check (length(btrim(place)) between 1 and 140),
  meters integer not null check (meters between 1 and 50000),
  minutes smallint not null check (minutes between 1 and 360),
  sort_order smallint not null
);

alter table public.dash_school_routes enable row level security;
revoke all on public.dash_school_routes from public, anon, authenticated;
grant select, insert, update, delete on public.dash_school_routes to service_role;

alter table public.dash_school_events
  add column route_id text references public.dash_school_routes(id) on delete set null;
create index dash_school_events_route_idx on public.dash_school_events (route_id) where route_id is not null;
