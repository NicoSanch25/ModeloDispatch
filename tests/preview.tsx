import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { OperationsInsights } from '../src/components/OperationsInsights';
import { localDate } from '../src/utils/statistics';
import '../index.css';
function Preview() {
 const [action,setAction] = useState('Sin acciones');
 const date = localDate();
 return <main style={{maxWidth:1100, margin:'auto', padding:16}}><p>Prueba visual · datos ficticios</p><OperationsInsights matches={[{id:'demo',date,time:'10:00',type:'Evento',location:'Sede de prueba',durationMinutes:90,status:'Pending'}]} transfers={[{id:'demo-trip', date,status:'Completed'}]} fuelRecords={[{id:'demo-fuel',date,ambulanceId:'demo',driverId:'demo',fuelType:'Diesel',liters:45}]} ambulances={[{id:'demo',number:'01',isOutsourced:false,maintenance:{status:'Active',vtvExpiration:'2025-01-01'}}]} onNewMatch={()=>setAction('Nueva cobertura')} onNewTransfer={()=>setAction('Nuevo traslado')} onAgenda={()=>setAction('Agenda de hoy')} onFleet={()=>setAction('Flota')} /><output>{action}</output></main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
