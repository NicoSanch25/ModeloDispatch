# Dispatch Model - Shared Agent Instructions

## Proyecto
- **Directorio Local:** C:\Users\USUARIO\Desktop\Nuevo Modelo Dispatch
- **Repositorio Remoto:** https://github.com/NicoSanch25/ModeloDispatch.git

## Stack Tecnológico
- Frontend: React (TypeScript) + Vite
- Estilos: Tailwind CSS
- Íconos: Lucide React
- Backend / Base de Datos: Supabase (Auth + PostgreSQL)

## Arquitectura Actual
- **Estado Global:** La aplicación es un monolito en App.tsx que maneja todo el estado global mediante hooks useState (matches, mbulances, staff, locations, clients, 	ransfers, etc.).
- **Data Fetching:** Se centraliza en la función loadData() dentro de App.tsx que hace un Promise.all a Supabase para cargar todas las tablas. Tiene manejo de errores (captura si la sesión caducó y muestra un banner al usuario sin borrar el estado local).
- **Componentes / Modales:** Las operaciones CRUD (Crear, Editar) de cada entidad se hacen a través de Modales separados (ej. AmbulanceModal.tsx, TransferModal.tsx) que reciben el estado y callbacks (onSave, onClose) desde App.tsx.

## Preferencias de UX/UI del Usuario (¡Muy Importante!)
1. **NO usar Floating Action Buttons (FAB / Botones Flotantes):** Al usuario le quitan espacio en pantalla y le resultan incómodos. Colocar las acciones dentro de los flujos naturales o menús.
2. **Optimización de Espacio (Mobile First):** Los componentes (especialmente el Dashboard y las tarjetas de métricas) deben ser compactos (poco padding interno) para evitar que el usuario tenga que hacer scroll inmediatamente.
3. **Inputs de Fecha en iOS:** Evitar el estilo nativo feo de iOS Safari. Usar el hack de opacidad (opacity-0 en el input nativo superpuesto a un div con estilos) que se implementó en DailyAgendaModal.tsx.
4. **Iconos vs Texto:** Preferir íconos visuales claros (ej. 🚗 para Chofer, 🩺 para Enfermero, o usar Lucide) antes que abreviaturas de texto (Ch / Enf).

## Estructura de Módulos (Base de Datos)
- **matches:** Agenda de Coberturas (eventos, servicios prolongados).
- **ambulances:** Flota de Móviles (con seguimiento de mantenimiento, KMs, VTV, etc).
- **staff:** Personal Médico y Choferes.
- **transfers:** Registro de Traslados (estilo hoja de papel física, con horarios de punto de control).
- **fuel_records:** Control de Combustible.
- **locations & clients:** Gestión de sedes y clientes.

## Protocolo de Trabajo (Antigravity & Codex)
- **Ramas:** Coordinar trabajo en ramas separadas si se van a hacer cambios grandes (ej. eat/nuevo-modulo) y unir en main.
- **Commits:** Mensajes claros, idealmente siguiendo la convención semántica (feat, fix, refactor).
