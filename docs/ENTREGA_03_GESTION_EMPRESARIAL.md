# Entrega 3 — Servicios y administración

9 de octubre de 2026. Amplía la agenda publicada en `d0772a9`. No habilita proveedores ni emisión fiscal. No cambia credenciales ni incorpora usuarios.

## Resultado implementado

El menú **Administración** conecta servicios, presupuestos, gastos, prefacturación y cobros. Cada cobertura/traslado conserva su formulario original y obtiene un `services.id` y número común. Las demás entidades referencian ese registro. Los disparadores sincronizan programación y recursos sin duplicar pacientes en el registro común.

- Traslados: salida/regreso previstos separados de horas reales, móvil, enfermero y cliente. Reserva del servidor incluye ambas fuentes, roles cruzados, medianoche, 15 minutos de margen, mantenimiento y bloqueos.
- Seguimiento manual: programado → en camino → en servicio → finalizó → regresando → cerrado. FIN no libera recursos. Un cierre o cancelación requiere acción humana. No hay inferencias de GPS.
- Precio y cliente acordados; gastos por categoría/fecha/importe; corrección con motivo conservando movimientos; revisión administrativa antes de prefacturar.
- Presupuestos: estimación manual de km, horas y extras; margen sobre venta; precio final revisable; advertencia de pérdida; versiones inmutables; borrador/enviado/aceptado/rechazado/vencido; aceptación transaccional genera un único servicio sin asignaciones automáticas.
- Impresión/Guardar PDF por el diálogo del navegador, conservando la versión elegida. El presupuesto impreso omite costos internos. La aplicación no envía documentos.
- Prefacturas internas: agrupación de servicios cerrados/revisados del mismo cliente, líneas y precio congelados, prevención de doble inclusión, vencimiento y referencia de factura emitida externamente.
- Cobros parciales: saldo calculado desde movimientos activos, sin sobrecobro; anulación de cobro con motivo; no se puede anular un documento con cobros activos. Ningún registro implica transferencia bancaria.
- Disponibilidad: bloqueos por móvil/persona y período; no se bloquea un recurso previamente asignado sin resolver el servicio.
- Resultados por mes: precio, gastos, diferencia registrada, deuda, pendientes de revisión/precio y exportación CSV. La diferencia no equivale a utilidad neta sin todos los costos/impuestos.
- La agenda y flota usan el estado común. Los nuevos registros completos se leen en páginas explícitas, superando el límite de una consulta. La pantalla de servicios pagina 25 resultados.

## Preservación y permisos

Migración `202610090003_business_core.sql`: expansión transaccional e idempotente, con backfill de servicios; no reescribe filas originales ni elimina columnas/tablas. Históricos completados se migran cerrados, sin inventar horas reales. Horarios faltantes quedan pendientes.

Antes de aplicar se verificaron esquema/defaults/FK y requisitos. Se guardó copia local privada fuera del repositorio. Comparación después de la expansión: **0 registros originales modificados**, conservando 11 personas, 6 móviles, 9 sedes, 1 cliente, 3 coberturas, 0 traslados, 1 carga de combustible y 2 entradas de auditoría. Conteos a esa comprobación, no cantidades permanentes del negocio.

El miembro aprobado existente conserva acceso de administración. `members.role` admite `admin` y `operator`; no se crearon usuarios ni se concedió acceso a terceros. Administración escribe mediante RPC con verificación de miembro/rol, idempotencia por solicitud y transacción. Todas las tablas nuevas tienen RLS; escrituras directas y acceso anónimo están revocados. Operador puede informar estados/disponibilidad; gastos, presupuestos y cobros requieren administrador. Los eventos financieros no son visibles para operador.

Servicios tienen revisión/versionado optimista; los formularios operativos nuevos usan versión de origen. Un servicio prefacturado no se reprograma ni cambia de precio hasta corregir el documento. Las relaciones impiden eliminar fuentes con historial común; usar cancelación/corrección conservando evidencia.

`supabase/tests/business-access.sql` ejecutado en producción: **Business access checks passed**, con cuenta aprobada, identidad no aprobada y grants anónimos/directos comprobados. Son JWT simulados en la capa PostgreSQL, no un ensayo de login contra Auth ni revocación del usuario real. Revocación y rol operador se prueban con identidades ficticias en PostgreSQL local.

## Validación

- 28 pruebas automatizadas: reglas previas, dinero/margen/paginación, migración repetible, reservas cruzadas, permisos, estados, snapshots, aceptación idempotente, prefacturación atómica, pagos parciales/sobrecobro/anulación e historial.
- PostgreSQL local PGlite ejecuta el SQL real con datos ficticios. Tiene una conexión exclusiva: **no demuestra contención de dos conexiones independientes**. El mutex de transacción está implementado; falta ensayo de carga concurrente contra otro PostgreSQL, sin usar registros reales.
- Interfaz móvil 390×844: presupuesto → aceptación → recursos ficticios → salida/inicio/fin/regreso/cierre → gasto/revisión → prefactura → cobro parcial. $10.000 menos cobro de $3.000 = saldo $7.000. Ancho del documento = 390: sin scroll lateral. La asignación en esta prueba aislada usa un adaptador de fixture; formulario real y reglas se verifican por separado.
- Typecheck y build correctos. Administración se carga bajo demanda. PGlite es dependencia de desarrollo y no se distribuye en el bundle productivo.
- Auditoría de dependencias productivas: 0 vulnerabilidades reportadas. Persisten 7 avisos en herramientas de compilación de Tailwind 3 (5 altos/2 moderados); resolver requiere cambio de versión/compatibilidad y no se aplicó una actualización mayor automática. No equivale a certificar seguridad total.
- Evidencias: `auditoria/2026-10-09-cobro-mobile.png`, `auditoria/2026-10-09-business-access.png`.

## Uso

1. Abrir Administración → Presupuestos, cargar cliente/servicio, guardar versión y aceptar después de revisión humana.
2. Servicios → abrir el registro → editar programación/recursos en el formulario original.
3. Informar estados y confirmar el regreso/cierre. Registrar todos los gastos y el precio definitivo; confirmar revisión.
4. Prefacturas y cobros → elegir cliente y servicios revisados → crear documento interno.
5. Emitir comprobante fiscal por el sistema autorizado habitual, guardar referencia y registrar cobros efectivamente recibidos.
6. Resultados/CSV para control; corregir importes anulando movimientos con motivo, nunca borrando historia.

## Límites pendientes

El usuario informó que no tiene datos de proveedores/configuración. GPS, WhatsApp, SMS, rutas automáticas y ARCA están **CONDICIONADOS**: ninguna conexión activa ni credencial inventada. Prefacturas no tienen CAE ni validez fiscal. No se envían mensajes ni se contratan servicios.

No están implementados anticipos previos a un documento, conciliación bancaria automática, tarifario contractual por cliente, liquidación laboral, contratos/series recurrentes, telemetría ni fiscalización. No se presenta esta entrega como cumplimiento total del plan maestro. Los controles de flota/personas existentes se conservan; la conservación/restore programada de toda la base requiere definir responsables y RPO/RTO, además de un entorno separado de recuperación.

## Reversión

Revertir la versión de frontend mediante Git/Vercel conserva las tablas y datos ampliados. No ejecutar DROP ni restaurar sobre producción sin decisión explícita y conciliación. Un cliente anterior no puede crear reservas de traslado incompletas; debe actualizarse para cargar el intervalo. El backfill y la coexistencia preservan lectura y edición de campos sanitarios, pero las nuevas validaciones de reserva se mantienen para evitar conflictos.

Backup previo es una copia puntual de tablas operativas, **no** un dump completo de Auth/configuración ni una estrategia automática de recuperación. No se subió al repositorio. Los nuevos datos administrativos requieren backups posteriores y prueba de restore aislada antes de prometer tiempos de recuperación.

## Referencias técnicas

- [Funciones de PostgreSQL en Supabase](https://supabase.com/docs/guides/database/functions): RPC, `SECURITY DEFINER` y `search_path` explícito.
- [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security): control por sesión y políticas.
- [PGlite](https://pglite.dev/docs/): PostgreSQL embebido para pruebas; conexión exclusiva.

Esta entrega implementa reglas convencionales; no requiere inteligencia artificial ni un ERP externo.
