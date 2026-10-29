-- Publica los cambios de las tablas operativas para que todos los operadores
-- vean al instante lo que carga otro (la app ya se suscribe a estos eventos).
-- Idempotente: solo agrega las tablas que existen y todavía no están publicadas.
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['matches', 'transfers', 'staff', 'ambulances', 'fuel_records', 'locations', 'clients', 'services'] loop
    if to_regclass('public.' || t) is not null and not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
