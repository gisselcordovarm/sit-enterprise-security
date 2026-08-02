-- =============================================================================
-- SIT Enterprise Security · RENOMBRAR COLUMNA fiscal (cuit -> rif)
-- Adapta bases que ya usaban el nombre argentino "cuit" al nombre venezolano
-- "rif". Idempotente: sólo actúa si la columna antigua existe y la nueva no.
-- =============================================================================

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