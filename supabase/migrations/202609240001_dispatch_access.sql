-- Restrict access while preserving the single existing active operator.
-- Installation aborts if the verified one-user baseline has changed.
begin;
create schema if not exists dispatch_private;
revoke all on schema dispatch_private from public, anon, authenticated;
create table if not exists dispatch_private.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true
);
revoke all on dispatch_private.members from public, anon, authenticated;
alter table dispatch_private.members enable row level security;
do $$ begin
  if (select count(*) from auth.users) <> 1 or (select count(*) from auth.users where last_sign_in_at is not null) <> 1 then
    raise exception 'Expected the single existing active operator; review membership manually';
  end if;
  insert into dispatch_private.members(user_id) select id from auth.users on conflict(user_id) do nothing;
end $$;

create or replace function dispatch_private.is_operator()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from dispatch_private.members
    where user_id = (select auth.uid()) and enabled
  );
$$;
revoke all on function dispatch_private.is_operator() from public, anon, authenticated;
grant usage on schema dispatch_private to authenticated;
grant execute on function dispatch_private.is_operator() to authenticated;

do $$
declare entity text;
begin
  foreach entity in array array['staff', 'ambulances', 'locations', 'clients', 'matches', 'fuel_records', 'transfers', 'audit_logs']
  loop
    if to_regclass(format('public.%I', entity)) is null then
      raise exception 'Required table missing: %', entity;
    end if;
    execute format('alter table public.%I enable row level security', entity);
    execute format('alter table public.%I force row level security', entity);
    execute format('revoke all on public.%I from public, anon', entity);
    execute format('revoke truncate, references, trigger on public.%I from authenticated', entity);
    -- Restrictive AND prevents old permissive policies from bypassing approval.
    execute format('create policy dispatch_member_guard on public.%I as restrictive for all to authenticated using ((select dispatch_private.is_operator())) with check ((select dispatch_private.is_operator()))', entity);
  end loop;
end $$;
commit;
