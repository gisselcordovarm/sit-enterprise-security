-- =============================================================================
-- SIT Enterprise Security · PROFILES EXTRAS (foto, telefono, cargo)
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
--
-- Por qué: la columna `profiles.foto` no existe en producción (error 42703
-- "column profiles.foto does not exist"), lo que hace fallar TODO el guardado
-- de perfil (nombre, cargo, teléfono y foto) desde la página Mi Perfil.
-- Totalmente idempotente, no borra datos.
-- =============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS foto    TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo    TEXT;

-- Permisos: el usuario autenticado gestiona su propio perfil (RLS lo limita a
-- su propia fila). El admin puede ver todos los perfiles.
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
