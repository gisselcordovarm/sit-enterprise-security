-- =============================================================================
-- SIT Enterprise Security · MANTENIMIENTO PREVENTIVO PROGRAMADO (CRM Postventa)
-- -----------------------------------------------------------------------------
-- Convierte la postventa de reactiva (solo incidencias) a preventiva:
-- calendario automático de visitas semestrales (cambio de baterías de respaldo,
-- limpieza de lentes de cámaras, prueba de sirena) que genera órdenes de
-- trabajo periódicas en `tareas` (despacho de Operaciones).
--
-- Aplica sobre el proyecto EXISTENTE. Idempotente.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query.
-- =============================================================================

-- ---------- 1) Planes de mantenimiento ----------
CREATE TABLE IF NOT EXISTS public.mantenimientos (
  id_mantenimiento   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_pedido          BIGINT REFERENCES public.pedidos(id_pedido),
  cliente_nombre     VARCHAR(200) NOT NULL,
  zona_geografica    VARCHAR(30),
  servicio           VARCHAR(200),
  tipo_visita        VARCHAR(100) NOT NULL,
  tareas             TEXT,
  frecuencia_meses   INT NOT NULL DEFAULT 6 CHECK (frecuencia_meses > 0),
  fecha_programada   DATE NOT NULL,
  ultima_visita      DATE,
  estado             VARCHAR(30) NOT NULL DEFAULT 'Programado',
  id_tecnico         BIGINT REFERENCES public.tecnicos(id_tecnico),
  notificado         BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_fecha ON public.mantenimientos(fecha_programada);

-- ---------- 2) Vínculo de órdenes de trabajo (tareas) con el plan ----------
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS id_mantenimiento BIGINT REFERENCES public.mantenimientos(id_mantenimiento);

-- ---------- 3) Automatización: al completar instalación se agenda la visita
--              preventiva a los 6 meses (Revisión Integral Semestral). ----------
CREATE OR REPLACE FUNCTION public.fn_instalacion_completada() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado = 'Completada' AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM 'Completada') THEN
    UPDATE pedidos SET estado = 'Instalado' WHERE id_pedido = NEW.id_pedido;

    IF NOT EXISTS (SELECT 1 FROM seguimiento_postventa WHERE id_pedido = NEW.id_pedido) THEN
      INSERT INTO seguimiento_postventa (id_pedido, disparo_7_dias, estado)
      VALUES (NEW.id_pedido, COALESCE(NEW.fecha_ejecucion, now()) + interval '7 days', 'Pendiente');
    END IF;

    -- Mantenimiento preventivo automático: próxima revisión a los 6 meses.
    IF NOT EXISTS (SELECT 1 FROM mantenimientos WHERE id_pedido = NEW.id_pedido) THEN
      INSERT INTO mantenimientos (id_pedido, cliente_nombre, zona_geografica, servicio, tipo_visita, tareas, frecuencia_meses, fecha_programada, estado)
      SELECT p.id_pedido, p.cliente_nombre, p.zona_geografica, p.tipo_servicio,
             'Revisión Integral Semestral',
             'Cambio de baterías de respaldo; limpieza de lentes de cámaras; prueba de sirena.',
             6,
             (COALESCE(NEW.fecha_ejecucion, now()))::date + interval '6 months',
             'Programado'
      FROM pedidos p
      WHERE p.id_pedido = NEW.id_pedido;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- ---------- 4) RLS ----------
ALTER TABLE public.mantenimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_mantenimientos" ON public.mantenimientos;
CREATE POLICY "admin_all_mantenimientos" ON public.mantenimientos
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "basico_read_mantenimientos" ON public.mantenimientos;
CREATE POLICY "basico_read_mantenimientos" ON public.mantenimientos
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "soporte_write_mantenimientos" ON public.mantenimientos;
CREATE POLICY "soporte_write_mantenimientos" ON public.mantenimientos
  FOR ALL TO authenticated
  USING (public.has_rol('soporte'))
  WITH CHECK (public.has_rol('soporte'));

-- Soporte puede generar/actualizar órdenes de despacho SOLO de mantenimiento
-- (el resto de tareas operativas sigue siendo de logística/admin).
DROP POLICY IF EXISTS "soporte_write_tareas_mantenimiento" ON public.tareas;
CREATE POLICY "soporte_write_tareas_mantenimiento" ON public.tareas
  FOR ALL TO authenticated
  USING (public.has_rol('soporte') AND id_mantenimiento IS NOT NULL)
  WITH CHECK (public.has_rol('soporte') AND id_mantenimiento IS NOT NULL);

-- =============================================================================
-- VERIFICACIÓN
--   1) SELECT id_mantenimiento, cliente_nombre, tipo_visita, fecha_programada,
--             estado FROM public.mantenimientos ORDER BY fecha_programada;
--   2) Al completar una instalación, debe crearse automáticamente un plan
--      'Revisión Integral Semestral' con fecha = ejecución + 6 meses.
-- =============================================================================
