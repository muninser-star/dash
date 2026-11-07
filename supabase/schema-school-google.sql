begin;

alter table public.dash_school_events
  drop constraint dash_school_events_category_check,
  add constraint dash_school_events_category_check check (category in ('school', 'club', 'health', 'other'));

update public.dash_school_events
set category = 'health', revision = gen_random_uuid()
where category = 'other' and title = 'Нейропсихолог';

create table public.dash_school_google_snapshot (
  singleton boolean primary key default true check (singleton),
  events jsonb not null check (jsonb_typeof(events) = 'array')
);

alter table public.dash_school_google_snapshot enable row level security;
revoke all on public.dash_school_google_snapshot from public, anon, authenticated;
grant select on public.dash_school_google_snapshot to service_role;

commit;
