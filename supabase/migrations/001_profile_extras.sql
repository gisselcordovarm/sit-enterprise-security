-- =============================================================================
-- SIT Enterprise Security · PERFIL DE USUARIO (foto, teléfono, cargo)
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (migración complementaria a
-- auth_setup.sql). Totalmente idempotente, no borra datos.
-- =============================================================================

-- Campos extra del perfil para la ficha de usuario
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS foto    TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo    TEXT;

-- Permisos: el usuario autenticado gestiona su propio perfil (RLS ya lo limita
-- a su propia fila). El admin puede ver todos los perfiles.
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;