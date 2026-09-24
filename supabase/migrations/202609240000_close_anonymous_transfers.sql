-- Emergency fix applied through Supabase SQL Editor on 2026-09-24.
begin;
alter policy "Permitir todo de forma anonima" on public.transfers
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);
revoke all on table public.transfers from anon;
commit;
