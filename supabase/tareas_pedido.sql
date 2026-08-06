-- ============================================================
-- SIT Enterprise Security - Fix: pedido aprobado => tarea de despacho
-- Ejecutar este archivo UNA VEZ en el SQL Editor de Supabase.
-- Crea un trigger sobre "pedidos" que genera automáticamente la
-- fila en "tareas" (Servicios Pendientes de Despacho en Operaciones).
-- Idempotente: puede ejecutarse de nuevo sin duplicar.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_pedido_a_tarea() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado  text;
  v_feat    boolean;
BEGIN
  -- Recalcula factibilidad/estado primero (cubre inserts sin líneas o reorden de triggers).
  PERFORM fn_recalcular_pedido(NEW.id_pedido);
  SELECT estado, factibilidad_ok INTO v_estado, v_feat
    FROM public.pedidos WHERE id_pedido = NEW.id_pedido;

  IF v_estado = 'Pendiente' AND v_feat
     AND NOT EXISTS (SELECT 1 FROM public.tareas WHERE id_pedido = NEW.id_pedido) THEN
    INSERT INTO public.tareas (cliente_nombre, zona_geografica, servicio, estado, id_pedido)
    VALUES (NEW.cliente_nombre, NEW.zona_geografica, NEW.tipo_servicio, 'Pendiente', NEW.id_pedido);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pedido_a_tarea ON public.pedidos;
CREATE TRIGGER trg_pedido_a_tarea
AFTER INSERT OR UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.fn_pedido_a_tarea();

-- Backfill: pedidos ya existentes aprobados/pendientes sin tarea de despacho.
INSERT INTO public.tareas (cliente_nombre, zona_geografica, servicio, estado, id_pedido)
SELECT p.cliente_nombre, p.zona_geografica, p.tipo_servicio, 'Pendiente', p.id_pedido
FROM public.pedidos p
WHERE p.estado = 'Pendiente' AND p.factibilidad_ok
  AND NOT EXISTS (SELECT 1 FROM public.tareas t WHERE t.id_pedido = p.id_pedido);
