# Primera entrega de estabilización — Modelo Dispatch

Fecha: **9 de octubre de 2026**. Rama: `codex/estabilizacion-dispatch`. Base de trabajo: `affb472`. Implementa correcciones locales de la Fase 0 del [plan maestro](<C:/Users/USUARIO/Desktop/Nuevo Modelo Dispatch/docs/PLAN_MAESTRO_MODELO_DISPATCH.md>). No equivale a implementar todas las fases del plan ni a certificar producción.

## Cambios entregados

| Cambio | Comportamiento resultante |
|---|---|
| Guardado parcial de cobertura | No envía incidente, avisos o asignaciones omitidas como falsos/vacíos. Valores explícitos sí permiten corregir/limpiar |
| Comprobación de actualización | La edición de cobertura y los avisos verifican que se haya actualizado una fila visible; no anuncian éxito si no existe o no es accesible |
| Conflictos comunes | Tablero, helpers del servicio y carga rápida usan el mismo algoritmo; fechas completas de Argentina, cruces de medianoche, extensiones, margen de 15 min y personas en cualquier puesto |
| Recursos compartidos | Dos canchas en una sede no rebajan automáticamente el conflicto de persona/móvil |
| Servicios cerrados | Completed y Suspended no generan ocupación prevista ni conflictos activos |
| Flota | Etiqueta “Según agenda”, muestra cobertura prevista y advierte verificar traslados/regreso; no declara posición GPS ni disponibilidad confirmada |
| Formularios | Hooks con orden estable en cobertura/personal/clientes/carga rápida; cierre/reapertura estables |
| Traslado | Espera el guardado, bloquea doble envío y cierre mientras guarda, conserva formulario con error y permite reintentar; chofer vacío se envía como null |
| Auditoría de cobertura | Se guarda después del cambio; error explícito si el historial falla. Añade fecha, enfermero, auxiliar, cancha y duración al registro de cambios |
| Avisos manuales | La UI modifica sólo registros cuyo guardado se confirmó; fallos masivos quedan pendientes y se informan |
| Duración | Campo real de duración estimada; editar ya no fuerza siempre 90 minutos |
| Nuevo servicio | Un borrador con fecha se presenta como “Nueva Cobertura”; no ofrece eliminar un registro inexistente |
| Fechas móviles | Componente con fecha visible DD/MM/AAAA y selector nativo transparente; fecha Argentina en cobertura/traslado/carga rápida/agenda |
| Personal | Editar visible sin hover; opción Médico/a y textos de personal/clientes corregidos |
| Conexión | Comprobación de sesión limitada a 12 s con recuperación; actualización de datos limitada a 20 s, conservando el estado anterior y su advertencia |
| Combustible | Consulta ordenada por fecha; conserva el flujo externo/compras existente |

## Pruebas

`npm run typecheck`, `npm test` y `npm run build` correctos. **14 pruebas automatizadas**: cinco existentes y nueve de regresión para conflictos, flota, timeout, guardado parcial, errores de auditoría/avisos y actualizaciones sin registro. Los casos de incidente borrado y auditoría silenciosa fallaron antes de corregirse.

Comprobaciones de interfaz realizadas con navegador real y **backend simulado**, mediante [servidor de pruebas aislado](<C:/Users/USUARIO/Desktop/Nuevo Modelo Dispatch/tests/ui/server.mjs>). No se usaron credenciales ni se conectó a la base real.

| Escenario manual | Resultado observado |
|---|---|
| Abrir/cerrar/reabrir cobertura, personal y clientes | Sin error de hooks ni pantalla blanca |
| Editar cancha con incidente/avisos existentes | Incidente ficticio y aviso verdadero conservados después del guardado |
| Doble clic en Guardar Traslado, respuesta demorada | Un único guardado |
| Fallo de guardado de traslado | Formulario abierto, mensaje visible y botón nuevamente disponible |
| Sesión que nunca responde | Pantalla de recuperación después del plazo; sin carga infinita |
| Carga rápida a las 19:46 frente a cobertura 18:00 + 90 min + 30 extra | Conflicto visible por unidad compartida |
| Editar profesional Médico/a | Selección conserva Médico/a; no cae a Chofer |
| Vista de ancho 390 px | Modal dentro del viewport; fecha legible y duración visible |
| Cambio de fecha mediante teclado nativo | Fecha visible y valor actualizados conjuntamente |

Captura con datos ficticios:

![Formulario de cobertura en prueba móvil](<C:/Users/USUARIO/Desktop/Nuevo Modelo Dispatch/docs/auditoria/2026-10-09-fase0-mobile.png>)

El build mantiene la advertencia de bundle mayor a 500 kB: aproximadamente 586 kB minificado / 153 kB gzip. La división por módulos se reserva para fundamentos; esta entrega no certifica rendimiento de grandes históricos.

## Límites y siguiente entrega

- No se aplicaron migraciones ni se alteraron permisos, cuentas, contraseñas o datos productivos. No se publicó en Vercel.
- Las reservas siguen siendo avisos calculados sobre coberturas cargadas. No hay bloqueo transaccional, concurrencia ni integración de traslados en reservas. Eso corresponde a servicio central y asignaciones de Fase 1.
- Cambio y auditoría siguen siendo dos llamadas separadas. Se evita un historial falso antes de un cambio fallido y se informa la falla del log, pero falta transacción de servidor para garantizar atomicidad.
- No se acreditó la causa del spinner productivo. Se añadió recuperación ante una comprobación de sesión demorada; no se presenta como diagnóstico definitivo del hosting.
- Políticas RLS efectivas, esquema completo y restauración requieren verificación en ambiente autorizado. Safari/iOS real sigue pendiente; ancho móvil en Chrome no acredita todos sus comportamientos.
- WhatsApp, GPS, mapas, cotizaciones, cobranzas y ARCA siguen en el roadmap; sus integraciones no se activaron.

Para repetir la prueba aislada: ejecutar `node tests/ui/server.mjs` en el proyecto y abrir `http://127.0.0.1:3100/tests/ui/harness.html`. Parámetros opcionales: `?delay=1`, `?fail=transfers`, `?fail=audit_logs`, `?session=stall`. Sólo el servidor de prueba sustituye el cliente Supabase; el build productivo usa la configuración habitual. Los fixtures se reinician al recargar y no persisten fuera de la pestaña.
