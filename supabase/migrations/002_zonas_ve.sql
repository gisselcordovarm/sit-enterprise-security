-- =============================================================================
-- SIT Enterprise Security · ZONAS DE INSTALACIÓN DE VENEZUELA
-- Agrega las columnas jerárquicas Estado / Municipio / Ciudad (geo_estado,
-- municipio, ciudad) a las tablas que participan en localización y amplía la
-- columna resumen zona_geografica. Es idempotente.
-- Nota: se usa `geo_estado` (y no `estado`) porque `estado` ya contiene el
-- estado del flujo (Pendiente/Rechazado/...).
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase.
-- =============================================================================

-- Pedidos
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS geo_estado  VARCHAR(60);
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS municipio   VARCHAR(80);
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS ciudad      VARCHAR(80);
ALTER TABLE public.pedidos ALTER COLUMN zona_geografica TYPE VARCHAR(160);

-- Clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS geo_estado  VARCHAR(60);
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS municipio   VARCHAR(80);
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS ciudad      VARCHAR(80);
ALTER TABLE public.clientes ALTER COLUMN zona_geografica TYPE VARCHAR(160);

-- Técnicos
ALTER TABLE public.tecnicos ADD COLUMN IF NOT EXISTS geo_estado  VARCHAR(60);
ALTER TABLE public.tecnicos ADD COLUMN IF NOT EXISTS municipio   VARCHAR(80);
ALTER TABLE public.tecnicos ADD COLUMN IF NOT EXISTS ciudad      VARCHAR(80);
ALTER TABLE public.tecnicos ALTER COLUMN zona_geografica TYPE VARCHAR(160);

-- Tareas
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS geo_estado  VARCHAR(60);
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS municipio   VARCHAR(80);
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS ciudad      VARCHAR(80);
ALTER TABLE public.tareas ALTER COLUMN zona_geografica TYPE VARCHAR(160);

-- Instalaciones
ALTER TABLE public.instalaciones ADD COLUMN IF NOT EXISTS geo_estado  VARCHAR(60);
ALTER TABLE public.instalaciones ADD COLUMN IF NOT EXISTS municipio   VARCHAR(80);
ALTER TABLE public.instalaciones ADD COLUMN IF NOT EXISTS ciudad      VARCHAR(80);
ALTER TABLE public.instalaciones ALTER COLUMN zona_geografica TYPE VARCHAR(160);