# Seguridad y puesta en marcha

## Estado de esta entrega

El código local elimina la inyección de `GEMINI_API_KEY` al bundle, compila Tailwind localmente, valida enlaces guardados y prepara cabeceras y autorización de base de datos. **Las dos migraciones se aplicaron al proyecto remoto el 24/09/2026 a través de su editor SQL.** Antes de aplicar la segunda se ejecutó una prueba transaccional completa con rollback. Las ocho tablas quedaron protegidas y se conservó el único operador existente. Se deshabilitó el registro público en Authentication y se confirmó tras recargar la configuración. No constituye una auditoría completa ni certifica protección contra todos los ataques.

## Qué se puede ver con Inspect

El HTML, JavaScript, la clave pública de Supabase y los datos enviados a un usuario autorizado siempre son visibles en su navegador. Deshabilitar Inspect no protege datos. Las claves privadas deben estar exclusivamente en el servidor. Las variables `VITE_*` son públicas, incluso si están en `.env.local`.

Copiar `.env.example` a `.env.local` y configurar la URL y clave pública. Configurar esas mismas variables en el alojamiento antes de compilar. Si alguna compilación anterior llegó a incluir una clave privada de Gemini, revocarla y reemplazarla desde el proveedor.

## Activación en Supabase

1. Respaldar el esquema y las políticas actuales; probar primero en una base de staging con la misma estructura.
2. Revisar `supabase/migrations/202609240001_dispatch_access.sql`. Restringe las ocho tablas conocidas a una lista de operadores aprobados. La instalación conserva al único usuario existente con inicio de sesión previo; aborta si ese escenario cambia. Las cuentas futuras requieren aprobación administrativa. Todos los operadores aprobados tienen lectura y CRUD de las tablas operativas, incluyendo datos de pacientes; no implementa aislamiento entre empresas ni permisos diferenciados por puesto. Confirmar que este modelo corresponde al equipo antes del despliegue.
3. Las migraciones ya están aplicadas en el proyecto actual mediante SQL Editor; no volver a ejecutarlas sobre esa base ni asumir que figuran en el historial del CLI. Para instalaciones nuevas, revisar las precondiciones. Dar de alta futuros UUID autorizados desde una conexión administrativa:

```sql
insert into dispatch_private.members (user_id)
values ('UUID-DEL-OPERADOR-EN-AUTH');
-- Revocar acceso sin borrar el usuario:
update dispatch_private.members set enabled = false
where user_id = 'UUID-DEL-OPERADOR-EN-AUTH';
```

4. El registro público ya está desactivado en Authentication; crear usuarios desde administración. Mantener `dispatch_private` fuera de los esquemas expuestos por la API. Activar límites de intentos y protección de contraseñas en Auth; para CAPTCHA/MFA hace falta completar el flujo de acceso y configurar el proveedor.
5. La consulta inicial encontró ocho tablas públicas, ninguna vista pública y ninguna función pública `security definer`. La nueva función privada fija `search_path` vacío y no es ejecutable por anon. Storage y Realtime no se auditaron; revisar estas superficies antes de ampliar su uso. Las políticas restrictivas previas se preservan; comprobar compatibilidad. Los logs actuales son operativos, no un registro de auditoría inmutable.

## Validación de permisos

Se ejecutó la lógica de `supabase/tests/access.sql`: el operador mantuvo los conteos de filas, la identidad no aprobada obtuvo cero filas y anon no tenía privilegios CRUD en ninguna de las ocho tablas. Esta prueba simula claims dentro de PostgreSQL; no valida un inicio de sesión real ni ejecuta escrituras sobre registros de pacientes. Para una validación integral en staging, usar clientes Supabase con sesiones reales:

| Identidad | Resultado esperado |
| --- | --- |
| Sin sesión (`anon`) | Ninguna lectura ni escritura en las ocho tablas |
| Usuario autenticado sin aprobación | Cero filas; inserciones rechazadas; update/delete no afectan filas |
| Operador aprobado | Lectura y CRUD permitidos según las políticas existentes |
| Operador revocado con JWT aún vigente | Consultas posteriores sin datos; escrituras bloqueadas |

Comprobar SELECT, INSERT, UPDATE y DELETE y la consulta anidada de `audit_logs`. Comprobar que nadie pueda leerse o agregarse a `dispatch_private.members` desde la API. Usar datos ficticios y borrar los registros de prueba. La revocación bloquea consultas nuevas; no puede retirar datos ya descargados.

## Alojamiento

`vercel.json` configura cabeceras para Vercel; `public/_headers` para alojamientos que soporten ese formato, como Netlify. Otros servidores deben configurar las mismas cabeceras explícitamente. La CSP permite únicamente scripts del propio sitio y conexiones al proyecto Supabase actual; actualizar `connect-src` si cambia el proyecto. Los estilos inline se permiten para los gráficos y componentes existentes; no se permiten scripts inline ni `eval`.

Verificar las cabeceras efectivamente recibidas en HTTPS después de publicar, especialmente CSP, frame-ancestors, nosniff y no-store. El servidor local de Vite no valida las cabeceras de producción. Probar acceso, CRUD, modales y enlaces externos. No desplegar el servidor de desarrollo en Internet.

## Estadísticas

Los períodos incluyen hoy y usan fecha de Buenos Aires. La tasa de finalización excluye coberturas suspendidas; los totales incluyen todos los estados. Los litros son cargas registradas, no consumo medido. Se calculan sobre los registros cargados en el cliente; revisar límites/paginación del servidor para bases grandes. No se envían estadísticas a terceros. No se agregó integración con WhatsApp.

Referencias: [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [claves públicas y privadas](https://supabase.com/docs/guides/getting-started/api-keys).

## Verificación local

Compilación y TypeScript verificados. Pruebas unitarias de períodos, límites de fechas, enlaces inseguros y escape CSV. La auditoría de dependencias después de actualizaciones compatibles reportó cero vulnerabilidades conocidas. El diseño y cambio de período se revisaron con datos ficticios; falta la prueba completa de CRUD desde la interfaz con sesión real. Las cabeceras de Vercel se activarán al publicar estos archivos; el frontend nuevo todavía es local.
