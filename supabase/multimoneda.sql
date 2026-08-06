-- ============================================================
-- SIT Enterprise Security - Cumplimiento Fiscal Multimoneda
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- Agrega a "facturas" la tasa BCV del día de emisión y los
-- valores del IGTF (3%) y su equivalente en Bolívares.
-- Idempotente (ADD COLUMN IF NOT EXISTS).
-- ============================================================

ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS tasa_bcv NUMERIC(14,4),
  ADD COLUMN IF NOT EXISTS monto_bs NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS igtf_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igtf_bs NUMERIC(18,2) NOT NULL DEFAULT 0;
