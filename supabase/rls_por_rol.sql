-- =============================================================================
-- SIT Enterprise Security · MIGRACIÓN RLS POR ROL
-- -----------------------------------------------------------------------------
-- Aplica el enforcement por rol a nivel de base de datos sobre las tablas de
-- negocio, SIN tocar datos (no es destructivo ni repite el schema completo):
--
--   - admin  -> lectura y escritura completa (policy admin_all_<tabla>)
--   - basico -> solo lectura (policy basico_read_<tabla>)
--
-- Es IDEMPOTENTE: se puede ejecutar varias veces sin errores.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query.
-- =============================================================================

-- 1) Reafirma la función de control de rol (idempotente).
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = 'admin' AND activo
  );
$$;

-- 2) Políticas por rol en cada tabla de negocio (no toca `profiles`).
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'profiles'
  LOOP
    -- RLS activado por si alguna tabla quedó sin él.
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);

    -- Limpia políticas antiguas / permisivas.
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_anon_%I" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_auth_%I" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "business_all_auth_%I" ON %I;', t, t);

    -- Política para ADMIN: CRUD completo.
    EXECUTE format('DROP POLICY IF EXISTS "admin_all_%I" ON %I;', t, t);
    EXECUTE format(
      'CREATE POLICY "admin_all_%I" ON %I
         FOR ALL TO authenticated
         USING (public.is_admin())
         WITH CHECK (public.is_admin());', t, t);

    -- Política para BASICO: solo lectura.
    EXECUTE format('DROP POLICY IF EXISTS "basico_read_%I" ON %I;', t, t);
    EXECUTE format(
      'CREATE POLICY "basico_read_%I" ON %I
         FOR SELECT TO authenticated
         USING (true);', t, t);
  END LOOP;
END $$;

-- 3) Reafirma permisos (idempotente).
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- VERIFICACIÓN (ejecutar después y revisar la salida)
-- =============================================================================
-- A) Políticas por tabla (debe listar admin_all_* y basico_read_* en cada una):
--    SELECT tablename, policyname, cmd
--    FROM pg_policies
--    WHERE schemaname = 'public' AND tablename <> 'profiles'
--    ORDER BY tablename, cmd;
--
-- B) El usuario admin debe tener rol='admin' (si no, queda sin escritura):
--    SELECT email, rol, activo FROM public.profiles ORDER BY email;
--    (si admin@tecnoinnova.com no figura con rol 'admin', correr auth_setup.sql)
-- =============================================================================
