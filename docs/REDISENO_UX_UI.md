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
| 1. Arreglos | Errores 1, 2, 4, 5, 8 y 9 de la revisión | Hecha · PR #1 (`6286d84`), pendiente de merge |
| 2. Base de diseño | `ModalShell`, avisos y confirmaciones propios, validación en español, transiciones | Hecha · PR #1 (`0986be4`), pendiente de merge |
| 3. Navegación, listas y sistema visual móvil | Ver detalle abajo | En curso |
| 4. Mecánicas operativas | Ver detalle abajo | Pendiente |

### Etapa 3 — Navegación, listas y sistema visual móvil

| # | Mejora | Estado |
|---|---|---|
| 3.1 | Barra de navegación inferior en celular (Tablero, Coberturas, Traslados, Flota, Más) y título de la sección en el encabezado | Hecha · en revisión |
| 3.2 | Traslados en tarjetas en celular: estado y Editar siempre visibles, sin desplazamiento lateral (error 3) | Hecha · en revisión |
| 3.3 | Historial y Personal en tarjetas en celular | Pendiente |
| 3.4 | Esqueletos de carga y estados vacíos con una acción clara | Pendiente |
| 3.5 | Colores de estado unificados (pendiente, confirmada, en curso, cerrada, suspendida) en tablero, agenda, flota y administración | Pendiente |
| 3.6 | Legibilidad: textos de 10 px a 12 px como mínimo y grises con contraste AA | Pendiente |
| 3.7 | Tablero: dato repetido en «Pendientes» y barras planas en días sin actividad (error 12) | Pendiente |

### Etapa 4 — Mecánicas operativas

| # | Mejora | Estado |
|---|---|---|
| 4.1 | Franja «Requiere atención»: servicios sin recursos, cruces, vencidos sin cerrar, móviles bloqueados con asignaciones | Pendiente |
| 4.2 | Cambio de estado en un toque desde la tarjeta (traslados) y confirmar cobertura en un toque | Pendiente |
| 4.3 | Alertas de vencimientos de flota (VTV, seguro, service por km) con días restantes | Pendiente |
| 4.4 | Búsqueda global (servicio, móvil, persona) desde el encabezado | Pendiente |
| 4.5 | Actualización en tiempo real entre operadores (Supabase Realtime) | Pendiente |

Después, según prioridad: duplicar servicio y plantillas, vista «hoy por móvil», atajos de teclado en escritorio, cola sin conexión e instalación como app (PWA).

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
| 12 | Baja | Tablero: dato repetido y barras planas | Etapa 3.7 |

## Registro

- **11/10/2026** — Revisión, propuesta y plan en 4 etapas. Etapas 1 y 2 implementadas en PR #1.
- **12/10/2026** — Se incorporan al plan la franja «Requiere atención», colores de estado unificados, legibilidad y confirmar en un toque. Este documento pasa a ser la referencia del rediseño. Se inicia la Etapa 3.
- **12/10/2026** — 3.1: barra inferior en celular, título de sección visible, secciones definidas en un único lugar (`src/components/AppNavigation.tsx`) y menú que se desplaza en celulares bajos.
- **12/10/2026** — 3.2: Traslados en tarjetas en celular y tablet (horario, estado, origen → destino, chofer, móvil y Editar de 44 px), con faltantes marcados en ámbar. La lista pasa a `src/components/TransfersList.tsx`; el horario usa `transferWindow` de `src/utils/agenda.ts`, el mismo cálculo que la Agenda.
