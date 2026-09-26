-- Allow a fuel or service-station purchase to be attributed to a driver
-- who is not part of the permanent staff directory.
alter table public.fuel_records
  add column if not exists external_driver_name text;

alter table public.fuel_records
  alter column driver_id drop not null;

comment on column public.fuel_records.external_driver_name is
  'Free-text driver name used when the person is not registered in staff.';
