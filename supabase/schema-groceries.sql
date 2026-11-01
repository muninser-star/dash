-- Execute in project cuhplpukqhdfutcymtmv. No existing tables are modified.
create table if not exists public.grocery_observations (
 account_hash text not null,
 id text not null,
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 updated_at timestamptz not null default now(),
 primary key(account_hash,id)
);
alter table public.grocery_observations enable row level security;
revoke all on public.grocery_observations from anon, authenticated;
grant select,insert,update on public.grocery_observations to service_role;

create table if not exists public.grocery_vision_requests (
 account_hash text not null,
 request_id text not null,
 status text not null check(status in ('pending','done','failed')),
 response jsonb,
 created_at timestamptz not null default now(),
 primary key(account_hash,request_id)
);
create index if not exists grocery_vision_daily on public.grocery_vision_requests(account_hash,created_at);
alter table public.grocery_vision_requests enable row level security;
revoke all on public.grocery_vision_requests from anon, authenticated;
grant select,insert,update on public.grocery_vision_requests to service_role;

-- Atomic reservation prevents duplicate paid calls and caps requests at 30/day/account.
create or replace function public.reserve_grocery_vision(p_account text,p_request text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare existing public.grocery_vision_requests%rowtype;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_account,0));
 select * into existing from public.grocery_vision_requests where account_hash=p_account and request_id=p_request;
 if found then return jsonb_build_object('reserved',false,'status',existing.status,'response',existing.response); end if;
 if (select count(*) from public.grocery_vision_requests where account_hash=p_account and created_at>=date_trunc('day',now() at time zone 'Europe/Moscow') at time zone 'Europe/Moscow')>=30 then
  return jsonb_build_object('reserved',false,'status','daily_limit');
 end if;
 insert into public.grocery_vision_requests(account_hash,request_id,status) values(p_account,p_request,'pending');
 return jsonb_build_object('reserved',true);
end; $$;
revoke all on function public.reserve_grocery_vision(text,text) from public,anon,authenticated;
grant execute on function public.reserve_grocery_vision(text,text) to service_role;
