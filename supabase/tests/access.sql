-- Run as postgres in Supabase SQL Editor. Reads counts only, never patient fields.
-- Simulates JWT claims at the database layer; not an end-to-end Auth API test.
begin;
do $$
declare entity text; expected bigint; visible bigint; operator_id uuid;
begin
  select user_id into strict operator_id from dispatch_private.members where enabled;
  foreach entity in array array['staff','ambulances','locations','clients','matches','fuel_records','transfers','audit_logs'] loop
    execute format('select count(*) from public.%I', entity) into expected;
    perform set_config('request.jwt.claims', jsonb_build_object('sub',operator_id,'role','authenticated')::text, true);
    execute 'set local role authenticated';
    execute format('select count(*) from public.%I', entity) into visible;
    execute 'reset role';
    if visible <> expected then raise exception 'Operator access failed: %', entity; end if;
    perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
    execute 'set local role authenticated';
    execute format('select count(*) from public.%I', entity) into visible;
    execute 'reset role';
    if visible <> 0 then raise exception 'Unapproved account can read: %', entity; end if;
    if has_table_privilege('anon',format('public.%I',entity),'SELECT,INSERT,UPDATE,DELETE') then
      raise exception 'Anonymous grant remains: %',entity;
    end if;
  end loop;
end $$;
rollback;
select 'Access checks passed' as verification;
