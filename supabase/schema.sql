-- =============================================================================
-- SISTEMA INTEGRADO TECNOINNOVA (SIT)
-- Schema PostgreSQL / Supabase
-- =============================================================================

-- =============================================================================
-- 0. RESET
-- =============================================================================
DROP VIEW IF EXISTS v_dashboard_kpis, v_metricas_semanales, v_facturables, v_alertas CASCADE;
DROP TABLE IF EXISTS detalle_materiales CASCADE;
DROP TABLE IF EXISTS instalaciones CASCADE;
DROP TABLE IF EXISTS facturas CASCADE;
DROP TABLE IF EXISTS seguimiento_postventa CASCADE;
DROP TABLE IF EXISTS encuestas CASCADE;
DROP TABLE IF EXISTS incidencias CASCADE;
DROP TABLE IF EXISTS detalle_pedido CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS tareas CASCADE;
DROP TABLE IF EXISTS tecnicos CASCADE;
DROP TABLE IF EXISTS inventario CASCADE;
DROP TABLE IF EXISTS logs_financieros CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;

-- =============================================================================
-- 1. TABLAS (Normalización 3NF)
-- =============================================================================

-- D2 - Clientes (almacén maestro, datos de contacto y fiscales)
CREATE TABLE IF NOT EXISTS clientes (
  id_cliente          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre_cliente      VARCHAR(200) NOT NULL,
  telefono            VARCHAR(50),
  direccion           TEXT,
  zona_geografica     VARCHAR(30),
  datos_contacto      TEXT,
  datos_fiscales      TEXT,
  historial_financiero TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- D3 - Inventario / Productos (stock, umbral y reposición)
CREATE TABLE IF NOT EXISTS inventario (
  id_equipo           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo_equipo       VARCHAR(30),
  descripcion_equipo  VARCHAR(200) NOT NULL,
  stock_disponible    INT NOT NULL DEFAULT 0,
  umbral_minimo       INT NOT NULL DEFAULT 5,
  auto_reorden        BOOLEAN NOT NULL DEFAULT true,
  precio              NUMERIC(12,2) NOT NULL DEFAULT 0,
  solicitud_proveedor VARCHAR(50),
  status_reserva      VARCHAR(30) NOT NULL DEFAULT 'Disponible',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- D1 - Pedidos (intención de compra y validación factibilidad/financiera)
CREATE TABLE IF NOT EXISTS pedidos (
  id_pedido           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_cliente          BIGINT REFERENCES clientes(id_cliente),
  cliente_nombre      VARCHAR(200) NOT NULL,
  origen              VARCHAR(30) NOT NULL DEFAULT 'Web',
  tipo_servicio       VARCHAR(100) NOT NULL,
  zona_geografica     VARCHAR(30),
  direccion           TEXT,
  telefono            VARCHAR(50),
  cobertura_zona      BOOLEAN NOT NULL DEFAULT true,
  fecha_pedido        DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega       DATE,
  monto_total         NUMERIC(14,2) NOT NULL DEFAULT 0,
  factibilidad_ok     BOOLEAN NOT NULL DEFAULT false,
  motivo_factibilidad TEXT,
  pago_status         VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
  error_pago          TEXT,
  flag_aprobado       BOOLEAN NOT NULL DEFAULT false,
  estado              VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Detalle_Pedido (tabla de intersección N:N Pedidos <-> Inventario)
CREATE TABLE IF NOT EXISTS detalle_pedido (
  id_detalle          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_pedido           BIGINT NOT NULL REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
  id_equipo           BIGINT NOT NULL REFERENCES inventario(id_equipo),
  cantidad_solicitada INT NOT NULL DEFAULT 1
);

-- D4 - Técnicos (disponibilidad, zona geográfica y carga de trabajo)
CREATE TABLE IF NOT EXISTS tecnicos (
  id_tecnico          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre_tecnico      VARCHAR(200) NOT NULL,
  especialidad        VARCHAR(200),
  zona_geografica     VARCHAR(30),
  disponibilidad      BOOLEAN NOT NULL DEFAULT true,
  carga_trabajo       INT NOT NULL DEFAULT 0,
  firma_digital       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tareas pendientes de despacho / órdenes de trabajo
CREATE TABLE IF NOT EXISTS tareas (
  id_tarea            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_nombre      VARCHAR(200) NOT NULL,
  zona_geografica     VARCHAR(30),
  servicio            VARCHAR(200),
  estado              VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
  id_tecnico          BIGINT REFERENCES tecnicos(id_tecnico),
  id_pedido           BIGINT REFERENCES pedidos(id_pedido),
  fecha_asignacion    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Instalaciones (ejecución de instalación: reporte + firma digital)
CREATE TABLE IF NOT EXISTS instalaciones (
  id_instalacion      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_pedido           BIGINT REFERENCES pedidos(id_pedido),
  id_tecnico          BIGINT REFERENCES tecnicos(id_tecnico),
  fecha_programada    DATE,
  estado              VARCHAR(30) NOT NULL DEFAULT 'Programada',
  reporte_firmado     BOOLEAN NOT NULL DEFAULT false,
  firma_digital       TEXT,
  materiales          TEXT,
  notas               TEXT,
  fecha_ejecucion     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Detalle_Materiales (consumo de materiales por instalación / ajuste de stock)
CREATE TABLE IF NOT EXISTS detalle_materiales (
  id_detalle_mat      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_instalacion      BIGINT NOT NULL REFERENCES instalaciones(id_instalacion) ON DELETE CASCADE,
  id_equipo           BIGINT REFERENCES inventario(id_equipo),
  consumo_materiales  INT NOT NULL DEFAULT 0,
  ajuste_stock        INT NOT NULL DEFAULT 0
);

-- D5 - Facturas (documentación fiscal y estados de pago)
CREATE TABLE IF NOT EXISTS facturas (
  id_factura          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_pedido           BIGINT NOT NULL REFERENCES pedidos(id_pedido),
  id_cliente          BIGINT REFERENCES clientes(id_cliente),
  fecha_emision       DATE NOT NULL DEFAULT CURRENT_DATE,
  monto_total         NUMERIC(14,2) NOT NULL DEFAULT 0,
  rif                 VARCHAR(30),
  estado_pago         VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
  factura_pdf         TEXT,
  registro_contable   TEXT,
  comprobante_pago    TEXT,
  items               JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Libro diario contable
CREATE TABLE IF NOT EXISTS logs_financieros (
  id_log              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo                VARCHAR(30) NOT NULL DEFAULT 'Ajuste',
  descripcion         TEXT,
  monto               NUMERIC(14,2) NOT NULL DEFAULT 0,
  fecha               TIMESTAMPTZ NOT NULL DEFAULT now(),
  status              VARCHAR(30) NOT NULL DEFAULT 'Verificado'
);

-- D6 - Calidad / Seguimiento postventa (disparo T+7)
CREATE TABLE IF NOT EXISTS seguimiento_postventa (
  id_seguimiento      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_pedido           BIGINT REFERENCES pedidos(id_pedido),
  disparo_7_dias      TIMESTAMPTZ,
  fecha_contacto      TIMESTAMPTZ,
  estado              VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
  historial_calidad   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Incidencias reportadas postventa
CREATE TABLE IF NOT EXISTS incidencias (
  id_incidencia       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_pedido           BIGINT REFERENCES pedidos(id_pedido),
  id_seguimiento      BIGINT REFERENCES seguimiento_postventa(id_seguimiento),
  cliente_nombre      VARCHAR(200),
  tipo                VARCHAR(200),
  descripcion         TEXT,
  fecha               TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado              VARCHAR(30) NOT NULL DEFAULT 'Abierto',
  resolucion          TEXT
);

-- Encuestas de satisfacción (NPS)
CREATE TABLE IF NOT EXISTS encuestas (
  id_encuesta         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_pedido           BIGINT REFERENCES pedidos(id_pedido),
  id_seguimiento      BIGINT REFERENCES seguimiento_postventa(id_seguimiento),
  cliente_nombre      VARCHAR(200),
  nivel_satisfaccion  INT NOT NULL CHECK (nivel_satisfaccion BETWEEN 0 AND 10),
  tipo_cliente        VARCHAR(20),
  comentarios         TEXT,
  fecha_contacto      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. ÍNDICES (recomendados en la documentación)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente     ON pedidos(id_cliente);
CREATE INDEX IF NOT EXISTS idx_detalle_pedido_cruza ON detalle_pedido(id_pedido, id_equipo);
CREATE INDEX IF NOT EXISTS idx_facturas_pedido     ON facturas(id_pedido);
CREATE INDEX IF NOT EXISTS idx_tareas_estado       ON tareas(estado);
CREATE INDEX IF NOT EXISTS idx_instalaciones_estado ON instalaciones(estado);

-- =============================================================================
-- 3. LÓGICA DE NEGOCIO (funciones y triggers)
-- =============================================================================

-- Recalcula factibilidad, flag_aprobado y motivos de rechazo de un pedido.
-- Incluye guarda anti-recursión (el UPDATE interno vuelve a disparar el trigger).
CREATE OR REPLACE FUNCTION fn_recalcular_pedido(p_id BIGINT) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ped    record;
  v_stock_ok boolean := true;
  v_motivo text := '';
  d        record;
BEGIN
  IF COALESCE(current_setting('sit.recalc', true), '0') = '1' THEN
    RETURN;
  END IF;
  PERFORM set_config('sit.recalc', '1', true);

  SELECT * INTO v_ped FROM pedidos WHERE id_pedido = p_id;
  IF v_ped IS NULL THEN
    PERFORM set_config('sit.recalc', '0', true);
    RETURN;
  END IF;

  FOR d IN
    SELECT dp.cantidad_solicitada, i.descripcion_equipo, i.stock_disponible
    FROM detalle_pedido dp JOIN inventario i ON i.id_equipo = dp.id_equipo
    WHERE dp.id_pedido = p_id
  LOOP
    IF d.cantidad_solicitada > d.stock_disponible THEN
      v_stock_ok := false;
      v_motivo := v_motivo || 'Stock insuficiente de ' || d.descripcion_equipo || '. ';
    END IF;
  END LOOP;

  UPDATE pedidos SET
    factibilidad_ok = v_ped.cobertura_zona AND v_stock_ok,
    motivo_factibilidad = CASE
      WHEN NOT (v_ped.cobertura_zona AND v_stock_ok) THEN
        CASE WHEN v_ped.motivo_factibilidad IS NULL OR v_ped.motivo_factibilidad = '' THEN
          NULLIF(trim(v_motivo), '') ||
          CASE WHEN NOT v_ped.cobertura_zona THEN 'Zona sin cobertura de servicio.' ELSE '' END
        ELSE v_ped.motivo_factibilidad END
      ELSE NULL END,
    flag_aprobado = (v_ped.cobertura_zona AND v_stock_ok) AND v_ped.pago_status = 'Aprobado'
  WHERE id_pedido = p_id;

  PERFORM set_config('sit.recalc', '0', true);
END $$;

-- Reserva stock y gatilla reposición al registrar líneas de pedido
CREATE OR REPLACE FUNCTION fn_reservar_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_stock int;
  v_auto  boolean;
  v_umbral int;
BEGIN
  SELECT stock_disponible, auto_reorden, umbral_minimo
    INTO v_stock, v_auto, v_umbral
    FROM inventario WHERE id_equipo = NEW.id_equipo;

  IF v_stock >= NEW.cantidad_solicitada THEN
    UPDATE inventario
       SET stock_disponible = stock_disponible - NEW.cantidad_solicitada,
           status_reserva = 'Reservado'
     WHERE id_equipo = NEW.id_equipo;

    IF v_auto AND (v_stock - NEW.cantidad_solicitada) < v_umbral THEN
      UPDATE inventario SET solicitud_proveedor = 'PENDIENTE' WHERE id_equipo = NEW.id_equipo;
    END IF;
  END IF;

  PERFORM fn_recalcular_pedido(NEW.id_pedido);
  RETURN NEW;
END $$;

CREATE OR REPLACE TRIGGER trg_reservar_stock
AFTER INSERT ON detalle_pedido
FOR EACH ROW EXECUTE FUNCTION fn_reservar_stock();

-- Recalcula estado al insertar o actualizar un pedido
CREATE OR REPLACE FUNCTION fn_recalcular_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM fn_recalcular_pedido(NEW.id_pedido);
  RETURN NEW;
END $$;

CREATE OR REPLACE TRIGGER trg_recalcular_pedido
AFTER INSERT OR UPDATE ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_recalcular_trigger();

-- Cierre de instalación: estado Instalado + disparo_7_dias (calidad T+7)
CREATE OR REPLACE FUNCTION fn_instalacion_completada() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.estado = 'Completada' AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM 'Completada') THEN
    UPDATE pedidos SET estado = 'Instalado' WHERE id_pedido = NEW.id_pedido;

    IF NOT EXISTS (SELECT 1 FROM seguimiento_postventa WHERE id_pedido = NEW.id_pedido) THEN
      INSERT INTO seguimiento_postventa (id_pedido, disparo_7_dias, estado)
      VALUES (NEW.id_pedido, COALESCE(NEW.fecha_ejecucion, now()) + interval '7 days', 'Pendiente');
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE TRIGGER trg_instalacion_completada
AFTER INSERT OR UPDATE ON instalaciones
FOR EACH ROW EXECUTE FUNCTION fn_instalacion_completada();

-- =============================================================================
-- 4. VISTAS PARA EL DASHBOARD Y REPORTES
-- =============================================================================

CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
  (SELECT count(*) FROM pedidos) AS pedidos_totales,
  (SELECT count(*) FROM incidencias WHERE estado <> 'Cerrado') AS incidencias_abiertas,
  (SELECT count(*) FROM tecnicos WHERE disponibilidad) AS tecnicos_activos,
  (SELECT count(*) FROM tecnicos) AS tecnicos_totales,
  (SELECT COALESCE(round(
      ((count(*) FILTER (WHERE nivel_satisfaccion >= 9) - count(*) FILTER (WHERE nivel_satisfaccion <= 6))::numeric
      / NULLIF(count(*), 0)) * 100), 0)
    FROM encuestas) AS nps;

CREATE OR REPLACE VIEW v_metricas_semanales AS
WITH dias AS (
  SELECT generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day'::interval)::date AS dia
)
SELECT d.dia,
  (SELECT count(*) FROM pedidos p WHERE p.fecha_pedido = d.dia) AS servicios,
  (SELECT COALESCE(sum(p.monto_total), 0) FROM pedidos p
     WHERE p.fecha_pedido = d.dia AND p.flag_aprobado) AS ventas
FROM dias d;

CREATE OR REPLACE VIEW v_facturables AS
SELECT p.id_pedido, p.cliente_nombre, p.tipo_servicio, p.monto_total, p.fecha_entrega,
       c.datos_fiscales
FROM pedidos p
LEFT JOIN clientes c ON c.id_cliente = p.id_cliente
WHERE p.estado = 'Instalado'
  AND NOT EXISTS (SELECT 1 FROM facturas f WHERE f.id_pedido = p.id_pedido);

CREATE OR REPLACE VIEW v_alertas AS
SELECT
  (SELECT 'P' || id_pedido::text) AS id,
  'error'::text AS tipo,
  'Fallo de Factibilidad Técnica' AS titulo,
  'Pedido #' || id_pedido::text || ': ' || cliente_nombre || ' rechazado por factibilidad.' AS descripcion,
  fecha_pedido AS fecha,
  COALESCE(motivo_factibilidad, 'Sin motivo registrado.') AS detalles
FROM pedidos WHERE NOT factibilidad_ok
UNION ALL
SELECT 'I' || id_equipo::text, 'warning', 'Inventario Crítico',
  descripcion_equipo || ' por debajo del umbral (' || stock_disponible::text || ' uds restantes).',
  created_at::date,
  'Umbral configurado: ' || umbral_minimo::text || ' unidades. Reposición ' || COALESCE(solicitud_proveedor, 'manual') || '.'
FROM inventario WHERE stock_disponible < umbral_minimo
UNION ALL
SELECT 'P' || id_pedido::text, 'success', 'Autenticación de Pago',
  'Pago aprobado para Pedido #' || id_pedido::text || ' por $' || monto_total::text || ' USD.',
  fecha_pedido,
  'Transacción validada. flag_aprobado = true.'
FROM pedidos WHERE flag_aprobado AND pago_status = 'Aprobado'
UNION ALL
SELECT 'T' || id_tarea::text, 'info', 'Asignación de Técnico',
  'Técnico ' || COALESCE((SELECT nombre_tecnico FROM tecnicos t WHERE t.id_tecnico = tareas.id_tecnico), '') || ' asignado a ' || COALESCE(servicio,'') || ' en Zona ' || zona_geografica || '.',
  COALESCE(fecha_asignacion, created_at)::date,
  'Horario programado según cronograma. Tipo de servicio registrado.'
FROM tareas WHERE estado = 'Asignado'
UNION ALL
SELECT 'P' || id_pedido::text, 'error', 'Error de Pago',
  'Pago rechazado para Pedido #' || id_pedido::text || ' (' || cliente_nombre || ').',
  fecha_pedido,
  COALESCE(error_pago, 'Código: error_pago.')
FROM pedidos WHERE pago_status = 'Rechazado'
ORDER BY fecha DESC
LIMIT 10;

-- =============================================================================
-- 5. SEGURIDAD (RLS) Y PERMISOS
-- El acceso a los datos se restringe a usuarios autenticados (`authenticated`;
-- su sesión se gestiona con Supabase Auth). La clave pública `anon` NO tiene
-- permisos sobre las tablas de negocio.
-- Enforcement por rol a nivel de base de datos, vinculado a profiles(rol):
--   - admin  -> lectura y escritura completa en las tablas de negocio.
--   - basico -> solo lectura (SELECT) en las tablas de negocio.
-- La capa de aplicación también limita por rol (RequireRole), pero RLS impide
-- que un usuario autenticado cualquiera realice escrituras usando la clave
-- anónima, sin depender únicamente de la guardia del cliente.
-- =============================================================================

-- Tabla de perfiles (rol por usuario autenticado). Se define antes que las
-- políticas para que `is_admin()` pueda vincularlas a profiles(rol).
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  nombre     TEXT,
  rol        TEXT NOT NULL DEFAULT 'basico' CHECK (rol IN ('admin', 'basico')),
  activo     BOOLEAN NOT NULL DEFAULT true,
  estado     TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('pendiente', 'activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Verifica si el usuario actual es administrador (basado en profiles.rol).
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = 'admin' AND activo
  );
$$;

DO $$
DECLARE t text;
BEGIN
  -- Asegura que no queden políticas públicas heredadas ("allow_all_*").
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'profiles'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_anon_%I" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_auth_%I" ON %I;', t, t);
  END LOOP;

  -- Políticas por rol en cada tabla de negocio:
  --   - admin_all_<tabla>: CRUD completo, solo si profiles.rol = 'admin'.
  --   - basico_read_<tabla>: lectura para todo usuario autenticado.
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "business_all_auth_%I" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "admin_all_%I" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "basico_read_%I" ON %I;', t, t);

    EXECUTE format(
      'CREATE POLICY "admin_all_%I" ON %I
         FOR ALL TO authenticated
         USING (public.is_admin())
         WITH CHECK (public.is_admin());', t, t);

    EXECUTE format(
      'CREATE POLICY "basico_read_%I" ON %I
         FOR SELECT TO authenticated
         USING (true);', t, t);
  END LOOP;
END $$;

-- Las vistas de lectura se conceden a `anon` y `authenticated` (datos agregados).
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON v_dashboard_kpis, v_metricas_semanales, v_facturables, v_alertas TO anon, authenticated;

-- `anon` NO recibe permisos sobre las tablas de negocio.
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- 6. SEED / DATOS DE PRUEBA
-- =============================================================================
-- Ajusta las secuencias para que los ID visibles coincidan con la demo (SIT-7844...)
ALTER TABLE pedidos ALTER COLUMN id_pedido RESTART WITH 7844;
ALTER TABLE inventario ALTER COLUMN id_equipo RESTART WITH 101;
ALTER TABLE tecnicos ALTER COLUMN id_tecnico RESTART WITH 1;
ALTER TABLE tareas ALTER COLUMN id_tarea RESTART WITH 908;
ALTER TABLE incidencias ALTER COLUMN id_incidencia RESTART WITH 8801;
ALTER TABLE facturas ALTER COLUMN id_factura RESTART WITH 2091;
ALTER TABLE logs_financieros ALTER COLUMN id_log RESTART WITH 4501;

INSERT INTO clientes (nombre_cliente, telefono, direccion, zona_geografica, datos_contacto, datos_fiscales) VALUES
  ('Lucas Peralta', '+58 412 123-4567', 'Av. Francisco de Miranda, Chacao, Caracas', 'Distrito Capital', 'lucasperalta@mail.com', 'V-19347823-3'),
  ('Consorcio Las Heras', '+58 414 876-5432', 'Calle 72, Maracaibo, Zulia', 'Zulia', 'admin@lasheras.com', 'J-30601834-5'),
  ('Marcos Silva', '+58 416 555-7788', 'Av. Bolívar Norte, Valencia, Carabobo', 'Carabobo', 'msilva@mail.com', 'V-27654321-8'),
  ('Clínica del Parque', '+58 424 481-9900', 'Av. Libertador, El Rosal, Caracas', 'Distrito Capital', 'recepcion@clinica.com', 'J-30508126-1'),
  ('Telecom S.A.', '+58 212 430-2000', 'Av. Principal La Castellana, Caracas', 'Distrito Capital', 'facturacion@telecom.com', 'J-30259483-8'),
  ('Roberto Díaz', '+58 426 332-4455', 'Calle Las Mercedes, Maracay, Aragua', 'Aragua', 'rdiaz@mail.com', 'V-30158479-9'),
  ('Estación YPF', '+58 414 400-8800', 'Carretera Panamericana, San Antonio, Bolívar', 'Bolívar', 'operaciones@estacion.com', 'J-30301255-2')
ON CONFLICT DO NOTHING;

INSERT INTO inventario (codigo_equipo, descripcion_equipo, stock_disponible, umbral_minimo, auto_reorden, precio) VALUES
  ('INV-101', 'Cámara IP Domo 4K', 15, 15, true, 120),
  ('INV-102', 'Sensor PIR Movimiento', 5, 10, true, 35),
  ('INV-103', 'Panel Alarma Híbrido', 10, 5, false, 220),
  ('INV-104', 'Cable Coaxial RG6 (Rollo)', 25, 20, true, 18),
  ('INV-105', 'Batería Respaldo 12V', 2, 8, true, 60),
  ('INV-106', 'Controlador Acceso RFID', 6, 3, false, 280)
ON CONFLICT DO NOTHING;

INSERT INTO tecnicos (nombre_tecnico, especialidad, zona_geografica, disponibilidad, carga_trabajo) VALUES
  ('Ariel Ramírez', 'Instalación Cámaras', 'Distrito Capital', true, 2),
  ('Carlos Ortega', 'Alarmas / CCT', 'Miranda', true, 4),
  ('Marcos Benítez', 'Redes / Cámaras IP', 'Carabobo', true, 1),
  ('Sofía Herrera', 'Mantenimiento', 'Aragua', true, 0),
  ('Diego Torres', 'UPS / Energía', 'Zulia', true, 3)
ON CONFLICT DO NOTHING;

-- Fechas relativas a CURRENT_DATE para que el dashboard semanal muestre datos.
-- id_pedido explícito (OVERRIDING SYSTEM VALUE) para que coincidan los ID visibles
-- de la demo: SIT-7844 (Lucas), SIT-7842 (Consorcio), SIT-7840 (Marcos), SIT-7839 (Clínica), SIT-7848 (YPF)
INSERT INTO pedidos (id_pedido, id_cliente, cliente_nombre, origen, tipo_servicio, zona_geografica, cobertura_zona, fecha_pedido, monto_total, factibilidad_ok, pago_status, estado)
OVERRIDING SYSTEM VALUE VALUES
(7844, 1, 'Lucas Peralta', 'Web', 'Cámaras Residenciales', 'Distrito Capital', true, CURRENT_DATE - 1, 350, true, 'Aprobado', 'Instalado'),
  (7842, 2, 'Consorcio Las Heras', 'Call Center', 'Monitoreo 24/7', 'Zulia', false, CURRENT_DATE - 2, 1200, false, 'Aprobado', 'Rechazado'),
  (7840, 3, 'Marcos Silva', 'Call Center', 'Control de Acceso Rfid', 'Carabobo', true, CURRENT_DATE - 3, 850, true, 'Rechazado', 'Pendiente'),
  (7839, 4, 'Clínica del Parque', 'Web', 'Alarma de Incendios + CCT', 'Distrito Capital', true, CURRENT_DATE - 4, 6800, true, 'Aprobado', 'Instalado'),
  (7848, 7, 'Estación YPF', 'Call Center', 'Cámaras IP Corporativas', 'Bolívar', true, CURRENT_DATE - 2, 9000, true, 'Aprobado', 'Instalado');

-- Motivos de rechazo explícitos (documentación: notificacion_rechazo)
UPDATE pedidos SET motivo_factibilidad = 'Sin cobertura de fibra en coordenadas indicadas.' WHERE id_pedido = 7842;
UPDATE pedidos SET error_pago = 'Fondos Insuficientes' WHERE id_pedido = 7840;

-- Líneas de pedido (reservan stock vía trigger: 15->12, 5->3, 10->8)
INSERT INTO detalle_pedido (id_pedido, id_equipo, cantidad_solicitada) VALUES
  (7844, 101, 3),
  (7844, 104, 1),
  (7839, 103, 2),
  (7839, 102, 2);

INSERT INTO tareas (cliente_nombre, zona_geografica, servicio, estado) VALUES
  ('Banco Nación', 'Miranda', 'Instalación Alarma de Incendios', 'Pendiente'),
  ('Gimnasio FitLife', 'Aragua', 'Mantenimiento Cámaras', 'Pendiente'),
  ('Residencia Olivos', 'Distrito Capital', 'Instalación Sensores PIR', 'Pendiente'),
  ('Depósito Puerto', 'Carabobo', 'Reemplazo de Baterías UPS', 'Pendiente');

-- Asignación en ejecución (Estación YPF -> Marcos Benítez)
INSERT INTO tareas (cliente_nombre, zona_geografica, servicio, estado, id_tecnico, id_pedido, fecha_asignacion)
VALUES ('Estación YPF', 'Bolívar', 'Instalación Cámaras IP', 'Asignado', 3, 7848, now() - interval '3 hours');

-- Instalaciones completadas (disparan estado 'Instalado' + seguimiento T+7)
INSERT INTO instalaciones (id_pedido, id_tecnico, fecha_programada, estado, reporte_firmado, materiales, notas, fecha_ejecucion) VALUES
  (7844, 3, CURRENT_DATE - 1, 'Completada', true, '3x Cámaras Domo IP, 1x NVR 8 Canales, 1x Rollo Coaxial', 'Instalación finalizada sin observaciones. Pruebas de conectividad OK.', now() - interval '1 day'),
  (7839, 2, CURRENT_DATE - 3, 'Completada', true, '2x Panel Alarma Híbrido, 2x Sensor PIR', 'Sistema integrado al CCT del edificio. Comisionado OK.', now() - interval '3 days'),
  (7848, 3, CURRENT_DATE - 1, 'Completada', true, '4x Cámaras IP Bullet, 1x NVR 16 Canales', 'Despliegue perimetral completado. Grabación 24/7 activa.', now() - interval '1 day');

INSERT INTO facturas (id_pedido, id_cliente, fecha_emision, monto_total, rif, estado_pago, items) VALUES
  (7844, 1, CURRENT_DATE - 1, 350, 'V-200000233', 'Pagado',
   '[{"desc": "Instalación Cámaras Residenciales"}, {"desc": "Configuración de Red"}]'),
  (7839, 4, CURRENT_DATE - 3, 6800, 'J-305812623', 'Pendiente',
   '[{"desc": "Alarma de Incendios + CCT"}, {"desc": "Servicio Monitoreo Anual"}]');

INSERT INTO logs_financieros (tipo, descripcion, monto, fecha, status) VALUES
  ('Ingreso', 'Cobro de Pedido #7844 - Lucas Peralta', 350, '2026-06-11 15:45', 'Verificado'),
  ('Egreso', 'Pago Proveedor Cámaras S.A. (Compra Stock)', -4200, '2026-06-10 11:20', 'Verificado'),
  ('Ingreso', 'Cobro de Pedido #7839 - Clínica del Parque', 6800, '2026-06-08 09:15', 'Verificado'),
  ('Ajuste', 'Nota de Crédito para Pedido #7840 (Error pago)', -850, '2026-06-09 17:00', 'Pendiente');

INSERT INTO incidencias (id_pedido, cliente_nombre, tipo, descripcion, fecha, estado, resolucion) VALUES
  (7844, 'Lucas Peralta', 'Desconexión de Canal', 'Canal 3 sin señal por 20 min.', now() - interval '1 day', 'Cerrado', 'Resuelto por control remoto (Reinicio IP)'),
  (NULL, 'Banco Nación', 'Falsa Alarma Nocturna', 'Alarma disparada sin evento real a las 03:12 hs.', now() - interval '3 days', 'Investigando', 'Enviando técnico para recalibrar sensor PIR'),
  (7839, 'Clínica del Parque', 'Baja Batería Respaldo', 'Batería de respaldo agotada.', now() - interval '5 days', 'Abierto', 'Batería de respaldo agotada, requiere recambio'),
  (7840, 'Marcos Silva', 'Error Configuración App', 'La app no sincroniza credenciales.', now() - interval '6 days', 'Cerrado', 'Soporte telefónico configuró credenciales');

INSERT INTO encuestas (id_pedido, cliente_nombre, nivel_satisfaccion, tipo_cliente, comentarios, fecha_contacto) VALUES
  (7844, 'Lucas Peralta', 9, 'Promotor', 'Las cámaras funcionan perfecto. Muy limpio el trabajo.', now() - interval '2 days'),
  (NULL, 'Telecom S.A.', 10, 'Promotor', 'Excelente ruteo y puntualidad técnica.', now() - interval '4 days'),
  (NULL, 'Roberto Díaz', 8, 'Pasivo', 'El servicio es bueno, pero la app móvil tarda en conectar.', now() - interval '6 days');

-- =============================================================================
-- 7. AUTENTICACIÓN Y PERFILES DE USUARIO (ROL ADMIN / BASICO)
-- =============================================================================
-- La tabla `profiles` y la función `is_admin()` se definen en la sección 5
-- (seguridad/RLS), antes que las políticas de negocio. Aquí se completa la
-- gestión de perfiles: alta automática y políticas estrictas sobre la propia
-- tabla de perfiles.

-- Crea automáticamente el perfil cuando se da de alta un usuario en Supabase Auth.
-- Rol asignado: 'admin' para el correo administrador configurado; para el resto
-- se toma de `raw_user_meta_data.rol` (solo 'admin' o 'basico', nunca confiado
-- sin validar; el administrador lo define al invitar desde la app). El estado
-- inicial es 'activo' para el admin y 'pendiente' para los invitados (deben
-- activar su cuenta definiendo su contraseña con el enlace de invitación).
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
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

-- RLS de perfiles: cada uno ve/edita el propio; el admin ve/gestiona todos.
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

GRANT ALL ON public.is_admin() TO authenticated;
