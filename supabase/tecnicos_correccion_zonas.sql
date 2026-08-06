-- ============================================================
-- SIT Enterprise Security - Corrección de zonas de técnicos
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- Los 5 técnicos originales quedaron en zonas genéricas de un
-- seed antiguo (Oeste/Norte/Sur/Este). Se reasignan a su estado
-- real para completar el mínimo de 2 técnicos por estado.
-- Idempotente: el WHERE evita re-asignar si ya está correcto.
-- ============================================================

UPDATE public.tecnicos SET zona_geografica = 'Distrito Capital' WHERE nombre_tecnico = 'Ariel Ramírez'   AND zona_geografica <> 'Distrito Capital';
UPDATE public.tecnicos SET zona_geografica = 'Miranda'          WHERE nombre_tecnico = 'Carlos Ortega'    AND zona_geografica <> 'Miranda';
UPDATE public.tecnicos SET zona_geografica = 'Carabobo'         WHERE nombre_tecnico = 'Marcos Benítez'  AND zona_geografica <> 'Carabobo';
UPDATE public.tecnicos SET zona_geografica = 'Aragua'           WHERE nombre_tecnico = 'Sofía Herrera'   AND zona_geografica <> 'Aragua';
UPDATE public.tecnicos SET zona_geografica = 'Zulia'            WHERE nombre_tecnico = 'Diego Torres'    AND zona_geografica <> 'Zulia';
