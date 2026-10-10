import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
export const operator='00000000-0000-0000-0000-000000000001';
export const stranger='00000000-0000-0000-0000-000000000002';
export const customer='10000000-0000-0000-0000-000000000001';
export const vehicle='20000000-0000-0000-0000-000000000001';
export const driver='30000000-0000-0000-0000-000000000001';
export const nurse='30000000-0000-0000-0000-000000000002';
export async function database() {
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth; create schema dispatch_private;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table dispatch_private.members(user_id uuid primary key,enabled boolean not null default true);
 insert into dispatch_private.members(user_id) values('${operator}');
 create function dispatch_private.is_operator() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from dispatch_private.members where user_id=auth.uid() and enabled) $$;
 grant usage on schema dispatch_private,auth to authenticated; grant execute on function dispatch_private.is_operator(),auth.uid() to authenticated;
 create table public.clients(id uuid primary key default gen_random_uuid(),name text not null);
 create table public.staff(id uuid primary key default gen_random_uuid(),name text);
 create table public.ambulances(id uuid primary key default gen_random_uuid(),number text,maintenance_status text);
 create table public.matches(id uuid primary key default gen_random_uuid(),date date not null,time time not null,location text,type text,status text,duration_minutes integer,extension_minutes integer,client_id uuid references public.clients(id),ambulance_id uuid references public.ambulances(id),driver_id uuid references public.staff(id),nurse_id uuid references public.staff(id),third_crew_id uuid references public.staff(id),incident_details text);
 create table public.transfers(id uuid primary key default gen_random_uuid(),date date not null,origin text,destination text,status text,driver_id uuid references public.staff(id),amount_to_bill numeric,observations text);
 insert into public.clients values('${customer}','Cliente de prueba');
 insert into public.staff values('${driver}','Chofer de prueba'),('${nurse}','Enfermero de prueba');
 insert into public.ambulances values('${vehicle}','1','Active');
 insert into public.matches(date,time,location,status,duration_minutes) values('2026-01-01','10:00','Histórico','Completed',90);
 select set_config('request.jwt.claim.sub','${operator}',false);`);
 await db.exec(await readFile(new URL('../../supabase/migrations/202610090003_business_core.sql',import.meta.url),'utf8'));
 return db;
}
