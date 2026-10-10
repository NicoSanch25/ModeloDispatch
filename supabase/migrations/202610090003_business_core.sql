-- Expansion only: original operational rows and authentication remain unchanged.
begin;
alter table dispatch_private.members add column if not exists role text not null default 'admin' check(role in ('admin','operator'));
create or replace function dispatch_private.is_business_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from dispatch_private.members where user_id=auth.uid() and enabled and role='admin')
$$;
revoke all on function dispatch_private.is_business_admin() from public,anon;
grant execute on function dispatch_private.is_business_admin() to authenticated;
create or replace function public.dispatch_capabilities() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('operator',dispatch_private.is_operator(),'finance',dispatch_private.is_business_admin())
$$;
revoke all on function public.dispatch_capabilities() from public,anon;
grant execute on function public.dispatch_capabilities() to authenticated;
alter table public.transfers add column if not exists planned_start_at timestamptz;
alter table public.transfers add column if not exists planned_end_at timestamptz;
alter table public.transfers add column if not exists ambulance_id uuid references public.ambulances(id);
alter table public.transfers add column if not exists nurse_id uuid references public.staff(id);
alter table public.transfers add column if not exists client_id uuid references public.clients(id);
alter table public.transfers add column if not exists version integer not null default 1;
alter table public.matches add column if not exists version integer not null default 1;

create table if not exists public.services (
 id uuid primary key default gen_random_uuid(), number bigint generated always as identity unique,
 coverage_id uuid unique references public.matches(id), transfer_id uuid unique references public.transfers(id),
 kind text not null check(kind in ('coverage','transfer')), title text not null, date date not null,
 start_at timestamptz, end_at timestamptz, client_id uuid references public.clients(id),
 ambulance_id uuid references public.ambulances(id), crew uuid[] not null default '{}',
 state text not null default 'scheduled' check(state in ('scheduled','en_route','in_service','finished','returning','closed','cancelled')),
 performed boolean not null default false, reviewed boolean not null default false,
 agreed_cents bigint check(agreed_cents between 0 and 100000000000000), version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((coverage_id is not null)::integer + (transfer_id is not null)::integer = 1),
 check(end_at is null or start_at is null or end_at > start_at)
);
create table if not exists public.service_events (
 id uuid primary key default gen_random_uuid(), service_id uuid references public.services(id),
 type text not null, details jsonb not null default '{}', actor uuid, recorded_at timestamptz not null default now()
);
create table if not exists public.service_costs (
 id uuid primary key default gen_random_uuid(), service_id uuid not null references public.services(id),
 category text not null, description text not null, date date not null,
 cents bigint not null check(cents between 1 and 100000000000000),
 voided boolean not null default false, void_reason text, created_at timestamptz not null default now()
);
create table if not exists public.quotes (
 id uuid primary key default gen_random_uuid(), number bigint generated always as identity unique,
 client_id uuid not null references public.clients(id), kind text not null check(kind in ('coverage','transfer')),
 state text not null default 'draft' check(state in ('draft','sent','accepted','rejected','expired')),
 version integer not null default 1, service_id uuid unique references public.services(id),
 created_at timestamptz not null default now()
);
create table if not exists public.quote_versions (
 quote_id uuid not null references public.quotes(id), version integer not null,
 snapshot jsonb not null, cents bigint not null check(cents between 0 and 100000000000000),
 estimated_cost_cents bigint not null check(estimated_cost_cents between 0 and 100000000000000),
 valid_until date not null, created_at timestamptz not null default now(), primary key(quote_id,version)
);
create table if not exists public.billing_documents (
 id uuid primary key default gen_random_uuid(), number bigint generated always as identity unique,
 client_id uuid not null references public.clients(id), client_name text not null,
 date date not null, due_date date not null, total_cents bigint not null check(total_cents between 1 and 100000000000000),
 external_reference text, voided boolean not null default false, void_reason text,
 created_at timestamptz not null default now(), check(due_date >= date)
);
create table if not exists public.billing_lines (
 id uuid primary key default gen_random_uuid(), document_id uuid not null references public.billing_documents(id),
 service_id uuid not null references public.services(id), description text not null,
 cents bigint not null check(cents > 0), active boolean not null default true
);
create unique index if not exists one_active_billing_per_service on public.billing_lines(service_id) where active;
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(), document_id uuid not null references public.billing_documents(id),
 date date not null, cents bigint not null check(cents > 0 and cents <= 100000000000000),
 method text not null, reference text, voided boolean not null default false, void_reason text,
 created_at timestamptz not null default now()
);
create table if not exists public.resource_blocks (
 id uuid primary key default gen_random_uuid(), ambulance_id uuid references public.ambulances(id),
 staff_id uuid references public.staff(id), start_at timestamptz not null, end_at timestamptz not null,
 reason text not null, voided boolean not null default false,
 check(end_at > start_at), check((ambulance_id is not null)::integer+(staff_id is not null)::integer=1)
);
create table if not exists dispatch_private.requests (
 id uuid primary key, action text not null, payload jsonb not null, result jsonb not null,
 actor uuid not null, created_at timestamptz not null default now()
);
create index if not exists services_dates on public.services(date);
create index if not exists events_service on public.service_events(service_id,recorded_at);
create index if not exists costs_service on public.service_costs(service_id);
create index if not exists payments_document on public.payments(document_id);
alter table public.services enable row level security;
alter table public.service_events enable row level security;
alter table public.service_costs enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_versions enable row level security;
alter table public.billing_documents enable row level security;
alter table public.billing_lines enable row level security;
alter table public.payments enable row level security;
alter table public.resource_blocks enable row level security;
alter table dispatch_private.requests enable row level security;

-- Only the same existing approved operators can read business data. Writes go through validated commands.
do $$ declare t text; begin
 foreach t in array array['services','service_events','service_costs','quotes','quote_versions','billing_documents','billing_lines','payments','resource_blocks'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('alter table public.%I force row level security',t);
 execute format('revoke all on public.%I from public, anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='operator_read') then
 if t='service_events' then
  create policy operator_read on public.service_events for select to authenticated using ((select dispatch_private.is_operator()) and (type in ('created','source_updated','service_state','block_add','block_void') or (select dispatch_private.is_business_admin())));
 else execute format('create policy operator_read on public.%I for select to authenticated using ((select dispatch_private.%I()))',t,
  case when t in ('services','service_events','resource_blocks') then 'is_operator' else 'is_business_admin' end);
 end if;
 end if;
 end loop;
end $$;
revoke all on dispatch_private.requests from public,anon,authenticated;

create or replace function dispatch_private.sync_service() returns trigger
language plpgsql security definer set search_path='' as $$
declare s public.services; start_time timestamptz; finish_time timestamptz; people uuid[]; label text;
 done boolean; cancelled boolean; previous jsonb; source_client uuid;
begin
 perform pg_advisory_xact_lock(610090003);
 if TG_TABLE_NAME='matches' then
  start_time := (NEW.date + NEW.time) at time zone 'America/Argentina/Buenos_Aires';
  finish_time := start_time + make_interval(mins=>greatest(1,coalesce(NEW.duration_minutes,90)+coalesce(NEW.extension_minutes,0)));
  people:=array_remove(array[NEW.driver_id,NEW.nurse_id,NEW.third_crew_id],null);
  label:=coalesce(NEW.location,'Cobertura'); done:=NEW.status::text='Completed'; cancelled:=NEW.status::text='Suspended';
  select * into s from public.services where coverage_id=NEW.id;
 else
  start_time:=NEW.planned_start_at; finish_time:=NEW.planned_end_at;
  people:=array_remove(array[NEW.driver_id,NEW.nurse_id],null);
  label:=coalesce(nullif(NEW.origin,''),'Origen pendiente') || ' → ' || coalesce(nullif(NEW.destination,''),'Destino pendiente');
  done:=NEW.status='Completed'; cancelled:=NEW.status='Cancelled';
  select * into s from public.services where transfer_id=NEW.id;
 end if;
 if s.id is null then
  insert into public.services(coverage_id,transfer_id,kind,title,date,start_at,end_at,client_id,ambulance_id,crew,state,performed)
  values(case when TG_TABLE_NAME='matches' then NEW.id end,case when TG_TABLE_NAME='transfers' then NEW.id end,
   case when TG_TABLE_NAME='matches' then 'coverage' else 'transfer' end,label,NEW.date,start_time,finish_time,NEW.client_id,NEW.ambulance_id,people,
   case when cancelled then 'cancelled' when done then 'finished' else 'scheduled' end,done) returning * into s;
  insert into public.service_events(service_id,type,actor) values(s.id,'created',auth.uid());
 else
  previous:=jsonb_build_object('state',s.state,'start_at',s.start_at,'end_at',s.end_at,'ambulance_id',s.ambulance_id,'crew',s.crew);
  update public.services set title=label,date=NEW.date,start_at=start_time,end_at=finish_time,client_id=NEW.client_id,ambulance_id=NEW.ambulance_id,crew=people,
   performed=done,state=case when cancelled then 'cancelled' when done and not s.performed then 'finished' when not done and s.performed then 'scheduled' else s.state end,
   reviewed=case when done is distinct from s.performed or NEW.client_id is distinct from s.client_id or start_time is distinct from s.start_at or finish_time is distinct from s.end_at or NEW.ambulance_id is distinct from s.ambulance_id or people is distinct from s.crew or label is distinct from s.title then false else s.reviewed end,
   version=version+1,updated_at=now() where id=s.id returning * into s;
  insert into public.service_events(service_id,type,actor,details) values(s.id,'source_updated',auth.uid(),jsonb_build_object('before',previous,'after',jsonb_build_object('state',s.state,'start_at',s.start_at,'end_at',s.end_at,'ambulance_id',s.ambulance_id,'crew',s.crew)));
 end if;
 if TG_TABLE_NAME='transfers' then
  if NEW.amount_to_bill is not null then
   update public.services set agreed_cents=round(NEW.amount_to_bill*100)::bigint,reviewed=false where id=s.id and agreed_cents is distinct from round(NEW.amount_to_bill*100)::bigint;
  end if;
 end if;
 return NEW;
end $$;

create or replace function dispatch_private.guard_booking() returns trigger
language plpgsql security definer set search_path='' as $$
declare a timestamptz; b timestamptz; people uuid[]; current_id uuid; changed boolean; open_record boolean;
begin
 perform pg_advisory_xact_lock(610090003);
 if TG_TABLE_NAME='matches' then
  a:=(NEW.date+NEW.time) at time zone 'America/Argentina/Buenos_Aires';
  b:=a+make_interval(mins=>greatest(1,coalesce(NEW.duration_minutes,90)+coalesce(NEW.extension_minutes,0)));
  people:=array_remove(array[NEW.driver_id,NEW.nurse_id,NEW.third_crew_id],null);
  open_record:=NEW.status::text not in ('Completed','Suspended');
  select id into current_id from public.services where coverage_id=NEW.id;
 else
  a:=NEW.planned_start_at; b:=NEW.planned_end_at;
  if not dispatch_private.is_business_admin() and auth.uid() is not null and
   ((TG_OP='INSERT' and NEW.amount_to_bill is not null) or (TG_OP='UPDATE' and (to_jsonb(NEW)->'amount_to_bill') is distinct from (to_jsonb(OLD)->'amount_to_bill'))) then
   raise exception 'Cambiar el precio requiere permiso de administración.';
  end if;
  people:=array_remove(array[NEW.driver_id,NEW.nurse_id],null);
  open_record:=NEW.status not in ('Completed','Cancelled');
  select id into current_id from public.services where transfer_id=NEW.id;
 end if;
 if TG_OP='UPDATE' then
  NEW.version:=OLD.version+1;
  changed:=(to_jsonb(NEW)-array['version','patient_name','observations','incident_details','has_incident','was_transferred','driver_notified','nurse_notified','presumed_diagnosis','amount_to_bill','kms_driven','wait_time_minutes','received_by','holder_name','subscriber_number','affiliate_number','document_number','age','address','locality','arrival_origin_time','departure_origin_time','arrival_destination_time','departure_destination_time','arrival_base_time','departure_base_time']) is distinct from
   (to_jsonb(OLD)-array['version','patient_name','observations','incident_details','has_incident','was_transferred','driver_notified','nurse_notified','presumed_diagnosis','amount_to_bill','kms_driven','wait_time_minutes','received_by','holder_name','subscriber_number','affiliate_number','document_number','age','address','locality','arrival_origin_time','departure_origin_time','arrival_destination_time','departure_destination_time','arrival_base_time','departure_base_time']);
  if exists(select 1 from public.billing_lines where service_id=current_id and active) and
    (changed or TG_TABLE_NAME='transfers' and (to_jsonb(NEW)->'amount_to_bill') is distinct from (to_jsonb(OLD)->'amount_to_bill')) then
   raise exception 'El servicio ya está prefacturado. Corregí el documento antes de reprogramarlo o cambiar su precio.';
  end if;
  if not changed then return NEW; end if;
 end if;
 if not open_record then return NEW; end if;
 if cardinality(people)<>(select count(distinct p) from unnest(people) p) then raise exception 'Una persona no puede ocupar dos puestos en el mismo servicio.'; end if;
 if (NEW.ambulance_id is not null or cardinality(people)>0) and (a is null or b is null or b<=a) then
  raise exception 'Indicá salida y regreso previstos antes de reservar recursos.';
 end if;
 if NEW.ambulance_id is not null and exists(select 1 from public.ambulances where id=NEW.ambulance_id and coalesce(maintenance_status::text,'Active') <> 'Active') then
  raise exception 'El móvil está fuera de servicio o en reparación.';
 end if;
 if exists(select 1 from public.services s where s.id is distinct from current_id and s.state not in ('closed','cancelled')
   and (s.ambulance_id=NEW.ambulance_id or s.crew && people)
   and ((s.start_at is not null and s.end_at is not null and a<s.end_at+interval '15 minutes' and b+interval '15 minutes'>s.start_at)
     or (s.start_at is null and s.date=NEW.date)
     or (s.state in ('en_route','in_service','finished','returning') and s.end_at<now() and a<=now()))) then
  raise exception 'Conflicto: el móvil o una persona ya está reservado. Revisá la agenda y el regreso.';
 end if;
 if exists(select 1 from public.resource_blocks r where not r.voided and (r.ambulance_id=NEW.ambulance_id or r.staff_id=any(people)) and a<r.end_at and b>r.start_at) then
  raise exception 'Hay un bloqueo de disponibilidad en ese horario.';
 end if;
 return NEW;
end $$;
-- Backfill without rewriting source rows; historical inconsistencies remain reviewable.
insert into public.services(coverage_id,kind,title,date,start_at,end_at,client_id,ambulance_id,crew,state,performed)
select id,'coverage',coalesce(location,'Cobertura'),date,(date+time) at time zone 'America/Argentina/Buenos_Aires',
 ((date+time) at time zone 'America/Argentina/Buenos_Aires')+make_interval(mins=>greatest(1,coalesce(duration_minutes,90)+coalesce(extension_minutes,0))),
 client_id,ambulance_id,array_remove(array[driver_id,nurse_id,third_crew_id],null),
 case when status::text='Completed' then 'closed' when status::text='Suspended' then 'cancelled' else 'scheduled' end,status::text='Completed'
from public.matches on conflict(coverage_id) do nothing;
insert into public.services(transfer_id,kind,title,date,start_at,end_at,client_id,ambulance_id,crew,state,performed,agreed_cents)
select id,'transfer',coalesce(nullif(origin,''),'Origen pendiente') || ' → ' || coalesce(nullif(destination,''),'Destino pendiente'),date,planned_start_at,planned_end_at,
 client_id,ambulance_id,array_remove(array[driver_id,nurse_id],null),case when status='Completed' then 'closed' when status='Cancelled' then 'cancelled' else 'scheduled' end,status='Completed',
 case when amount_to_bill>=0 and amount_to_bill<=1000000000000 then round(amount_to_bill*100)::bigint end
from public.transfers on conflict(transfer_id) do nothing;
do $$ begin
 if not exists(select 1 from pg_trigger where tgname='dispatch_booking_guard_matches') then
 create trigger dispatch_booking_guard_matches before insert or update on public.matches for each row execute function dispatch_private.guard_booking();
 create trigger dispatch_source_sync_matches after insert or update on public.matches for each row execute function dispatch_private.sync_service();
 end if;
 if not exists(select 1 from pg_trigger where tgname='dispatch_booking_guard_transfers') then
 create trigger dispatch_booking_guard_transfers before insert or update on public.transfers for each row execute function dispatch_private.guard_booking();
 create trigger dispatch_source_sync_transfers after insert or update on public.transfers for each row execute function dispatch_private.sync_service();
 end if;
end $$;

create or replace function public.dispatch_command(p_action text,p_data jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; prior dispatch_private.requests; s public.services; q public.quotes; v public.quote_versions;
 d public.billing_documents; pay public.payments; source_id uuid; row_id uuid; new_state text;
 amount bigint; paid bigint; total bigint; qty integer; customer text; day date; start_time timestamptz; end_time timestamptz;
begin
 if not coalesce(dispatch_private.is_operator(),false) then raise exception 'Acceso no autorizado.' using errcode='42501'; end if;
 if p_action not in ('service_state','block_add','block_void') and not dispatch_private.is_business_admin() then raise exception 'Esta operación requiere permiso de administración.' using errcode='42501'; end if;
 if p_request_id is null or p_data is null then raise exception 'Falta identificación de la operación.'; end if;
 perform pg_advisory_xact_lock(610090003);
 select * into prior from dispatch_private.requests where id=p_request_id;
 if prior.id is not null then
  if prior.actor<>auth.uid() or prior.action<>p_action or prior.payload<>p_data then raise exception 'El identificador ya pertenece a otra operación.'; end if;
  return prior.result;
 end if;
 if p_action in ('service_price','service_state','service_review','cost_add') then
  select * into s from public.services where id=(p_data->>'service_id')::uuid for update;
  if s.id is null then raise exception 'Servicio inexistente.'; end if;
  if s.version<>(p_data->>'version')::integer or p_data->>'version' is null then raise exception 'El servicio cambió. Actualizá antes de guardar.'; end if;
 end if;
 case p_action
 when 'service_price' then
  if exists(select 1 from public.billing_lines where service_id=s.id and active) then raise exception 'El servicio ya está prefacturado. Anulá el documento antes de corregirlo.'; end if;
  amount:=(p_data->>'cents')::bigint;
  if amount is null or amount<0 or amount>100000000000000 then raise exception 'Importe inválido.'; end if;
  if (p_data->>'client_id') is null then raise exception 'Seleccioná un cliente.'; end if;
  update public.services set agreed_cents=amount,reviewed=false,version=version+1,updated_at=now() where id=s.id;
  if s.kind='coverage' then update public.matches set client_id=(p_data->>'client_id')::uuid where id=s.coverage_id;
  else update public.transfers set client_id=(p_data->>'client_id')::uuid,amount_to_bill=amount::numeric/100 where id=s.transfer_id; end if;
 when 'service_state' then
  new_state:=p_data->>'state';
  if new_state in ('en_route','in_service') and (s.ambulance_id is null or cardinality(s.crew)=0 or s.start_at is null or s.end_at is null) then raise exception 'Asigná móvil, personal y horarios previstos antes de comenzar.'; end if;
  if new_state in ('en_route','in_service') and exists(select 1 from public.ambulances where id=s.ambulance_id and coalesce(maintenance_status::text,'Active')<>'Active') then raise exception 'El móvil está fuera de servicio o en reparación.'; end if;
  if not ((s.state='scheduled' and new_state in ('en_route','in_service','cancelled'))
    or (s.state='en_route' and new_state in ('in_service','cancelled'))
    or (s.state='in_service' and new_state in ('finished','returning'))
    or (s.state='finished' and new_state in ('returning','closed'))
    or (s.state='returning' and new_state='closed')) then raise exception 'Transición de estado incoherente.'; end if;
  if new_state in ('finished','returning','closed') and s.state in ('in_service','finished','returning') then
   if s.kind='coverage' then update public.matches set status='Completed' where id=s.coverage_id;
   else update public.transfers set status='Completed' where id=s.transfer_id; end if;
  elsif new_state='cancelled' then
   if s.kind='coverage' then update public.matches set status='Suspended' where id=s.coverage_id;
   else update public.transfers set status='Cancelled' where id=s.transfer_id; end if;
  end if;
  update public.services set state=new_state,version=version+1,updated_at=now() where id=s.id;
 when 'service_review' then
  if not s.performed or s.state<>'closed' or s.agreed_cents is null or s.client_id is null then raise exception 'Primero cerrá el servicio y revisá cliente, precio y gastos.'; end if;
  update public.services set reviewed=true,version=version+1,updated_at=now() where id=s.id;
 when 'cost_add' then
  insert into public.service_costs(service_id,category,description,date,cents) values(s.id,left(coalesce(p_data->>'category','Otros'),60),left(coalesce(p_data->>'description',''),500),(p_data->>'date')::date,(p_data->>'cents')::bigint) returning id into row_id;
  update public.services set reviewed=false,version=version+1,updated_at=now() where id=s.id;
 when 'cost_void' then
  if length(trim(coalesce(p_data->>'reason','')))<3 then raise exception 'Indicá el motivo de la corrección.'; end if;
  update public.service_costs set voided=true,void_reason=left(p_data->>'reason',500) where id=(p_data->>'id')::uuid and not voided returning service_id into source_id;
  if source_id is null then raise exception 'Gasto inexistente o ya anulado.'; end if;
  update public.services set reviewed=false,version=version+1,updated_at=now() where id=source_id;
  s.id:=source_id;
 when 'quote_save' then
  amount:=(p_data->>'cents')::bigint; day:=(p_data->>'date')::date;
  select name into customer from public.clients where id=(p_data->>'client_id')::uuid;
  if customer is null or day is null or length(trim(coalesce(p_data->>'title','')))=0 or (p_data->>'valid_until')::date<(now() at time zone 'America/Argentina/Buenos_Aires')::date then raise exception 'Revisá cliente, servicio, fecha y vigencia.'; end if;
  if p_data->>'id' is null then
   insert into public.quotes(client_id,kind) values((p_data->>'client_id')::uuid,p_data->>'kind') returning * into q;
  else
   select * into q from public.quotes where id=(p_data->>'id')::uuid for update;
   if q.id is null or q.state not in ('draft','sent') or q.version is distinct from (p_data->>'version')::integer then raise exception 'El presupuesto cambió o ya está cerrado.'; end if;
   update public.quotes set version=version+1,state='draft',client_id=(p_data->>'client_id')::uuid,kind=p_data->>'kind' where id=q.id returning * into q;
  end if;
  if coalesce((p_data->>'duration_minutes')::integer,0)<=0 or (p_data->>'duration_minutes')::integer>43200 then raise exception 'Duración inválida.'; end if;
  start_time:=(day+(p_data->>'time')::time) at time zone 'America/Argentina/Buenos_Aires';
  if start_time is null then raise exception 'Falta horario previsto.'; end if;
  insert into public.quote_versions(quote_id,version,snapshot,cents,estimated_cost_cents,valid_until)
  values(q.id,q.version,(p_data-array['id','version']) || jsonb_build_object('client_name',customer),amount,(p_data->>'estimated_cost_cents')::bigint,(p_data->>'valid_until')::date);
  row_id:=q.id;
 when 'quote_state' then
  select * into q from public.quotes where id=(p_data->>'id')::uuid for update;
  if q.id is null or q.version is distinct from (p_data->>'version')::integer then raise exception 'El presupuesto cambió. Actualizá la pantalla.'; end if;
  select * into v from public.quote_versions where quote_id=q.id and version=q.version;
  new_state:=p_data->>'state';
  if q.state not in ('draft','sent') or new_state not in ('sent','accepted','rejected','expired') then raise exception 'Estado de presupuesto inválido.'; end if;
  if new_state in ('sent','accepted') and v.valid_until<(now() at time zone 'America/Argentina/Buenos_Aires')::date then raise exception 'Presupuesto vencido: creá una nueva versión.'; end if;
  if new_state='accepted' then
   if q.kind='coverage' then
    insert into public.matches(date,time,location,type,status,duration_minutes,client_id)
    values((v.snapshot->>'date')::date,(v.snapshot->>'time')::time,v.snapshot->>'title','Evento','Pending',(v.snapshot->>'duration_minutes')::integer,q.client_id) returning id into source_id;
    select id into row_id from public.services where coverage_id=source_id;
   else
    start_time:=((v.snapshot->>'date')::date+(v.snapshot->>'time')::time) at time zone 'America/Argentina/Buenos_Aires';
    insert into public.transfers(date,origin,destination,status,client_id,planned_start_at,planned_end_at,amount_to_bill)
    values((v.snapshot->>'date')::date,v.snapshot->>'origin',v.snapshot->>'destination','Pending',q.client_id,start_time,start_time+make_interval(mins=>(v.snapshot->>'duration_minutes')::integer),v.cents::numeric/100) returning id into source_id;
    select id into row_id from public.services where transfer_id=source_id;
   end if;
   update public.services set agreed_cents=v.cents,version=version+1 where id=row_id;
   s.id:=row_id;
   update public.quotes set service_id=row_id where id=q.id;
  end if;
  update public.quotes set state=new_state where id=q.id; row_id:=q.id;
 when 'billing_create' then
  qty:=jsonb_array_length(p_data->'service_ids');
  if qty<1 then raise exception 'Seleccioná servicios.'; end if;
  select count(*),sum(agreed_cents) into qty,total from public.services where id in (select value::uuid from jsonb_array_elements_text(p_data->'service_ids'))
   and performed and state='closed' and reviewed and agreed_cents>0 and client_id=(p_data->>'client_id')::uuid;
  if qty<>jsonb_array_length(p_data->'service_ids') then raise exception 'Todos los servicios deben estar cerrados, revisados, con precio y pertenecer al mismo cliente.'; end if;
  select name into customer from public.clients where id=(p_data->>'client_id')::uuid;
  insert into public.billing_documents(client_id,client_name,date,due_date,total_cents)
  values((p_data->>'client_id')::uuid,customer,(p_data->>'date')::date,(p_data->>'due_date')::date,total) returning * into d;
  insert into public.billing_lines(document_id,service_id,description,cents) select d.id,id,'Servicio '||number||' · '||title,agreed_cents from public.services where id in (select value::uuid from jsonb_array_elements_text(p_data->'service_ids'));
  insert into public.service_events(service_id,type,actor,details) select service_id,'prefacturado',auth.uid(),jsonb_build_object('document_id',d.id,'cents',cents) from public.billing_lines where document_id=d.id;
  row_id:=d.id;
 when 'billing_reference' then
  update public.billing_documents set external_reference=left(p_data->>'reference',200) where id=(p_data->>'id')::uuid and not voided returning id into row_id;
  if row_id is null then raise exception 'Documento inexistente o anulado.'; end if;
 when 'payment_add' then
  select * into d from public.billing_documents where id=(p_data->>'document_id')::uuid for update;
  amount:=(p_data->>'cents')::bigint;
  select coalesce(sum(cents),0) into paid from public.payments where document_id=d.id and not voided;
  if d.id is null or d.voided or amount is null or amount<=0 or amount>d.total_cents-paid then raise exception 'El cobro debe ser positivo y no superar el saldo pendiente.'; end if;
  insert into public.payments(document_id,date,cents,method,reference) values(d.id,(p_data->>'date')::date,amount,left(coalesce(p_data->>'method','Transferencia'),60),left(p_data->>'reference',300)) returning id into row_id;
 when 'payment_void' then
  if length(trim(coalesce(p_data->>'reason','')))<3 then raise exception 'Indicá el motivo de la corrección.'; end if;
  update public.payments set voided=true,void_reason=left(p_data->>'reason',500) where id=(p_data->>'id')::uuid and not voided returning id into row_id;
  if row_id is null then raise exception 'Cobro inexistente o ya anulado.'; end if;
 when 'billing_void' then
  if length(trim(coalesce(p_data->>'reason','')))<3 then raise exception 'Indicá el motivo de la anulación.'; end if;
  select * into d from public.billing_documents where id=(p_data->>'id')::uuid for update;
  if d.id is null or d.voided or exists(select 1 from public.payments where document_id=d.id and not voided) then raise exception 'Primero corregí los cobros asociados; un documento con cobros no puede anularse.'; end if;
  update public.billing_documents set voided=true,void_reason=left(p_data->>'reason',500) where id=d.id;
  update public.billing_lines set active=false where document_id=d.id; row_id:=d.id;
  insert into public.service_events(service_id,type,actor,details) select service_id,'prefactura_anulada',auth.uid(),jsonb_build_object('document_id',d.id,'reason',left(p_data->>'reason',500)) from public.billing_lines where document_id=d.id;
 when 'block_add' then
  start_time:=(p_data->>'start_at')::timestamptz; end_time:=(p_data->>'end_at')::timestamptz;
  if length(trim(coalesce(p_data->>'reason','')))<3 then raise exception 'Indicá el motivo del bloqueo.'; end if;
  if exists(select 1 from public.services where state not in ('closed','cancelled') and (ambulance_id=(p_data->>'ambulance_id')::uuid or (p_data->>'staff_id')::uuid=any(crew)) and (start_at<end_time and end_at>start_time or start_at is null and date between start_time::date and end_time::date)) then raise exception 'El recurso tiene servicios asignados. Reasignalos antes de bloquearlo.'; end if;
  insert into public.resource_blocks(ambulance_id,staff_id,start_at,end_at,reason) values((p_data->>'ambulance_id')::uuid,(p_data->>'staff_id')::uuid,start_time,end_time,left(p_data->>'reason',500)) returning id into row_id;
 when 'block_void' then
  update public.resource_blocks set voided=true where id=(p_data->>'id')::uuid and not voided returning id into row_id;
  if row_id is null then raise exception 'Bloqueo inexistente o ya levantado.'; end if;
 else raise exception 'Operación desconocida.';
 end case;
 result:=jsonb_build_object('id',coalesce(row_id,s.id),'ok',true);
 insert into public.service_events(service_id,type,actor,details) values(s.id,p_action,auth.uid(),jsonb_build_object('request_id',p_request_id,'id',coalesce(row_id,s.id),'state',new_state,'cents',amount));
 insert into dispatch_private.requests(id,action,payload,result,actor) values(p_request_id,p_action,p_data,result,auth.uid());
 return result;
end $$;
revoke all on function dispatch_private.sync_service(),dispatch_private.guard_booking() from public,anon,authenticated;
revoke all on function public.dispatch_command(text,jsonb,uuid) from public,anon;
grant execute on function public.dispatch_command(text,jsonb,uuid) to authenticated;
commit;
