-- Family schedule is accessed exclusively by the school Edge Function.
create table public.dash_school_events (
  id uuid primary key,
  title text not null check (length(btrim(title)) between 1 and 120),
  child text not null check (child in ('dima', 'danya')),
  category text not null check (category in ('school', 'club', 'other')),
  school_kind text check (school_kind in ('school', 'lesson', 'aftercare', 'kindergarten')),
  lesson smallint check (lesson between 1 and 12),
  date date not null,
  until date,
  weekdays smallint[] not null default '{}',
  start_time time(0) not null,
  end_time time(0) not null,
  place text not null default '' check (length(place) <= 140),
  note text not null default '' check (length(note) <= 300),
  travel_out smallint check (travel_out between 0 and 360),
  travel_back smallint check (travel_back between 0 and 360),
  tentative boolean not null default false,
  revision uuid not null default gen_random_uuid(),
  check (start_time < end_time and end_time < '24:00'),
  check (weekdays <@ array[1,2,3,4,5,6,7]::smallint[] and cardinality(weekdays) <= 7),
  check (until is null or (cardinality(weekdays) > 0 and until >= date)),
  check ((school_kind is not null) = (category = 'school')),
  check (lesson is null or school_kind = 'lesson')
);

create index dash_school_events_date_idx on public.dash_school_events (date);
create table public.dash_school_skips (
  event_id uuid not null references public.dash_school_events(id) on delete cascade,
  date date not null,
  primary key (event_id, date)
);
create index dash_school_skips_date_idx on public.dash_school_skips (date);
create table public.dash_school_bells (
  lesson smallint primary key check (lesson between 1 and 12),
  start_time time(0) not null,
  end_time time(0) not null,
  check (start_time < end_time and end_time < '24:00')
);

alter table public.dash_school_events enable row level security;
alter table public.dash_school_skips enable row level security;
alter table public.dash_school_bells enable row level security;
revoke all on public.dash_school_events, public.dash_school_skips, public.dash_school_bells from public, anon, authenticated;
grant select, insert, update, delete on public.dash_school_events, public.dash_school_skips, public.dash_school_bells to service_role;
