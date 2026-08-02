# SIT — Sistema Integrado TecnoInnova

Plataforma empresarial de gestión de ventas e instalaciones de seguridad electrónica.
Proyecto académico: Br. Gissel Cordova — UTS Guayana (Junio 2026).

Stack: **React 19 + Vite + Supabase (PostgreSQL)** + jsPDF + Signature Pad.
Demo publicada en Vercel: https://sit-enterprise-security.vercel.app

## Módulos

| Ruta         | Módulo                              | Acceso                    |
| ------------ | ----------------------------------- | ------------------------- |
| `/`          | Panel Central (KPIs, alertas, métricas) | Admin · Básico        |
| `/pedidos`   | Captura y validación de pedidos     | Admin · Básico            |
| `/operaciones`| Asignación de técnicos             | Admin · Básico            |
| `/instalacion`| Parte técnico y firma digital      | Admin                     |
| `/finanzas`  | Facturación PDF y libro contable    | Admin                     |
| `/postventa` | Incidencias, encuestas y NPS        | Admin                     |
| `/usuarios`  | Perfiles y roles                    | Admin                     |

## Autenticación y roles

El sistema usa **Supabase Auth** (email + contraseña) con dos perfiles:

- **Administrador** (`admin`): acceso total a todos los módulos y a Gestión de Usuarios.
- **Usuario Básico** (`basico`): solo `Panel`, `Pedidos` y `Operaciones`.

Preparación (una sola vez, en Supabase):

1. En **Authentication → Users**, abrir el provider **Email** (habilitado por defecto).
2. En **SQL Editor**, ejecutar [`supabase/auth_setup.sql`](supabase/auth_setup.sql).
   Crea la tabla `profiles`, el trigger que asigna rol según el correo, las políticas RLS
   y el usuario administrador por defecto:

   - Usuario: `admin@tecnoinnova.com`
- Clave: `Admin2026@!`

3. Cualquier usuario nuevo que se dé de alta (via panel o sign-up) recibe rol `basico`;
   el correo `admin@tecnoinnova.com` se eleva automáticamente a `admin`.

## Configuración de Supabase

1. Crear un proyecto en https://supabase.com
2. Abrir **SQL Editor** y ejecutar el contenido de [`supabase/schema.sql`](supabase/schema.sql).
   Esto crea las tablas (clientes, inventario, pedidos, detalle_pedido, técnicos, tareas,
   instalaciones, facturas, logs, seguimiento_postventa, incidencias, encuestas), vistas,
   triggers de negocio (validación de factibilidad, reserva de stock, disparo T+7 de postventa),
   políticas RLS y datos de prueba.

> Nota: si ya ejecutaste `schema.sql` antes de esta versión, solo tenés que ejecutar
> `supabase/auth_setup.sql` para agregar autenticación y roles sin tocar el resto.

3. En **Project Settings → API**, copiar la URL del proyecto y la `anon` key.
4. Crear el archivo `.env.local` (ver `.env.example`):

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-ANON-KEY
```

> Sin variables de entorno la app funciona en **modo demostración** con datos mock.

## Desarrollo local

```bash
npm install
npm run dev
```

## Producción / Vercel

```bash
npm run build
npm run preview
```

En Vercel, añadir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como variables de entorno
del proyecto y re-deployar.

## Lógica de negocio implementada en BD

- **Validación de pedidos**: `flag_aprobado = factibilidad técnica AND pago aprobado`
  (trigger `trg_recalcular_pedido`).
- **Reserva de stock**: cada línea de `detalle_pedido` descuenta stock y dispara
  reposición automática (`solicitud_proveedor`) bajo el umbral.
- **Cierre de instalación**: al marcar la instalación como `Completada` con firma digital,
  el pedido pasa a `Instalado` y se crea el seguimiento de calidad con `disparo_7_dias` (T+7).
- **Facturación**: solo se facturan pedidos con estado `Instalado` (vista `v_facturables`).
