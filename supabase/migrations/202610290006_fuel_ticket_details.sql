-- Datos del ticket de combustible: número (opcional), importe pagado y kilometraje
-- del móvil al momento de la carga. Los movimientos anteriores quedan sin estos datos.
-- Idempotente: se puede aplicar más de una vez.
alter table public.fuel_records
  add column if not exists ticket_number text,
  add column if not exists amount numeric(12, 2),
  add column if not exists odometer_km integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fuel_records_amount_non_negative') then
    alter table public.fuel_records
      add constraint fuel_records_amount_non_negative check (amount is null or amount >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fuel_records_odometer_non_negative') then
    alter table public.fuel_records
      add constraint fuel_records_odometer_non_negative check (odometer_km is null or odometer_km >= 0);
  end if;
end $$;

comment on column public.fuel_records.ticket_number is 'Número del ticket de la estación. Opcional.';
comment on column public.fuel_records.amount is 'Importe pagado en pesos, tal como figura en el ticket.';
comment on column public.fuel_records.odometer_km is 'Kilometraje del móvil al momento de la carga.';
