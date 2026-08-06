-- =============================================================================
-- SIT Enterprise Security ·  AUTENTICACIÓN Y ROLES
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase.
-- Crea la infraestructura de perfiles/roles + el usuario administrador según
-- Supabase Auth. Es idempotente (se puede volver a correr sin errores).
--
-- Credenciales ADMIN por defecto:
--   Usuario : admin@tecnoinnova.com
--   Clave   : Admin2026@!
-- =============================================================================

-- ---------- 1) TABLA DE PERFILES (rol admin / basico) ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  nombre     TEXT,
  rol        TEXT NOT NULL DEFAULT 'basico' CHECK (rol IN ('admin', 'basico', 'vendedor', 'logistica', 'tecnico', 'soporte')),
  activo     BOOLEAN NOT NULL DEFAULT true,
  estado     TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('pendiente', 'activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 2) Función de control: ¿el usuario es admin? ----------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = 'admin' AND activo
  );
$$;

-- ---------- 3) Trigger: perfil automático al dar de alta un usuario ----------
-- El correo de administrador se eleva a rol 'admin'; el resto adopta el rol
-- operativo que el admin definió al invitar ('vendedor', 'logistica',
-- 'tecnico', 'soporte', 'basico' o 'admin', siempre validado contra la lista).
-- Los invitados inician en estado 'pendiente' (deben activarse con su contraseña).
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

-- ---------- 4) Seguridad RLS ----------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_select_own" ON public.profiles;
CREATE POLICY "profile_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profile_update_own" ON public.profiles;
CREATE POLICY "profile_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profile_insert_own" ON public.profiles;
CREATE POLICY "profile_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;

-- ---------- 5) Alta del usuario administrador ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_id    uuid := gen_random_uuid();
  v_email text := 'admin@tecnoinnova.com';
  v_pass  text := 'Admin2026@!';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_id, 'authenticated', 'authenticated', v_email,
      crypt(v_pass, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('nombre', 'Administrador SIT'),
      now(), now(), now(), '',
      '', '', true
    );

    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_email, v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  END IF;
END $$;

-- ---------- 6) Garantiza el perfil administrador activo ----------
INSERT INTO public.profiles (id, email, nombre, rol, activo)
SELECT id, email, 'Administrador SIT', 'admin', true
  FROM auth.users
  WHERE email = 'admin@tecnoinnova.com'
ON CONFLICT (email)
DO UPDATE SET rol = 'admin', activo = true, updated_at = now();