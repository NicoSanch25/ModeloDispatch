# Registro de verificación local — Modelo Dispatch

Fecha: **9 de octubre de 2026**. Checkout local `main`, commit `affb472`. Pruebas con fixtures ficticios, sin operaciones contra la base real. No se modificó código de la aplicación. Este registro complementa el [plan maestro](<C:/Users/USUARIO/Desktop/Nuevo Modelo Dispatch/docs/PLAN_MAESTRO_MODELO_DISPATCH.md>).

## Comprobaciones ejecutadas

| Comprobación | Resultado | Qué demuestra / límite |
|---|---|---|
| `npm run typecheck` | Correcto | Tipos; no prueba interacción ni autorización |
| `npm test` | 5/5 correctas | Utilidades de fechas/períodos, estadísticas vacías/suspendidas, URLs y CSV |
| `npm run build` | Correcto con advertencia >500 kB | JS 583,90 kB; gzip 152,12 kB. No certifica funcionamiento productivo |
| `npm audit --omit=dev --json` | 0 vulnerabilidades conocidas | Dependencias de producción a la fecha; no análisis lógico ni de dependencias dev |
| Función de conflictos de App | Casos nocturnos/roles cruzados no detectados | Ejecución aislada extraída del código, datos ficticios |
| Función duplicada de `matchesService` | Mismos casos no detectados | Ejecución aislada del módulo con cliente simulado |
| Payload `saveMatch` al editar sin incidente/avisos | Envía campos como falso/vacío | Demuestra qué se enviaría; no prueba daño ocurrido en producción |
| Acceso de lectura al sitio conocido de Vercel | Permaneció en pantalla de carga | No se obtuvo sesión/datos; causa no diagnosticada |
| RLS SQL, restore, CRUD productivo e integraciones | No ejecutados | Permanecen pendientes; no se alteraron datos reales |

## Casos de diagnóstico

1. Servicio A a las 23:30 del 09/10/2026, duración 120 min; servicio B a las 00:15 del 10/10/2026 con mismo móvil y persona. Resultado: `hard=[]`, `shared=[]`. El filtro por igualdad de fecha impide detectar el solapamiento.
2. Dos servicios a las 10:00 del mismo día, persona P1 como chofer en A y tercer integrante en B, sin móvil compartido. Resultado: `hard=[]`, `shared=[]`. Se compara cada rol sólo con el mismo rol.
3. Mismo móvil/persona, dos canchas en una misma sede y horario. Resultado: un aviso `shared`. La implementación rebaja el conflicto; la autorización operativa no está representada.
4. Edición general que omite incidente/avisos. Resultado del payload: `has_incident=false`, `was_transferred=false`, `incident_details=''`, `driver_notified=false`, `nurse_notified=false`. El modal activo omite esos campos y el servicio aplica valores predeterminados.

Fuentes: [conflictos de App](<C:/Users/USUARIO/Desktop/Nuevo Modelo Dispatch/App.tsx:247>), [servicio de coberturas](<C:/Users/USUARIO/Desktop/Nuevo Modelo Dispatch/src/services/matches.ts:83>), [modal activo](<C:/Users/USUARIO/Desktop/Nuevo Modelo Dispatch/src/components/modals/MatchModal.tsx:45>). La evaluación del día UTC frente a Argentina también muestra que `2026-10-10T01:30:00Z` es todavía 09/10 por la noche en Argentina; el widget usa fecha UTC y hora local.

## Reproducción aislada del módulo de servicio

Este diagnóstico puede repetirse con Node y TypeScript ya instalados, desde el directorio del proyecto. Lee el código histórico del commit affb472 mediante Git, lo transpila en memoria y sustituye el cliente por un objeto simulado. **No conecta a Supabase, no escribe archivos ni genera registros reales.** Los fixtures comprueban el comportamiento actual; no son una implementación de correcciones.

```javascript
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const vm = require('node:vm');
const source = execFileSync('git', ['show', 'affb472:src/services/matches.ts'], { encoding: 'utf8' })
  .replace(/^import .*;\r?\n/gm, '');
let saved;
const fake = {
  from: () => ({ update: payload => {
    saved = payload;
    return { eq: async () => ({ error: null }) };
  } })
};
const sandbox = { exports: {}, supabase: fake };
vm.createContext(sandbox);
vm.runInContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, sandbox);
const h = sandbox.exports.matchHelpers;
const base = {
  id: 'A', date: '2026-10-09', time: '23:30', durationMinutes: 120,
  status: 'Confirmed', location: 'Sitio', fieldNumber: '1',
  ambulanceId: 'V1', driverId: 'P1'
};
console.log(h.getConflicts(base, [
  { ...base, id: 'B', date: '2026-10-10', time: '00:15' }
]));
console.log(h.getConflicts({ ...base, time: '10:00', ambulanceId: undefined }, [
  { ...base, id: 'C', time: '10:00', ambulanceId: undefined,
    driverId: undefined, thirdCrewId: 'P1' }
]));
sandbox.exports.matchesService.saveMatch({
  id: 'A', date: '2026-10-09', time: '10:00', type: 'Evento',
  location: 'Sitio', status: 'Confirmed'
}).then(() => console.log({
  has_incident: saved.has_incident,
  was_transferred: saved.was_transferred,
  incident_details: saved.incident_details,
  driver_notified: saved.driver_notified,
  nurse_notified: saved.nurse_notified
}));
```

## Control final del alcance

Los cambios guardados corresponden únicamente a documentación dentro de `docs/`. El build generó artefactos locales ignorados por Git. No se aplicaron migraciones, no se activaron proveedores ni se publicaron cambios. Las cantidades actuales de recursos y las capacidades comerciales de GPS/WhatsApp/facturación siguen sin confirmación.
