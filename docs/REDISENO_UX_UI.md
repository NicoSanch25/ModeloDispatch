# Rediseño UX/UI — Modelo Dispatch

Documento vivo del rediseño de experiencia de uso. Se actualiza al cerrar cada mejora para que el plan y su estado no dependan de un chat.

- **Inicio:** 11/10/2026, revisión completa sobre `main` @ `513dd08` (28 tests, typecheck y build correctos).
- **Objetivo:** que un operador bajo presión entienda el estado de la operación de un vistazo y resuelva lo urgente con pocos toques, sobre todo desde el celular.
- **Fuera de alcance:** GPS, WhatsApp, ARCA y cambios de base de datos. Siguen el [plan maestro](PLAN_MAESTRO_MODELO_DISPATCH.md).

## Principios de diseño

Respetan las preferencias registradas en [`AGENTS.md`](../AGENTS.md):

1. **Sin botones flotantes (FAB).** Las acciones van dentro de los flujos, encabezados o menús.
2. **Mobile first y compacto.** Poco relleno interno; lo importante entra en la primera pantalla sin desplazarse.
3. **Íconos claros antes que abreviaturas**, siempre acompañados de texto o `aria-label`.
4. **Fechas con el selector propio** (`DateInput`), nunca el input nativo de iOS a la vista.
5. **Un mismo patrón para lo mismo:** un modal (`ModalShell`), un sistema de avisos (`notify`/`askConfirm`), una navegación.
6. **Accesible:** objetivos táctiles de 44 px o más, foco visible, Escape cierra, textos en español y respeto de «reducir movimiento».

## Forma de trabajo

- Una mejora por commit, con capturas antes/después en 390×844 (celular) y 1366×850 (escritorio).
- PR chicos y en borrador hasta que Nico los revise. Si un PR depende de otro todavía abierto, se apila sobre su rama.
- Antes de cada push: `npm run typecheck && npm test && npm run build`.
- Prueba visual con datos ficticios, sin tocar Supabase real: `node tests/ui/server.mjs` y abrir `http://127.0.0.1:3100/tests/ui/harness.html`.

## Estado por etapa

| Etapa | Contenido | Estado |
|---|---|---|
| 1. Arreglos | Errores 1, 2, 4, 5, 8 y 9 de la revisión | Hecha · PR #1 (`6286d84`), mergeado el 12/10 |
| 2. Base de diseño | `ModalShell`, avisos y confirmaciones propios, validación en español, transiciones | Hecha · PR #1 (`0986be4`), mergeado el 12/10 |
| 3. Navegación, listas y sistema visual móvil | Ver detalle abajo | Hecha · PR #3 |
| 4. Mecánicas operativas | Ver detalle abajo | Hecha · PR #3 y PR #6 |

### Etapa 3 — Navegación, listas y sistema visual móvil

| # | Mejora | Estado |
|---|---|---|
| 3.1 | Barra de navegación inferior en celular (Tablero, Coberturas, Traslados, Flota, Más) y título de la sección en el encabezado | Hecha · en revisión |
| 3.2 | Traslados en tarjetas en celular: estado y Editar siempre visibles, sin desplazamiento lateral (error 3) | Hecha · en revisión |
| 3.3 | Historial y Personal en tarjetas en celular | Hecha · Personal en tarjetas compactas con teléfono para llamar; Historial ya usaba tarjetas |
| 3.4 | Esqueletos de carga y estados vacíos con una acción clara | Hecha · esqueleto sólo en la primera carga; al actualizar se mantiene la pantalla con un aviso «Actualizando…» |
| 3.5 | Colores de estado unificados (pendiente, confirmada, en curso, cerrada, suspendida) en tablero, agenda, flota y administración | Hecha · `src/utils/status.ts` y `StatusChip` |
| 3.6 | Legibilidad: textos de 10 px a 12 px como mínimo y grises con contraste AA | Hecha · `text-slate-400` pasa a `text-slate-500` sobre fondo claro (el menú oscuro no cambia) |
| 3.7 | Tablero: dato repetido en «Pendientes» y barras planas en días sin actividad (error 12) | Hecha |

### Pedidos de Nico (22/10)

| # | Mejora | Estado |
|---|---|---|
| N.1 | Licencia de conducir de choferes (número, categoría, vencimiento): avisos de vencida y por vencer a 30 días en tablero y Personal, y marca al asignar | Hecha · migración `202610220004` aplicada el 29/10 |
| N.2 | Combustible: orden por fecha, resumen mensual por móvil, corregir y eliminar movimientos, litros con coma | Hecha |
| N.3 | Tickets de combustible: número (opcional), importe y kilometraje; gasto del mes y por móvil; aviso si el kilometraje es menor al último del móvil | Hecha · PR #4 · migración `202610290006` aplicada el 29/10 |

### Etapa 4 — Mecánicas operativas

| # | Mejora | Estado |
|---|---|---|
| 4.1 | Franja «Requiere atención»: servicios sin recursos, cruces, vencidos sin cerrar, móviles bloqueados con asignaciones | Hecha · primero lo urgente (rojo) y después lo pendiente (ámbar); con más de cuatro avisos se ven tres y el resto con «Ver N avisos más». Reglas en `src/utils/attention.ts` |
| 4.2 | Cambio de estado en un toque desde la tarjeta (traslados) y confirmar cobertura en un toque | Hecha · Finalizar traslado, Confirmar y Finalizar cobertura; Traslados filtra Pendientes por defecto |
| 4.3 | Alertas de vencimientos de flota (VTV, seguro, service por km) con días restantes | Hecha · VTV, seguro y service (por km, por fecha o ambos; avisa a 1.000 km o 30 días) en Flota, detalle del móvil y tablero. El kilometraje toma el mayor entre el del móvil y el último ticket. Migración `202610310007` aplicada el 31/10 |
| 4.4 | Búsqueda global (servicio, móvil, persona) desde el encabezado | Hecha · botón Buscar, tecla `/` o Ctrl+K (`src/utils/search.ts`) |
| 4.5 | Actualización en tiempo real entre operadores (Supabase Realtime) | Hecha · migración `202610290005` aplicada el 29/10 |

### Etapa 5 — Extras del plan

| # | Mejora | Estado |
|---|---|---|
| 5.1 | Duplicar cobertura o traslado (botón en la tarjeta y en el formulario) | Hecha · la copia va a la semana siguiente, queda pendiente y avisa que es una copia. No copia número de hoja, horas reales, kilómetros, observaciones, avisos ni reportes (`src/utils/duplicate.ts`) |
| 5.2 | Vista «hoy por móvil» en la Agenda de servicios | Hecha · botones «Por horario» / «Por móvil» (se recuerda en el navegador): servicios agrupados por móvil con su estado, los que no tienen móvil y los móviles libres (`servicesByAmbulance`) |
| 5.3 | Atajos de teclado en escritorio | Hecha · `/` o Ctrl+K buscar, N nueva cobertura, T nuevo traslado, A agenda del día, 1–4 secciones, ? ayuda. No actúan mientras se escribe ni con una ventana abierta (`src/utils/shortcuts.ts`) |
| 5.4 | Instalar como app en el celular | Hecha · `manifest.webmanifest`, íconos a partir de `public/logo.png` y etiquetas para iPhone. En iPhone: Safari → Compartir → «Agregar a inicio»; en Android: menú ⋮ → «Instalar app». La sesión se inicia una vez dentro de la app instalada. Sin service worker a propósito: el sitio se sirve con `no-store` y no queremos versiones viejas guardadas en el teléfono |
| 5.5 | Cola sin conexión | Pendiente a propósito · guardar sin señal y sincronizar después puede duplicar o pisar servicios (versiones, cruces y permisos se validan en el servidor). Requiere diseño propio: qué se puede cargar sin conexión, cómo se muestran los conflictos y pruebas en campo |
| 5.6 | Plantillas de servicio | Cubierta por «Duplicar» (5.1). Si hace falta, se agregan plantillas con nombre más adelante |

## Errores de la revisión del 11/10

| # | Gravedad | Problema | Estado |
|---|---|---|---|
| 1 | Alta | Texto con codificación rota en el formulario de móvil | Resuelto en PR #1 |
| 2 | Alta | Se podía guardar un traslado vacío | Resuelto en PR #1 |
| 3 | Media | Tabla de Traslados cortada en celular (estado y Editar fuera de vista) | Resuelto en 3.2 |
| 4 | Media | Cobertura y Móvil no cerraban con Escape | Resuelto en PR #1 |
| 5 | Media | Guardar al fondo del formulario de Cobertura | Resuelto en PR #1 |
| 6 | Media | Validación nativa en inglés y sin marcar el campo | Resuelto en PR #1 |
| 7 | Media | `alert()`/`confirm()` del navegador y sin confirmación al guardar | Resuelto en PR #1 |
| 8 | Baja | Texto desactualizado en Agenda Diaria | Resuelto en PR #1 |
| 9 | Baja | Fechas de VTV y batería con input nativo | Resuelto en PR #1 |
| 10 | Baja | Clases `animate-in` sin efecto | Resuelto en PR #1 |
| 11 | Baja | Sin título de sección en el encabezado móvil | Resuelto en 3.1 |
| 12 | Baja | Tablero: dato repetido y barras planas | Resuelto en 3.7 |

## Registro

- **11/10/2026** — Revisión, propuesta y plan en 4 etapas. Etapas 1 y 2 implementadas en PR #1.
- **12/10/2026** — Se incorporan al plan la franja «Requiere atención», colores de estado unificados, legibilidad y confirmar en un toque. Este documento pasa a ser la referencia del rediseño. Se inicia la Etapa 3.
- **12/10/2026** — 3.1: barra inferior en celular, título de sección visible, secciones definidas en un único lugar (`src/components/AppNavigation.tsx`) y menú que se desplaza en celulares bajos.
- **12/10/2026** — 3.2: Traslados en tarjetas en celular y tablet (horario, estado, origen → destino, chofer, móvil y Editar de 44 px), con faltantes marcados en ámbar. La lista pasa a `src/components/TransfersList.tsx`; el horario usa `transferWindow` de `src/utils/agenda.ts`, el mismo cálculo que la Agenda.
- **12/10/2026** — PR #1 (etapas 1 y 2) mergeado en `main` (`811b309`).
- **22/10/2026** — Se retoma el proyecto. Licencias de choferes (N.1) y arreglos de combustible (N.2): la lista salía ordenada por id y el consumo mensual del móvil corría las cargas del día 1 al mes anterior. Etapa 3.3, 3.4, 3.6 y 3.7, franja de avisos arriba del tablero y VTV con días restantes.
- **29/10/2026** — Revisión de fallos: el campo de incidente aceptaba una sola letra (modal definido dentro de `App`), hooks después de un `return` en Lugar y Contraseña, meses corridos por UTC en coberturas, mensajes de error de Supabase traducidos (`friendlyError`) y código muerto eliminado. Colores de estado (3.5), acciones de un toque (4.2), búsqueda global (4.4), actualización automática (4.5), modales descargados aparte (pantalla inicial 40 % más liviana) y encabezados de sección sin tarjeta en celular.
- **29/10/2026** — Supabase restaurado; migraciones `202610220004` (licencias) y `202610290005` (tiempo real) aplicadas y verificadas. El trabajo vuelve a una sola sesión («Modelo Dispatch · Rediseño UX/UI»).
- **29/10/2026** — N.3: tickets de combustible. Importe obligatorio (se escribe como en el ticket: «45.000,50»), kilometraje obligatorio al cargar litros y número de ticket opcional; los movimientos anteriores se pueden corregir sin importe. Gasto del mes y por móvil en el resumen, y aviso antes de guardar un kilometraje menor al último registrado del móvil.
- **31/10/2026** — Publicación: el dominio de producción de Vercel (`modelo-dispatch-7eeh.vercel.app`) respondía «404 DEPLOYMENT_NOT_FOUND» y los sitios de Netlify mostraban «Configuración pendiente» porque no tenían la URL y la clave pública de Supabase. Se agrega `.env.production` con esos datos públicos para que cualquier alojamiento compile la app conectada. El dominio de Vercel hay que revisarlo desde el panel de Vercel.
- **31/10/2026** — Nico confirma la dirección de producción: **https://modelodispatch.vercel.app** (Vercel). Queda anotada en `AGENTS.md` para no confundirla con `modelo-dispatch-7eeh.vercel.app` ni con los sitios de Netlify.
- **31/10/2026** — Etapa 4 completa (PR #6): franja «Requiere atención» con móviles en taller, cruces y servicios sin cerrar; seguro y service de flota (migración `202610310007` aplicada). Etapa 5: duplicar servicios, agenda por móvil, atajos de teclado e instalación como app.
