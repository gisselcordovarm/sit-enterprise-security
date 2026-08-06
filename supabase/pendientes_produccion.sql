-- =============================================================================
-- SIT Enterprise Security · MIGRACIONES PENDIENTES DE PRODUCCIÓN (consolidado, v2)
-- Ejecutar UNA VEZ completo, en orden, en el SQL Editor de Supabase.
--
-- v2 corrige el error:
--   ERROR 0A000: cannot alter type of a column used by a view or rule
--   DETAIL: rule _RETURN on view v_alertas depends on column "zona_geografica"
-- La vista v_alertas (schema.sql) lee zona_geografica de tareas y bloqueaba el
-- ensanchado a VARCHAR(160). Solución: se DROPPEA v_alertas antes de ensanchar
-- y se recrea idéntica al final. El ensanchado se guarda con information_schema
-- para que el archivo sea totalmente resumible si una corrida quedó a medias.
--
-- 100 % idempotente (ADD COLUMN IF NOT EXISTS / DO $$ ... $$ / IF EXISTS).
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1) PROFILES EXTRAS  (corrige "Guardar cambios" en Mi Perfil y la foto)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS foto    TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo    TEXT;

GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- ----------------------------------------------------------------------------
-- 2) ZONAS DE VENEZUELA  (columnas jerárquicas Estado/Municipio/Ciudad + anchura)
-- ----------------------------------------------------------------------------
ALTER TABLE public.pedidos       ADD COLUMN IF NOT EXISTS geo_estado VARCHAR(60);
ALTER TABLE public.pedidos       ADD COLUMN IF NOT EXISTS municipio  VARCHAR(80);
ALTER TABLE public.pedidos       ADD COLUMN IF NOT EXISTS ciudad     VARCHAR(80);

ALTER TABLE public.clientes      ADD COLUMN IF NOT EXISTS geo_estado VARCHAR(60);
ALTER TABLE public.clientes      ADD COLUMN IF NOT EXISTS municipio  VARCHAR(80);
ALTER TABLE public.clientes      ADD COLUMN IF NOT EXISTS ciudad     VARCHAR(80);

ALTER TABLE public.tecnicos      ADD COLUMN IF NOT EXISTS geo_estado VARCHAR(60);
ALTER TABLE public.tecnicos      ADD COLUMN IF NOT EXISTS municipio  VARCHAR(80);
ALTER TABLE public.tecnicos      ADD COLUMN IF NOT EXISTS ciudad     VARCHAR(80);

ALTER TABLE public.tareas        ADD COLUMN IF NOT EXISTS geo_estado VARCHAR(60);
ALTER TABLE public.tareas        ADD COLUMN IF NOT EXISTS municipio  VARCHAR(80);
ALTER TABLE public.tareas        ADD COLUMN IF NOT EXISTS ciudad     VARCHAR(80);

ALTER TABLE public.instalaciones ADD COLUMN IF NOT EXISTS geo_estado VARCHAR(60);
ALTER TABLE public.instalaciones ADD COLUMN IF NOT EXISTS municipio  VARCHAR(80);
ALTER TABLE public.instalaciones ADD COLUMN IF NOT EXISTS ciudad     VARCHAR(80);

-- La vista depende de zona_geografica; se recoloca en torno al ensanchado.
DROP VIEW IF EXISTS public.v_alertas;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pedidos','clientes','tecnicos','tareas','instalaciones']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = t
        AND column_name  = 'zona_geografica'
        AND character_maximum_length < 160
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN zona_geografica TYPE VARCHAR(160)', t);
    END IF;
  END LOOP;
END $$;

-- Recrea v_alertas idéntica a su definición original, y reaplica su permiso.
CREATE OR REPLACE VIEW public.v_alertas AS
SELECT
  (SELECT 'P' || id_pedido::text) AS id,
  'error'::text AS tipo,
  'Fallo de Factibilidad Técnica' AS titulo,
  'Pedido #' || id_pedido::text || ': ' || cliente_nombre || ' rechazado por factibilidad.' AS descripcion,
  fecha_pedido AS fecha,
  COALESCE(motivo_factibilidad, 'Sin motivo registrado.') AS detalles
FROM pedidos WHERE NOT factibilidad_ok
UNION ALL
SELECT 'I' || id_equipo::text, 'warning', 'Inventario Crítico',
  descripcion_equipo || ' por debajo del umbral (' || stock_disponible::text || ' uds restantes).',
  created_at::date,
  'Umbral configurado: ' || umbral_minimo::text || ' unidades. Reposición ' || COALESCE(solicitud_proveedor, 'manual') || '.'
FROM inventario WHERE stock_disponible < umbral_minimo
UNION ALL
SELECT 'P' || id_pedido::text, 'success', 'Autenticación de Pago',
  'Pago aprobado para Pedido #' || id_pedido::text || ' por $' || monto_total::text || ' USD.',
  fecha_pedido,
  'Transacción validada. flag_aprobado = true.'
FROM pedidos WHERE flag_aprobado AND pago_status = 'Aprobado'
UNION ALL
SELECT 'T' || id_tarea::text, 'info', 'Asignación de Técnico',
  'Técnico ' || COALESCE((SELECT nombre_tecnico FROM tecnicos t WHERE t.id_tecnico = tareas.id_tecnico), '') || ' asignado a ' || COALESCE(servicio,'') || ' en Zona ' || zona_geografica || '.',
  COALESCE(fecha_asignacion, created_at)::date,
  'Horario programado según cronograma. Tipo de servicio registrado.'
FROM tareas WHERE estado = 'Asignado'
UNION ALL
SELECT 'P' || id_pedido::text, 'error', 'Error de Pago',
  'Pago rechazado para Pedido #' || id_pedido::text || ' (' || cliente_nombre || ').',
  fecha_pedido,
  COALESCE(error_pago, 'Código: error_pago.')
FROM pedidos WHERE pago_status = 'Rechazado'
ORDER BY fecha DESC
LIMIT 10;

GRANT SELECT ON public.v_alertas TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3) FACTURAS: renombrar cuit -> rif  (corrige "Generar factura" y el envío)
-- ----------------------------------------------------------------------------
ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS rif VARCHAR(30);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'facturas'
      AND column_name  = 'cuit'
  ) THEN
    ALTER TABLE public.facturas
      ALTER COLUMN cuit TYPE VARCHAR(30);
    UPDATE public.facturas SET rif = cuit WHERE rif IS NULL AND cuit IS NOT NULL;
    ALTER TABLE public.facturas DROP COLUMN cuit;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4) MONTOS / RIF EN DATOS (opcional; debe ir DESPUÉS del paso 3, usa rif)
-- ----------------------------------------------------------------------------
UPDATE public.pedidos SET monto_total = 350   WHERE id_pedido = 7844;
UPDATE public.pedidos SET monto_total = 1200  WHERE id_pedido = 7842;
UPDATE public.pedidos SET monto_total = 850   WHERE id_pedido = 7840;
UPDATE public.pedidos SET monto_total = 6800  WHERE id_pedido = 7839;
UPDATE public.pedidos SET monto_total = 9000  WHERE id_pedido = 7848;

UPDATE public.facturas SET monto_total = 350,  rif = 'V-200000233' WHERE id_pedido = 7844;
UPDATE public.facturas SET monto_total = 6800, rif = 'J-305812623' WHERE id_pedido = 7839;

UPDATE public.logs_financieros SET monto = 350   WHERE descripcion LIKE '%Cobro de Pedido #7844%';
UPDATE public.logs_financieros SET monto = 6800  WHERE descripcion LIKE '%Cobro de Pedido #7839%';
UPDATE public.logs_financieros SET monto = -4200 WHERE descripcion LIKE '%Compra Stock%' AND monto < 0;
UPDATE public.logs_financieros SET monto = -850  WHERE descripcion LIKE '%Nota de Crédito%';

UPDATE public.inventario SET precio = 120 WHERE codigo_equipo = 'INV-101';
UPDATE public.inventario SET precio = 35  WHERE codigo_equipo = 'INV-102';
UPDATE public.inventario SET precio = 220 WHERE codigo_equipo = 'INV-103';
UPDATE public.inventario SET precio = 18  WHERE codigo_equipo = 'INV-104';
UPDATE public.inventario SET precio = 60  WHERE codigo_equipo = 'INV-105';
UPDATE public.inventario SET precio = 280 WHERE codigo_equipo = 'INV-106';