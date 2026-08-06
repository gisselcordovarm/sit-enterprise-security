-- =============================================================================
-- SIT Enterprise Security · SUB-ROLES OPERATIVOS
-- -----------------------------------------------------------------------------
-- Escala el modelo de roles de 2 (admin/basico) a 6 roles operativos:
--   admin, vendedor, logistica, tecnico, soporte, basico.
--
-- Aplica sobre un proyecto Supabase EXISTENTE (no borra datos; idempotente):
--   1) Amplía el CHECK de profiles(rol) con los nuevos roles.
--   2) Actualiza el trigger handle_new_user para validar los nuevos roles.
--   3) Crea `has_rol(text)` y políticas RLS de escritura por rol operativo
--      (vendedor -> pedidos/clientes; logistica -> operaciones/stock;
--      tecnico -> instalaciones; soporte -> postventa/NPS). El admin conserva
--      CRUD total (admin_all_*) y todos los autenticados conservan lectura.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query.
-- =============================================================================

-- ---------- 1) CHECK de roles ampliado ----------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_rol_check
  CHECK (rol IN ('admin', 'basico', 'vendedor', 'logistica', 'tecnico', 'soporte'));

-- ---------- 2) Trigger de alta automática (nuevos roles validados) ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, rol, estado)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', NEW.email),
    CASE
      WHEN NEW.email = 'admin@tecnoinnova.com' THEN 'admin'
      WHEN NEW.raw_user_meta_data ->> 'rol' IN ('admin', 'basico', 'vendedor', 'logistica', 'tecnico', 'soporte') THEN NEW.raw_user_meta_data ->> 'rol'
      ELSE 'basico'
    END,
    CASE WHEN NEW.email = 'admin@tecnoinnova.com' THEN 'activo' ELSE 'pendiente' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- 3) RLS por rol operativo ----------

-- ¿El usuario autenticado tiene el rol dado y su cuenta está activa?
CREATE OR REPLACE FUNCTION public.has_rol(p_rol text) RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = p_rol AND activo AND estado = 'activo'
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_rol(text) TO authenticated;

-- VENDEDOR: pedidos, clientes y detalle_pedido.
DROP POLICY IF EXISTS "vendedor_write_pedidos" ON pedidos;
CREATE POLICY "vendedor_write_pedidos" ON pedidos
  FOR ALL TO authenticated
  USING (public.has_rol('vendedor'))
  WITH CHECK (public.has_rol('vendedor'));

DROP POLICY IF EXISTS "vendedor_write_clientes" ON clientes;
CREATE POLICY "vendedor_write_clientes" ON clientes
  FOR ALL TO authenticated
  USING (public.has_rol('vendedor'))
  WITH CHECK (public.has_rol('vendedor'));

DROP POLICY IF EXISTS "vendedor_write_detalle_pedido" ON detalle_pedido;
CREATE POLICY "vendedor_write_detalle_pedido" ON detalle_pedido
  FOR ALL TO authenticated
  USING (public.has_rol('vendedor'))
  WITH CHECK (public.has_rol('vendedor'));

-- LOGISTICA: tareas, tecnicos, inventario y pedidos.
DROP POLICY IF EXISTS "logistica_write_tareas" ON tareas;
CREATE POLICY "logistica_write_tareas" ON tareas
  FOR ALL TO authenticated
  USING (public.has_rol('logistica'))
  WITH CHECK (public.has_rol('logistica'));

DROP POLICY IF EXISTS "logistica_write_tecnicos" ON tecnicos;
CREATE POLICY "logistica_write_tecnicos" ON tecnicos
  FOR ALL TO authenticated
  USING (public.has_rol('logistica'))
  WITH CHECK (public.has_rol('logistica'));

DROP POLICY IF EXISTS "logistica_write_inventario" ON inventario;
CREATE POLICY "logistica_write_inventario" ON inventario
  FOR ALL TO authenticated
  USING (public.has_rol('logistica'))
  WITH CHECK (public.has_rol('logistica'));

DROP POLICY IF EXISTS "logistica_write_pedidos" ON pedidos;
CREATE POLICY "logistica_write_pedidos" ON pedidos
  FOR ALL TO authenticated
  USING (public.has_rol('logistica'))
  WITH CHECK (public.has_rol('logistica'));

-- TECNICO: instalaciones y detalle_materiales.
DROP POLICY IF EXISTS "tecnico_write_instalaciones" ON instalaciones;
CREATE POLICY "tecnico_write_instalaciones" ON instalaciones
  FOR ALL TO authenticated
  USING (public.has_rol('tecnico'))
  WITH CHECK (public.has_rol('tecnico'));

DROP POLICY IF EXISTS "tecnico_write_detalle_materiales" ON detalle_materiales;
CREATE POLICY "tecnico_write_detalle_materiales" ON detalle_materiales
  FOR ALL TO authenticated
  USING (public.has_rol('tecnico'))
  WITH CHECK (public.has_rol('tecnico'));

-- SOPORTE: incidencias, encuestas y seguimiento_postventa.
DROP POLICY IF EXISTS "soporte_write_incidencias" ON incidencias;
CREATE POLICY "soporte_write_incidencias" ON incidencias
  FOR ALL TO authenticated
  USING (public.has_rol('soporte'))
  WITH CHECK (public.has_rol('soporte'));

DROP POLICY IF EXISTS "soporte_write_encuestas" ON encuestas;
CREATE POLICY "soporte_write_encuestas" ON encuestas
  FOR ALL TO authenticated
  USING (public.has_rol('soporte'))
  WITH CHECK (public.has_rol('soporte'));

DROP POLICY IF EXISTS "soporte_write_seguimiento" ON seguimiento_postventa;
CREATE POLICY "soporte_write_seguimiento" ON seguimiento_postventa
  FOR ALL TO authenticated
  USING (public.has_rol('soporte'))
  WITH CHECK (public.has_rol('soporte'));

-- =============================================================================
-- VERIFICACIÓN (ejecutar después y revisar la salida)
-- =============================================================================
--   1) SELECT email, rol, estado, activo FROM public.profiles ORDER BY email;
--      (admin@tecnoinnova.com debe seguir con rol 'admin', estado 'activo'.)
--   2) SELECT policyname, tablename, cmd FROM pg_policies
--        WHERE schemaname = 'public' ORDER BY tablename, policyname;
--      (debe listar admin_all_*, basico_read_*, y las de rol operativo.)
--   3) Invitar un usuario con rol 'vendedor' desde la app y verificar que en
--      `profiles` quede rol 'vendedor' tras activar la cuenta.
-- =============================================================================
