-- Licencia de conducir del personal (choferes): número, categoría y vencimiento,
-- para controlar quién la tiene vencida o por vencer.
alter table public.staff
  add column if not exists license_number text,
  add column if not exists license_category text,
  add column if not exists license_expiration date;

comment on column public.staff.license_expiration is
  'Fecha de vencimiento de la licencia de conducir. Válida hasta ese día inclusive.';
