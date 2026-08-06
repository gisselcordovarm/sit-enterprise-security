-- ============================================================
-- SIT Enterprise Security - 2 técnicos por estado
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- Garantiza al menos 2 técnicos en cada una de las 24 zonas de
-- Venezuela para que todo pedido tenga técnico asignable.
-- Idempotente: no duplica los ya existentes (verifica por nombre).
-- ============================================================

INSERT INTO public.tecnicos (nombre_tecnico, especialidad, zona_geografica, disponibilidad, carga_trabajo)
SELECT v.*
FROM (VALUES
  -- Distrito Capital
  ('Ariel Ramírez', 'Instalación Cámaras', 'Distrito Capital', true, 2),
  ('Valeria Acosta', 'Alarmas / CCT', 'Distrito Capital', true, 0),
  -- Miranda
  ('Carlos Ortega', 'Alarmas / CCT', 'Miranda', true, 4),
  ('Jorge Peña', 'Instalación Cámaras', 'Miranda', true, 0),
  -- Carabobo
  ('Marcos Benítez', 'Redes / Cámaras IP', 'Carabobo', true, 1),
  ('Daniela Rojas', 'Mantenimiento', 'Carabobo', true, 0),
  -- Aragua
  ('Sofía Herrera', 'Mantenimiento', 'Aragua', true, 0),
  ('Luis Zambrano', 'UPS / Energía', 'Aragua', true, 2),
  -- Zulia
  ('Diego Torres', 'UPS / Energía', 'Zulia', true, 3),
  ('Kevin Pirela', 'Control de Acceso', 'Zulia', true, 0),
  -- La Guaira
  ('Pedro Salas', 'Instalación Cámaras', 'La Guaira', true, 1),
  ('Renata Gil', 'Alarmas / CCT', 'La Guaira', true, 0),
  -- Anzoátegui
  ('Héctor Marcano', 'Redes / Cámaras IP', 'Anzoátegui', true, 1),
  ('Yulimar Figuera', 'Mantenimiento', 'Anzoátegui', true, 0),
  -- Lara
  ('Andrés Giménez', 'UPS / Energía', 'Lara', true, 2),
  ('María León', 'Control de Acceso', 'Lara', true, 0),
  -- Bolívar
  ('Ricardo Medina', 'Instalación Cámaras', 'Bolívar', true, 1),
  ('Génesis Rondón', 'Alarmas / CCT', 'Bolívar', true, 0),
  -- Monagas
  ('Rafael Castro', 'Redes / Cámaras IP', 'Monagas', true, 1),
  ('Adriana Velásquez', 'Mantenimiento', 'Monagas', true, 0),
  -- Sucre
  ('Miguel Cova', 'UPS / Energía', 'Sucre', true, 1),
  ('Estefanía Guzmán', 'Control de Acceso', 'Sucre', true, 0),
  -- Nueva Esparta
  ('José Marcano', 'Instalación Cámaras', 'Nueva Esparta', true, 1),
  ('Paola Vásquez', 'Alarmas / CCT', 'Nueva Esparta', true, 0),
  -- Falcón
  ('Fernando Chirinos', 'Redes / Cámaras IP', 'Falcón', true, 1),
  ('Angélica Colina', 'Mantenimiento', 'Falcón', true, 0),
  -- Táchira
  ('Simón Contreras', 'UPS / Energía', 'Táchira', true, 1),
  ('Katherine Mora', 'Control de Acceso', 'Táchira', true, 0),
  -- Mérida
  ('Gustavo Rangel', 'Instalación Cámaras', 'Mérida', true, 1),
  ('Rossana Briceno', 'Alarmas / CCT', 'Mérida', true, 0),
  -- Trujillo
  ('Emilio Castillo', 'Redes / Cámaras IP', 'Trujillo', true, 1),
  ('Verónica Linares', 'Mantenimiento', 'Trujillo', true, 0),
  -- Barinas
  ('Omar Briceño', 'UPS / Energía', 'Barinas', true, 1),
  ('Andreina Fuentes', 'Control de Acceso', 'Barinas', true, 0),
  -- Apure
  ('Ismael Torrealba', 'Instalación Cámaras', 'Apure', true, 1),
  ('Dayana López', 'Alarmas / CCT', 'Apure', true, 0),
  -- Cojedes
  ('César Camacho', 'Redes / Cámaras IP', 'Cojedes', true, 1),
  ('Nataly Herrera', 'Mantenimiento', 'Cojedes', true, 0),
  -- Guárico
  ('Alejandro Pino', 'UPS / Energía', 'Guárico', true, 1),
  ('Marielena Sosa', 'Control de Acceso', 'Guárico', true, 0),
  -- Portuguesa
  ('Jesús Quintana', 'Instalación Cámaras', 'Portuguesa', true, 1),
  ('Lucía Araujo', 'Alarmas / CCT', 'Portuguesa', true, 0),
  -- Yaracuy
  ('Manuel Oropeza', 'Redes / Cámaras IP', 'Yaracuy', true, 1),
  ('Sabrina Díaz', 'Mantenimiento', 'Yaracuy', true, 0),
  -- Amazonas
  ('Sergio Yanez', 'UPS / Energía', 'Amazonas', true, 1),
  ('Rosmery Córdoba', 'Control de Acceso', 'Amazonas', true, 0),
  -- Delta Amacuro
  ('Eduardo Malave', 'Instalación Cámaras', 'Delta Amacuro', true, 1),
  ('Keyla Rivas', 'Alarmas / CCT', 'Delta Amacuro', true, 0)
) AS v(nombre_tecnico, especialidad, zona_geografica, disponibilidad, carga_trabajo)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tecnicos t WHERE t.nombre_tecnico = v.nombre_tecnico
);
