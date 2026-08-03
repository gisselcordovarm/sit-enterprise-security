-- =============================================================================
-- SIT Enterprise Security · FLUJO DE INVITACIÓN / ACTIVACIÓN DE USUARIOS
-- -----------------------------------------------------------------------------
-- Aplica los cambios necesarios en un proyecto Supabase EXISTENTE para el
-- registro seguro con invitación del administrador:
--   - Columna `estado` en profiles ('pendiente' / 'activo' / 'inactivo').
--   - Trigger handle_new_user: rol desde user_metadata validado + estado inicial
--     'pendiente' para invitados (el admin nace 'activo').
--
-- NO es destructivo (no borra datos ni tablas). Es IDEMPOTENTE.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query.
--
-- Configuración adicional requerida en Supabase (Dashboard > Authentication):
--   - URL Configuration > Site URL: https://sit-enterprise-security.vercel.app
--   - URL Configuration > Redirect URLs: añadir
--       https://sit-enterprise-security.vercel.app/activar
--   - Email > SMTP Settings: configurar un proveedor (opcional pero recomendado;
--     sin SMTP, Supabase usa su remitente por defecto con límites de envío).
--   - Email > Templates > Invitación del usuario: el enlace {{ .ConfirmationURL }}
--     apunta al redirect configurado (página de activación de la app).
-- =============================================================================

-- 1) Columna de estado del ciclo de vida del usuario.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activo'
  CHECK (estado IN ('pendiente', 'activo', 'inactivo'));

-- 2) Trigger de alta automática (rol validado desde metadata + estado inicial).
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
      WHEN NEW.raw_user_meta_data ->> 'rol' IN ('admin', 'basico') THEN NEW.raw_user_meta_data ->> 'rol'
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

-- =============================================================================
-- VERIFICACIÓN (ejecutar después y revisar la salida)
-- =============================================================================
--    SELECT email, rol, estado, activo FROM public.profiles ORDER BY email;
--    (admin@tecnoinnova.com debe quedar con rol 'admin', estado 'activo';
--     los nuevos invitados aparecerán con estado 'pendiente'.)
-- =============================================================================
