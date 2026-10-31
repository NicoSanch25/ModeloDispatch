-- Vencimientos de flota: seguro y próximo service (por kilometraje, por fecha o ambos).
-- Los móviles existentes quedan sin estos datos hasta que se carguen.
-- Idempotente: se puede aplicar más de una vez.
alter table public.ambulances
  add column if not exists insurance_expiration date,
  add column if not exists next_service_km integer,
  add column if not exists next_service_date date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ambulances_next_service_km_non_negative') then
    alter table public.ambulances
      add constraint ambulances_next_service_km_non_negative check (next_service_km is null or next_service_km >= 0);
  end if;
end $$;

comment on column public.ambulances.insurance_expiration is 'Vencimiento de la póliza de seguro. Válida hasta ese día inclusive.';
comment on column public.ambulances.next_service_km is 'Kilometraje en el que corresponde el próximo service.';
comment on column public.ambulances.next_service_date is 'Fecha límite del próximo service, si se programa por tiempo.';
