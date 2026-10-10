import React from 'react';
import { createRoot } from 'react-dom/client';
import { BusinessWorkspace } from '../../src/components/BusinessWorkspace';
import '../../index.css';

const customer='10000000-0000-0000-0000-000000000001',vehicle='20000000-0000-0000-0000-000000000001';
createRoot(document.getElementById('root')!).render(<main className="dispatch-shell min-h-screen p-3 pb-8"><BusinessWorkspace clients={[{id:customer,name:'Cliente de prueba'}]} staff={[{id:'30000000-0000-0000-0000-000000000001',name:'Chofer de prueba',role:'Chofer',phone:''},{id:'30000000-0000-0000-0000-000000000002',name:'Enfermero de prueba',role:'Enfermero/a',phone:''}]} ambulances={[{id:vehicle,number:'1',isOutsourced:false,maintenance:{status:'Active'}}]} onChanged={async()=>{}} onEdit={async service=>{await fetch('/__business_fixture/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'fixture_assign_service',payload:{id:service.id}})});}}/><p className="fixed bottom-0 left-0 z-[100] bg-amber-100 px-2 text-xs text-amber-900">Prueba aislada · registros ficticios · PostgreSQL local</p></main>);
