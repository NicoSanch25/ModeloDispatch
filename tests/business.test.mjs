import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { database, operator, stranger, customer, vehicle, driver, nurse } from './fixtures/business-db.mjs';

const migration = await readFile(new URL('../supabase/migrations/202610090003_business_core.sql', import.meta.url), 'utf8');
async function command(db,action,payload,id=crypto.randomUUID()) {
 return (await db.query('select public.dispatch_command($1,$2::jsonb,$3::uuid) result',[action,JSON.stringify(payload),id])).rows[0].result;
}
async function service(db,id) {return (await db.query('select * from public.services where id=$1',[id])).rows[0];}
const quoteInput={client_id:customer,kind:'coverage',title:'Cobertura de prueba',date:'2035-01-01',time:'10:00',duration_minutes:90,valid_until:'2035-01-01',cents:1500000,estimated_cost_cents:600000};

test('migración repetible conserva fuentes e historial; no habilita escrituras directas', async()=>{
 const db=await database();
 try {
  await db.exec(migration);
  assert.equal((await db.query('select count(*) n from public.matches')).rows[0].n,1);
  assert.equal((await db.query('select count(*) n from public.services')).rows[0].n,1);
  assert.equal((await db.query('select state from public.services')).rows[0].state,'closed');
  await db.exec('set role authenticated');
  assert.equal((await db.query('select count(*) n from public.services')).rows[0].n,1);
  await assert.rejects(db.exec("update public.services set reviewed=true"),/permission denied/);
  await db.exec(`reset role; update dispatch_private.members set role='operator'; set role authenticated`);
  assert.equal((await db.query('select public.dispatch_capabilities() value')).rows[0].value.finance,false);
  await assert.rejects(command(db,'quote_save',quoteInput),/administración/);
  assert.equal((await db.query('select count(*) n from public.quote_versions')).rows[0].n,0);
  await db.exec(`reset role; update dispatch_private.members set role='admin'; set role authenticated`);
  await db.exec(`select set_config('request.jwt.claim.sub','${stranger}',false)`);
  assert.equal((await db.query('select count(*) n from public.services')).rows[0].n,0);
  await assert.rejects(command(db,'quote_save',quoteInput),/no autorizado/);
  await db.exec(`reset role; delete from dispatch_private.members; set role authenticated; select set_config('request.jwt.claim.sub','${operator}',false)`);
  assert.equal((await db.query('select count(*) n from public.services')).rows[0].n,0);
  await assert.rejects(command(db,'quote_save',quoteInput),/no autorizado/);
  await db.exec('reset role; set role anon');
  await assert.rejects(db.query('select * from public.services'),/permission denied/);
  await assert.rejects(command(db,'quote_save',quoteInput),/permission denied/);
 } finally {await db.close();}
});
test('cotización → servicio → cierre → gasto → prefactura → cobros parciales y correcciones',async()=>{
 const db=await database();
 try {
  const request=crypto.randomUUID();
  const q=await command(db,'quote_save',quoteInput,request);
  assert.deepEqual(await command(db,'quote_save',quoteInput,request),q);
  await assert.rejects(command(db,'quote_save',{...quoteInput,cents:1},request),/otra operación/);
  await command(db,'quote_save',{...quoteInput,id:q.id,version:1,cents:1800000});
  assert.equal((await db.query('select cents from public.quote_versions where quote_id=$1 and version=1',[q.id])).rows[0].cents,1500000);
  const accepted=crypto.randomUUID();
  await command(db,'quote_state',{id:q.id,version:2,state:'accepted'},accepted);
  await command(db,'quote_state',{id:q.id,version:2,state:'accepted'},accepted);
  const sid=(await db.query('select service_id from public.quotes where id=$1',[q.id])).rows[0].service_id;
  let s=await service(db,sid);
  await assert.rejects(command(db,'service_state',{service_id:sid,version:s.version,state:'en_route'}),/Asigná/);
  await db.query('update public.matches set ambulance_id=$1,driver_id=$2,nurse_id=$3 where id=$4',[vehicle,driver,nurse,s.coverage_id]);
  s=await service(db,sid);
  await assert.rejects(command(db,'service_review',{service_id:sid,version:s.version}),/cerrá/);
  await assert.rejects(command(db,'service_state',{service_id:sid,version:s.version,state:'closed'}),/incoherente/);
  for (const state of ['en_route','in_service','finished','returning','closed']) {
   s=await service(db,sid); await command(db,'service_state',{service_id:sid,version:s.version,state});
   assert.equal((await service(db,sid)).state,state);
  }
  s=await service(db,sid);
  const cost=await command(db,'cost_add',{service_id:sid,version:s.version,cents:700000,date:'2035-01-01',category:'Personal',description:'Honorarios'});
  await assert.rejects(command(db,'service_review',{service_id:sid,version:s.version}),/cambió/);
  s=await service(db,sid); await command(db,'service_review',{service_id:sid,version:s.version});
  const invoice=await command(db,'billing_create',{client_id:customer,service_ids:[sid],date:'2035-01-01',due_date:'2035-01-31'});
  await assert.rejects(db.query("update public.matches set date='2035-01-02' where id=$1",[s.coverage_id]),/prefacturado/);
  await assert.rejects(command(db,'billing_create',{client_id:customer,service_ids:[sid],date:'2035-01-01',due_date:'2035-01-31'}),/one_active_billing/);
  assert.equal((await db.query('select count(*) n from public.billing_documents')).rows[0].n,1,'documento y líneas se revierten juntos');
  const payment=await command(db,'payment_add',{document_id:invoice.id,cents:400000,date:'2035-01-02',method:'Efectivo'});
  await assert.rejects(command(db,'payment_add',{document_id:invoice.id,cents:1500000,date:'2035-01-02'}),/saldo pendiente/);
  await assert.rejects(command(db,'billing_void',{id:invoice.id,reason:'Corrección de precio'}),/cobros/);
  await command(db,'payment_void',{id:payment.id,reason:'Cobro cargado por error'});
  await command(db,'billing_void',{id:invoice.id,reason:'Corrección administrativa'});
  await command(db,'cost_void',{id:cost.id,reason:'Gasto duplicado'});
  assert.equal((await service(db,sid)).reviewed,false);
  assert.equal((await db.query('select count(*) n from public.service_costs')).rows[0].n,1);
  assert.ok((await db.query('select count(*) n from public.service_events')).rows[0].n>10);
 } finally {await db.close();}
});
test('reservas cruzadas, personal en roles diferentes, mantenimiento y bloqueos se validan en servidor',async()=>{
 const db=await database();
 try {
  await db.query(`insert into public.matches(date,time,location,status,duration_minutes,ambulance_id,driver_id) values('2035-01-01','23:30','Evento','Pending',90,$1,$2)`,[vehicle,driver]);
  await assert.rejects(db.query(`insert into public.transfers(date,status,driver_id,planned_start_at,planned_end_at) values('2035-01-02','Pending',$1,'2035-01-02T00:30:00-03','2035-01-02T02:00:00-03')`,[driver]),/Conflicto/);
  await assert.rejects(db.query(`insert into public.matches(date,time,location,status,duration_minutes,nurse_id) values('2035-01-02','01:05','Evento','Pending',60,$1)`,[driver]),/Conflicto/);
  await db.query(`insert into public.transfers(date,status,driver_id,planned_start_at,planned_end_at) values('2035-01-02','Pending',$1,'2035-01-02T01:15:00-03','2035-01-02T02:00:00-03')`,[driver]);
  await assert.rejects(db.query(`insert into public.transfers(date,status,driver_id) values('2035-01-03','Pending',$1)`,[nurse]),/salida y regreso/);
  await assert.rejects(db.query(`insert into public.matches(date,time,status,duration_minutes,driver_id,nurse_id) values('2035-01-03','10:00','Pending',60,$1,$1)`,[nurse]),/dos puestos/);
  const blocked=await command(db,'block_add',{staff_id:nurse,start_at:'2035-01-03T10:00:00-03',end_at:'2035-01-03T12:00:00-03',reason:'Licencia'});
  await assert.rejects(db.query(`insert into public.matches(date,time,status,duration_minutes,nurse_id) values('2035-01-03','11:00','Pending',60,$1)`,[nurse]),/bloqueo/);
  await command(db,'block_void',{id:blocked.id});
  await db.exec("update public.ambulances set maintenance_status='InRepair'");
  await assert.rejects(db.query(`insert into public.matches(date,time,status,duration_minutes,ambulance_id) values('2035-01-04','10:00','Pending',60,$1)`,[vehicle]),/reparación/);
 } finally {await db.close();}
});
