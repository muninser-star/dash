-- Inclusive Moscow dates for official transfers and the school's academic calendar.
create table public.dash_school_closures (
  kind text not null check (kind in ('holiday', 'vacation', 'workday')),
  date_from date not null,
  date_to date not null,
  label text not null check (length(btrim(label)) between 1 and 120),
  source text not null,
  primary key (kind, date_from, date_to),
  check (date_from <= date_to)
);

alter table public.dash_school_closures enable row level security;
revoke all on public.dash_school_closures from public, anon, authenticated;
grant select, insert, update, delete on public.dash_school_closures to service_role;
