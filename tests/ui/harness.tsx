import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../App';
import '../../index.css';

createRoot(document.getElementById('root')!).render(<><App /><p className="fixed bottom-0 left-0 z-[100] bg-amber-100 px-2 text-xs text-amber-900">Prueba aislada · datos ficticios · sin conexión a Supabase</p></>);
