import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { database } from '../fixtures/business-db.mjs';
const businessDb=await database();
const allowedTables=new Set(['services','service_costs','quotes','quote_versions','billing_documents','billing_lines','payments','resource_blocks','service_events']);

const mock = fileURLToPath(new URL('./supabase.ts', import.meta.url));
const server = await createServer({
  configFile: false,
  plugins: [
    { name:'business-fixture-db',configureServer(server) {server.middlewares.use(async(req,res,next)=>{
      if(!req.url?.startsWith('/__business_fixture/'))return next();
      res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
      try {
        let data;
        if(req.url.startsWith('/__business_fixture/table')) {
          const table=new URL(req.url,'http://127.0.0.1').searchParams.get('name');
          if(!allowedTables.has(table))throw new Error('Tabla fuera de la prueba.');
          data=(await businessDb.query(`select row_to_json(t) value from public.${table} t order by ${table==='quote_versions'?'quote_id,version':'id'}`)).rows.map(row=>row.value);
        }else{
          let body='';for await(const chunk of req)body+=chunk;
          const {action,payload}=JSON.parse(body);
          if(action==='dispatch_capabilities')data=(await businessDb.query('select public.dispatch_capabilities() value')).rows[0].value;
          else if(action==='fixture_assign_service') {
            const service=(await businessDb.query('select * from public.services where id=$1',[payload.id])).rows[0];
            if(!service?.coverage_id)throw new Error('Sólo cobertura de prueba.');
            await businessDb.query('update public.matches set ambulance_id=$1,driver_id=$2,nurse_id=$3 where id=$4',['20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',service.coverage_id]);
            data={ok:true};
          }
          else if(action==='dispatch_command')data=(await businessDb.query('select public.dispatch_command($1,$2::jsonb,$3::uuid) value',[payload.p_action,JSON.stringify(payload.p_data),payload.p_request_id])).rows[0].value;
          else throw new Error('Operación fuera de la prueba.');
        }
        res.end(JSON.stringify({data,error:null}));
      }catch(e){res.end(JSON.stringify({data:null,error:{message:e.message}}));}
    });}},
    { name: 'isolated-supabase-fixtures', enforce: 'pre', resolveId(source) {
      if (source.endsWith('/lib/supabase')) return mock;
    } },
    react()
  ],
  server: { host: '127.0.0.1', port: 3100, strictPort: true },
  clearScreen: false
});
await server.listen();
console.log('Isolated UI: http://127.0.0.1:3100/tests/ui/harness.html');
