-- =============================================================================
-- SIT Enterprise Security · SEGURIDAD DE PERFILES (bloquea auto-elevación de rol)
-- -----------------------------------------------------------------------------
-- Cierra una vulnerabilidad de escalada de privilegios: la política
-- `profile_update_own` (auth_setup.sql) permite a cualquier usuario autenticado
-- actualizar SU PROPIA fila de profiles, incluida la columna `rol`. Un usuario
-- de rol bajo podía ejecutar `UPDATE profiles SET rol='admin'` y elevarse solo.
--
-- Este guard (trigger BEFORE UPDATE, SECURITY DEFINER) impide que un no-admin
-- cambie el `rol` (o el `id`) de cualquier perfil. El administrador conserva el
-- control total (la app usa /usuarios para cambiar roles/estados). El cambio de
-- nombre/foto/teléfono/cargo del propio perfil y la activación nativa de cuenta
-- (estado/activo) siguen permitidos para el dueño del perfil.
--
-- Es IDEMPOTENTE: se puede ejecutar varias veces sin errores.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.guard_profiles_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nadie puede reasignar la fila a otro usuario.
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'No autorizado para cambiar el id del perfil.';
  END IF;

  -- El rol solo lo cambia un administrador (cierra la auto-elevación).
  IF NEW.rol IS DISTINCT FROM OLD.rol AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede cambiar el rol del perfil.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profiles_update ON public.profiles;
CREATE TRIGGER trg_guard_profiles_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_update();

-- =============================================================================
-- VERIFICACIÓN (ejecutar después y revisar la salida)
-- =============================================================================
--   1) Con una cuenta NO admin (p. ej. un vendedor), intentar:
--      UPDATE public.profiles SET rol = 'admin' WHERE id = auth.uid();
--      Debe responder: "Solo el administrador puede cambiar el rol del perfil."
--
--   2) El administrador sigue pudiendo cambiar roles desde /usuarios:
--      UPDATE public.profiles SET rol = 'vendedor'
--      WHERE id = '<id-de-otro-usuario>';
--      Debe ejecutarse sin error.
--
--   3) Un usuario puede seguir editando su nombre/foto/teléfono (sin tocar rol).
-- =============================================================================
