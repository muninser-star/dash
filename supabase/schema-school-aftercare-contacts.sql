begin;

create table public.dash_school_aftercare_contacts (
  weekday smallint primary key check (weekday between 1 and 5),
  educator text not null check (btrim(educator) <> ''),
  room smallint not null check (room > 0),
  phone text not null check (phone ~ '^[+]7[0-9]{10}$')
);

alter table public.dash_school_aftercare_contacts enable row level security;
revoke all on public.dash_school_aftercare_contacts from public, anon, authenticated, service_role;
grant select on public.dash_school_aftercare_contacts to service_role;

commit;
