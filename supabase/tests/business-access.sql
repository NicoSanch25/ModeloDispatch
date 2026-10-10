-- Read-only production probe as postgres. JWT claims are simulated within a rolled-back transaction.
-- No business commands with effects, no Auth changes, no patient fields.
begin;
do $$ declare entity text; expected bigint; visible bigint; operator_id uuid; caps jsonb;
begin
 select user_id into strict operator_id from dispatch_private.members where enabled and role='admin';
 foreach entity in array array['services','service_events','service_costs','quotes','quote_versions','billing_documents','billing_lines','payments','resource_blocks'] loop
  execute format('select count(*) from public.%I',entity) into expected;
  perform set_config('request.jwt.claim.sub',operator_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',operator_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  execute format('select count(*) from public.%I',entity) into visible;
  select public.dispatch_capabilities() into caps;
  execute 'reset role';
  if visible<>expected or not (caps->>'finance')::boolean then raise exception 'Approved administration access failed: %',entity; end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated"}',true);
  execute 'set local role authenticated';
  execute format('select count(*) from public.%I',entity) into visible;
  select public.dispatch_capabilities() into caps;
  execute 'reset role';
  if visible<>0 or (caps->>'operator')::boolean then raise exception 'Unapproved read access: %',entity; end if;
  if has_table_privilege('anon',format('public.%I',entity),'SELECT,INSERT,UPDATE,DELETE') then raise exception 'Anonymous grant remains: %',entity; end if;
  if has_table_privilege('authenticated',format('public.%I',entity),'INSERT,UPDATE,DELETE') then raise exception 'Direct business write grant remains: %',entity; end if;
 end loop;
 if has_function_privilege('anon','public.dispatch_command(text,jsonb,uuid)','EXECUTE') then raise exception 'Anonymous command execution remains'; end if;
 execute 'set local role authenticated';
 begin
  perform public.dispatch_command('unknown','{}'::jsonb,gen_random_uuid());
  raise exception 'Unapproved account executed a command';
 exception when insufficient_privilege then null;
 end;
 execute 'reset role';
end $$;
rollback;
select 'Business access checks passed' as verification;
