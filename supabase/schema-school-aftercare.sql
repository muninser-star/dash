begin;

alter table public.dash_school_events
  drop constraint dash_school_events_child_check,
  add constraint dash_school_events_child_check check (child in ('dima', 'danya', 'anya'));

alter table public.dash_school_routes
  add column school_minutes smallint check (school_minutes between 0 and 360);

commit;
