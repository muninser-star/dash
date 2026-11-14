-- Family workspace is shared by Denis and Anya. Observations and OCR keep their existing per-code scope.
create table public.grocery_stores (
  id text primary key,
  name text not null check (char_length(name) between 1 and 80),
  name_key text not null unique,
  created_at timestamptz not null default now()
);

insert into public.grocery_stores (id, name, name_key) values
  ('perekrestok', 'Перекрёсток', 'перекресток'),
  ('lenta', 'Лента', 'лента'),
  ('dixy', 'Дикси', 'дикси'),
  ('pyaterochka', 'Пятёрочка', 'пятерочка'),
  ('four-paws', 'Четыре лапы', 'четыре лапы'),
  ('chizhik', 'Чижик', 'чижик');

create table public.grocery_entries (
  id uuid primary key,
  kind text not null check (kind in ('purchase', 'plan')),
  title text not null check (char_length(title) between 1 and 200),
  product_key text check (char_length(product_key) between 1 and 399),
  store_id text references public.grocery_stores (id),
  plan_type text check (plan_type in ('purchase', 'service')),
  due_on date,
  note text not null default '' check (char_length(note) <= 1000),
  completed boolean not null default false,
  deleted boolean not null default false,
  revision uuid not null,
  created_at timestamptz not null default now(),
  check (
    (kind = 'purchase' and plan_type is null and due_on is null and note = '')
    or (kind = 'plan' and plan_type is not null and product_key is null and store_id is null)
  )
);

create index grocery_active_entries_order on public.grocery_entries (created_at, id) where not deleted;

-- Storefront-only offers do not participate in cashback's expense forecasts.
-- When an existing cb_rules row supplies the rate and month, store only its reference here.
create table public.cb_grocery_offers (
  id text primary key,
  store_id text not null references public.grocery_stores (id),
  category text,
  cb_rule_id bigint references public.cb_rules (id) on delete cascade,
  month text check (month = '*' or month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  pct numeric(5,2) check (pct > 0 and pct <= 100),
  program text not null,
  reward text,
  ruble_equivalent_known boolean not null,
  conditional boolean not null default false,
  conditions text,
  check (
    (cb_rule_id is not null and month is null and pct is null)
    or (cb_rule_id is null and month is not null and pct is not null)
  )
);

insert into public.cb_grocery_offers
  (id, store_id, category, cb_rule_id, program, reward, ruble_equivalent_known, conditions)
select 'perekrestok-orange', 'perekrestok', null, id, 'Апельсинка', 'баллы «Перекрёстка»', true,
       'При оплате картой «Апельсинка». 10 баллов = 1 ₽.'
from public.cb_rules
where card_id = 'alfa' and month = '*' and category = 'Перекрёсток' and kind = 'partner';

do $$
begin
  if not exists (select 1 from public.cb_grocery_offers where id = 'perekrestok-orange') then
    raise exception 'Existing Perekrestok cashback rule not found';
  end if;
end $$;

insert into public.cb_grocery_offers
  (id, store_id, category, month, pct, program, reward, ruble_equivalent_known, conditional, conditions)
values
  ('dixy-card', 'dixy', null, '*', 2, 'Карта для «Дикси»', null, true, false, 'При оплате картой с кэшбэком для «Дикси».'),
  ('november-x5-yogurt', 'perekrestok', 'Йогурты', '2026-11', 10, 'Х5 Клуб', 'баллы Х5 Клуба', false, true, 'Нужна виртуальная карта Х5 Клуба. Начисление вместе с «Апельсинкой» не подтверждено.'),
  ('november-x5-curd', 'perekrestok', 'Творог', '2026-11', 10, 'Х5 Клуб', 'баллы Х5 Клуба', false, true, 'Нужна виртуальная карта Х5 Клуба. Начисление вместе с «Апельсинкой» не подтверждено.');

alter table public.grocery_stores enable row level security;
alter table public.grocery_entries enable row level security;
alter table public.cb_grocery_offers enable row level security;
revoke all on public.grocery_stores, public.grocery_entries, public.cb_grocery_offers from public, anon, authenticated, service_role;
grant select, insert on public.grocery_stores to service_role;
grant select, insert, update on public.grocery_entries to service_role;
grant select on public.cb_grocery_offers to service_role;
