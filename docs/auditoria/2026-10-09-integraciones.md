# Anexo: integraciones, costos y límites de operación

Investigación documental al **9 de octubre de 2026**, zona Argentina. No se ejecutaron emisiones fiscales, altas, mensajes, configuraciones GPS ni compras. Los diseños siguientes son propuestas, no capacidades verificadas de la aplicación. Precios en USD salvo indicación; excluyen impuestos, tipo de cambio, soporte e implementación. Se citan fuentes oficiales del organismo o proveedor. Las cantidades de uso son escenarios de cálculo, no métricas reales de la empresa.

## 1. ARCA: emisión fiscal

### Evidencia y alcance

El catálogo oficial identifica WSFEv1 para comprobantes A/B/C/M sin detalle de ítems y enlaza el manual **4.7**. WSMTXCA cubre A/B con detalle de ítems. No corresponde elegir este último simplemente porque el PDF interno de la factura tenga renglones. El servicio aplicable debe confirmarse con el contador. El PDF 4.7 enlazado no pudo ser leído por el navegador de investigación; no se certificó aquí su tabla completa de validaciones. [Catálogo ARCA](https://www.afip.gov.ar/ws/documentacion/ws-factura-electronica.asp).

WSAA requiere certificado X.509. Homologación usa WSASS; producción usa Administrador de Certificados Digitales y asociación al servicio mediante Administrador de Relaciones. Deben mantenerse separados certificado, claves, endpoint y base de pruebas. [WSAA oficial](https://www.afip.gov.ar/ws/documentacion/wsaa.asp).

La interfaz oficial publica `FECAESolicitar`, `FECompUltimoAutorizado` y `FECompConsultar`: autorización, consulta de último número por tipo/punto de venta/CUIT y recuperación de un comprobante. Son mecanismos útiles ante respuestas perdidas, no una garantía de que cualquier reintento sea inocuo. [Autorización](https://servicios1.afip.gov.ar/WSFEv1/Service.asmx?op=FECAESolicitar), [último autorizado](https://servicios1.afip.gov.ar/WSFEv1/Service.asmx?op=FECompUltimoAutorizado), [consulta](https://servicios1.afip.gov.ar/WSFEv1/Service.asmx?op=FECompConsultar).

### Arquitectura recomendada

Diseño propio: conservar primero un módulo comercial de presupuestos, servicios facturables, comprobantes y cobranzas. Implementar ARCA como adaptador de servidor detrás de ese módulo, nunca como llamada del navegador. Separar estado fiscal (`borrador`, `pendiente`, `resultado_incierto`, `autorizado`, `rechazado`) de estado de cobro (`pendiente`, `parcial`, `cobrado`). Un traslado finalizado no implica cobrado ni facturado.

Flujo propuesto:

1. Contador habilita tipos de comprobante, CUIT emisor y punto de venta exclusivo para la integración.
2. Operador revisa receptor, concepto, fechas de servicio/vencimiento, moneda, importes, impuestos y documentos relacionados. El servidor vuelve a validar.
3. Crear solicitud persistente con UUID idempotente y huella del contenido aprobado. La misma clave con contenido distinto debe rechazarse.
4. Serializar emisión por emisor/punto de venta/tipo. Consultar y reconciliar último número antes de asignar el siguiente. Impedir doble clic, doble worker y uso simultáneo del mismo punto de venta por otro emisor técnico.
5. Enviar, registrar respuesta y conservar CAE, vencimiento de CAE, número, fecha, importes y evidencia del resultado. CAE no significa pago recibido.
6. Ante timeout, dejar resultado incierto y consultar el comprobante esperado. No emitir otro número a ciegas. Si hay discrepancia entre ARCA y la solicitud local, revisión humana.
7. Generar representación PDF/QR según reglas aplicables y entregar por canal aprobado. Registrar quién autorizó el envío.

Una factura autorizada debe ser inmutable en el sistema. Correcciones mediante nota de crédito o débito y asociación fiscal que corresponda; no borrar o sobrescribir la factura original. A/B/C y NC/ND deben tratarse como tipos explícitos obtenidos de catálogos vigentes. No deducir el tratamiento tributario de un paciente o del nombre del servicio. Antes de producción, confirmar con contador IVA/exenciones de cada prestación, situación fiscal del emisor/receptor, fechas, redondeo, moneda/cotización, puntos de venta, NC/ND y eventual FCE MiPyME. Esta auditoría no resuelve esas decisiones fiscales.

Seguridad propuesta: clave privada y ticket WSAA sólo en secretos del servidor; acceso por rol de facturación; logs redactados; certificado con alertas de vencimiento; sincronización de reloj; auditoría append-only; cola durable y conciliación diaria. Ni clave fiscal ni clave privada en `VITE_*`, frontend, PDF o repositorio.

### Directa versus proveedor

| Alternativa | Ventaja | Costo/riesgo que permanece | Criterio de elección |
|---|---|---|---|
| WSAA + WSFEv1 directos | Control de datos y emisión; menos dependencia comercial | Desarrollo SOAP/firma, certificados, cambios normativos, soporte y conciliación | Adecuado si hay responsable técnico estable y presupuesto para mantenerlo |
| API fiscal de proveedor | Acelera implementación; puede incluir PDF, soporte y renovación | Abono/volumen, dependencia, custodia y portabilidad; revisar contrato y límites | Preferible para pequeña operación si el ahorro de soporte compensa el abono |

No se encontró ni verificó una tarifa contractual de un proveedor fiscal para esta empresa; no se inventa un precio por comprobante ni se denomina a un proveedor «autorizado por ARCA» sin evidencia del organismo. Comparar presupuestos con esta fórmula: **abono + excedentes de comprobantes/CUIT + almacenamiento + soporte + impuestos**. Para directa, medir **infraestructura incremental + horas de mantenimiento**, sin presentarla como costo cero. Pedir exportación completa, SLA, idempotencia documentada, entorno de prueba, tratamiento de respuestas inciertas y política de salida.

Pruebas de aceptación antes de emitir realmente: doble clic produce una sola factura; timeout se reconcilia; reinicio no pierde solicitudes; concurrencia respeta numeración; rechazo no aparece como autorizado; NC/ND se enlazan; importes y PDF coinciden; homologación no usa secretos productivos.

## 2. Rutas, mapas y tiempos estimados

| Servicio | Unidad y precio consultado | Restricción relevante | Uso propuesto |
|---|---|---|---|
| Google Routes Essentials | 10.000 unidades gratis/mes por SKU; luego USD 5/1.000 en primer tramo | Tráfico avanzado puede cambiar SKU | Distancias/tiempos para planificación |
| Google Routes Pro | 5.000 gratis; USD 10/1.000 en primer tramo | Matriz se cobra por origen × destino | ETA con tráfico si piloto demuestra beneficio |
| Mapbox Directions | 100.000 solicitudes gratis; USD 2/1.000 en siguiente tramo | Cobertura de tráfico a validar localmente | Alternativa económica para rutas y mapa homogéneo |
| OSRM propio | No hay tarifa de API del software; se paga infraestructura y operación | No incluye por sí solo feed de tráfico vivo ni mapa base | Sólo si el ahorro/control justifica mantener servidor y datos |

Fuentes de precios: [Google](https://developers.google.com/maps/billing-and-pricing/pricing), [reglas de cobro Google](https://developers.google.com/maps/documentation/routes/usage-and-billing), [Mapbox](https://www.mapbox.com/pricing). Precios no incluyen búsquedas de direcciones, geocodificación, cargas de mapa o navegación móvil. Mapbox factura Directions por petición, aun con varias coordenadas, y tiene límites operativos propios. [Directions](https://docs.mapbox.com/api/navigation/directions/).

Escenarios calculados: 20.000 rutas Essentials/mes cuestan **USD 50** después de su franquicia; 20.000 Pro, **USD 150**; 20.000 Mapbox Directions, **USD 0 de Directions**. Si 1.000 solicitudes comparan seis móviles contra un destino, son 6.000 elementos de matriz, no 1.000. Un ping GPS no debe generar una nueva ruta automáticamente: se dispararía el consumo sin utilidad equivalente.

Google restringe almacenamiento de contenido; permite conservar place IDs. Si se dibuja su resultado sobre un mapa, debe ser Google Map; sin mapa exige atribución. No asumir que es válido calcular con Google y dibujar sobre otro proveedor, ni guardar sus geometrías indefinidamente. [Políticas Routes](https://developers.google.com/maps/documentation/routes/policies). Mapbox también exige revisar los términos del producto y permisos de almacenamiento antes de diseñar caché o mapas mixtos. [Portal contractual](https://www.mapbox.com/legal/product-terms).

OSRM expone `route`, `table`, `match`, `trip` y otros servicios; un motor de rutas no equivale a geocodificador, mapa ni seguimiento GPS. [API oficial](https://project-osrm.org/docs/v5.24.0/api/). El demo público no es infraestructura productiva contratada. La wiki remite a políticas del operador actual y distingue sus reglas históricas: evitar copiar condiciones viejas como si fueran actuales. [Política OSRM](https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy), [operador actual](https://routing.openstreetmap.de/about.html).

Recomendación propia: piloto comparativo con direcciones ficticias o lugares públicos representativos de la zona, accesos reales a hospitales y recorridos rurales. Medir calidad antes de elegir. Mantener un único adaptador de rutas, cuotas diarias, alertas de gasto y acceso autenticado. Claves secretas al servidor; tokens públicos de mapas con permisos mínimos y restricciones de dominio. [Tokens Mapbox](https://docs.mapbox.com/help/dive-deeper/access-tokens/).

ETA debe mostrarse como estimación con hora de cálculo, tráfico considerado y margen configurable. No prometer que un algoritmo interpreta prioridades de una ambulancia, caminos aptos o accesos hospitalarios. Si falla el proveedor, conservar dirección y coordinación manual; no bloquear despacho.

## 3. GPS ya instalado: descubrir antes de reemplazar

Faltan marca, modelo, firmware, protocolo, proveedor actual, contrato, derechos de acceso, API y posibilidad de reconfiguración. No se infieren de la existencia de móviles en la app.

| Camino | Evaluación | Decisión propuesta |
|---|---|---|
| A. API del proveedor actual | REST/webhook, IDs, frecuencia, histórico, límites, permisos y costo | Primera opción: evita tocar equipos instalados |
| B. Protocolo directo | Equipo configurable, IP/puerto/APN, TCP/UDP, comandos, firmware y titularidad | Sólo con documentación y acceso autorizado; probar un equipo fuera de operación |
| C. Intermediario como Traccar | Compatibilidad exacta de modelo/protocolo y alojamiento | Útil si resuelve traducción y operación a menor costo |
| D. Sustitución de equipos/proveedor | Instalación, SIM, cobertura, garantía, buffer offline y exportación | Último recurso, tras verificar A–C |

Traccar publica lista de dispositivos y API REST, además de WebSocket `/api/socket` para posiciones/eventos/dispositivos; el WebSocket usa sesión por cookie. No garantiza compatibilidad con cualquier GPS. [Dispositivos](https://www.traccar.org/devices/), [API](https://www.traccar.org/traccar-api/). Su oferta alojada muestra **USD 49,95/mes** en la selección por defecto; el límite se elige en formulario y debe cotizarse para la flota real, no asumir que cualquier cantidad está incluida. [Servicio](https://www.traccar.org/product/tracking-server/).

Arquitectura propia: proveedor → adaptador de servidor → eventos normalizados → última posición + histórico con retención → interfaz autorizada. Guardar `provider_event_id`, `device_id`, `vehicle_id`, `device_time`, `received_at`, latitud/longitud, precisión si existe y origen. No enviar nombres de pacientes al proveedor de rastreo. Vinculación vehículo/dispositivo con vigencia temporal para evitar mezclar historias tras cambiar un equipo.

Escenario exclusivamente ilustrativo, **seis equipos** transmitiendo 12 h/día durante 30 días: cada 60 s genera 129.600 puntos/mes; cada 30 s, 259.200. Si cada registro bruto pesara 0,5 KB serían aproximadamente 65/130 MB, antes de índices, copias, protocolos y logs. No equivale a consumo real de SIM ni de base de datos. Frecuencia y retención deben elegirse después de medir.

Latencia total = intervalo del dispositivo + conectividad + demora del proveedor + polling/proceso propio. Mostrar «última actualización hace…», marcar sin señal y no extrapolar una ubicación vieja como si fuera actual. Deduplicar, conservar eventos retrasados en historial sin retroceder última posición y rechazar saltos imposibles para revisión. Geocercas sugieren posible llegada/salida; **no confirman atención, disponibilidad ni cierre de un servicio**. La tripulación/coordinador confirma la transición.

Costo total a pedir: abono del proveedor/API + equipos e instalación amortizados + SIM/datos + servidor + almacenamiento/egreso + soporte. No hay cotización fiable hasta identificar el proveedor existente.

## 4. WhatsApp, estados y respaldo por SMS

### Condiciones verificadas

La política exige opt-in y respeto a bajas. Iniciar conversaciones requiere plantilla aprobada; fuera de la ventana de 24 horas desde el último mensaje del usuario también. La aprobación puede cambiar. [Política oficial, actualizada 23/09/2026](https://whatsappbusiness.com/policy/).

La página pública consultada cobra por mensaje entregado, según mercado y categoría, y todavía describe respuestas de servicio y utility dentro de atención como gratuitas. El selector no devolvió tarifa numérica de Argentina y la documentación técnica Meta devolvió error/429. **No se da por verificado un precio argentino ni una eventual actualización de octubre**: confirmar rate card efectiva en la cuenta antes de presupuestar. Modelo: `mensajes facturables × tarifa vigente por categoría/país + BSP + impuestos`. No reutilizar el antiguo esquema de «1.000 conversaciones gratis». [Precio oficial consultado](https://whatsappbusiness.com/products/platform-pricing/).

Número existente: evaluar coexistencia Business App + API, sin borrar ni migrar el número durante auditoría. 360dialog documenta esta modalidad, limitaciones y requisitos para su propia integración; no acredita elegibilidad de la cuenta actual ni disponibilidad por integración directa. Confirmar modalidad, historial, dispositivos vinculados y reversibilidad con Meta/proveedor antes de contratar. [Documentación del proveedor](https://docs.360dialog.com/docs/resources/phone-numbers/coexistence). La página técnica Meta enlazada no pudo verificarse por error de acceso.

### Flujo operativo recomendado

Primera etapa: notificaciones breves de asignación/recordatorio con botón a la app y referencia opaca del servicio, sin diagnóstico, DNI, domicilio detallado o historial clínico en texto/URL. Consentimiento registrado con fecha, finalidad, canal y revocación; teléfono verificado contra el personal correcto. Toda acción de estado exige autorización en servidor.

Cloud API directa reduce intermediarios, pero necesita servidor de webhooks, cola, secretos, bandeja operativa y soporte. Un proveedor puede dar bandeja/coexistencia, a cambio de tarifa y dependencia. Comparar propiedad del número, exportación, acceso al WABA, soporte, recargos y salida. No automatizar WhatsApp Web por QR como sustituto de integración oficial.

Modelo propuesto para mensajes: guardar intento, ID del proveedor, destinatario, servicio, versión de asignación, plantilla/idioma y estados de entrega. Validar firma de webhooks según documentación del proveedor elegido; registrar antes de procesar; deduplicar y responder rápido; reintentar con límites y cola de fallos. Token/app secret sólo en servidor. Diferenciar «enviado», «entregado», «leído» y «aceptado por tripulación»: los tres primeros no prueban la aceptación operativa.

| Evento problemático | Tratamiento propuesto |
|---|---|
| Duplicado del proveedor | Misma clave de evento: registrar/reconocer, no repetir acción |
| «Entregado» después de «leído» | Conservar evento sin degradar la proyección de entrega |
| Respuesta de asignación vieja tras reasignación | Mostrar como vencida; no cambiar servicio actual |
| «Ya llegué» sin referencia inequívoca | Bandeja para confirmar; no adivinar traslado o móvil |
| Dos respuestas incompatibles | Conflicto visible y resolución de coordinador |
| Sin confirmación | Recordatorio acotado y escalamiento según plazo, no bucle infinito |

Para botones operativos, asociar token aleatorio con caducidad, identidad esperada, servicio y versión; volver a validar al consumir. Una respuesta libre nunca modifica automáticamente una asignación ambigua. Primero probar todo con número de prueba y servicios ficticios.

### SMS y conectividad Argentina

Respaldo por SMS sólo ante fallo/plazo operativo definido, con deduplicación común entre canales. Entrega de SMS tampoco acredita lectura/aceptación. Un SMS puede recibirse sin datos móviles, pero requiere cobertura celular; los enlaces necesitan datos. Para urgencias sin respuesta, escalamiento humano telefónico/radio según el procedimiento de la empresa.

Twilio publica para Argentina **USD 0,1034 por segmento saliente** mediante números internacionales; 100 segmentos son USD 10,34 y 1.000 son USD 103,40, antes de cargos adicionales/número/impuestos. Caracteres y longitud pueden multiplicar segmentos. Confirmar remitente y recepción bidireccional antes de prometer respuestas por SMS. [Precio oficial Argentina](https://www.twilio.com/en-us/sms/pricing/ar).

Los beneficios «WhatsApp gratis» de operadores no cubren automáticamente Modelo Dispatch. Movistar excluye del beneficio enlaces externos y uso de ubicación, entre otras funciones. Personal publica planes empresariales con WhatsApp y SMS según plan. **Nada de eso demuestra patrocinio o navegación sin consumo para esta web, la API GPS o un enlace recibido por chat.** [Movistar, alcance](https://ayuda.movistar.com.ar/pregunta/que-puedo-hacer-con-whatsapp-gratis.html), [Personal empresas](https://www.personal.com.ar/tech/conectividad/telefonia-empresas).

Alternativa comercial a verificar: plan corporativo de datos o negociación explícita de tráfico patrocinado, si el operador lo ofrece, con contrato y prueba en cada red; no es una propiedad que pueda implementarse sólo desde la app. Para reducir consumo por diseño: formularios livianos, no cargar mapas hasta pedirlos, imágenes optimizadas, actualizaciones parciales y cola de acciones con indicación clara de pendiente/sin conexión.

## 5. Privacidad y decisiones previas

La Ley 25.326 considera sensibles los datos de salud y exige medidas de seguridad y confidencialidad; la habilitación para tratar salud no elimina el secreto profesional. Definir finalidad, responsables, acceso y conservación antes de compartir datos con integraciones. [Texto actualizado oficial](https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion).

AAIP exige evaluar destino y garantías de transferencias internacionales. No basta con decir que un proveedor «cumple GDPR» para cerrar el análisis argentino. Revisar regiones efectivas, subencargados, contrato y mecanismos aplicables con asesoramiento local. [AAIP, transferencias](https://www.argentina.gob.ar/transferencias-internacionales).

Recomendaciones de diseño: cuentas personales por rol, mínimo dato por canal, enlaces autenticados, logs sin contenido clínico, retención diferenciada para GPS/mensajes/facturas y procedimiento de incidentes. Eliminar un mensaje de la app no garantiza eliminar copias en teléfonos o proveedores. Consentimiento a WhatsApp no sustituye base legal de tratamiento clínico o seguimiento laboral; resolver ambos explícitamente.

## 6. Orden de integración y puertas de salida

1. **Base operativa y permisos:** servicios y asignaciones versionados, auditables, estados claros, contactos correctos. Sin esto, una integración acelera errores.
2. **Piloto rutas:** comparación local, consumo acotado y degradación manual.
3. **GPS A primero:** identificar proveedor y probar lectura de un equipo; verificar retrasos, cambios de dispositivo y no señal.
4. **Mensajería:** consentimiento, número y tarifa confirmados; recordatorios y aceptación inequívoca; SMS sólo como respaldo medido.
5. **Facturación:** modelo comercial, definición contable, homologación y conciliación probadas antes de primera emisión real.

Cada fase necesita responsable, presupuesto máximo, alarma de consumo, exportación y un interruptor para detener integración conservando la operación manual. Ninguna API externa debe convertirse en requisito para poder ver la agenda o registrar una novedad operativa.
