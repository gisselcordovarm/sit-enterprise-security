// =============================================================================
// CONSULTAS SQL DE LOS REPORTES
// Estas consultas alimentan los formularios/reportes y además se embeben en el
// PDF de memoria que se entrega, para documentar la implementación en BD.
// =============================================================================

export const CONSULTAS_REPORTES = [
  {
    id: 'reporte_semanal',
    modulo: 'Reporte semanal de pedidos',
    archivo: 'Reporte_semanal_pedidos',
    descripcion: 'Cantidad de servicios y ventas por día durante la última semana.',
    sql: `SELECT d.dia,
  (SELECT count(*) FROM pedidos p WHERE p.fecha_pedido = d.dia) AS servicios,
  (SELECT COALESCE(sum(p.monto_total),0) FROM pedidos p
     WHERE p.fecha_pedido = d.dia AND p.flag_aprobado) AS ventas
FROM (SELECT generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day')::date AS dia) d
ORDER BY d.dia;`,
  },
  {
    id: 'inventario',
    modulo: 'Listado de Inventario',
    archivo: 'Listado_inventario',
    descripcion: 'Stock actual, umbral mínimo y estado de reposición de cada equipo.',
    sql: `SELECT codigo_equipo AS codigo,
       descripcion_equipo AS componente,
       stock_disponible,
       umbral_minimo,
       auto_reorden,
       COALESCE(solicitud_proveedor, 'N/A') AS reposicion
FROM public.inventario
ORDER BY id_equipo;`,
  },
  {
    id: 'tecnicos',
    modulo: 'Listado de Técnicos disponibles',
    archivo: 'Listado_tecnicos',
    descripcion: 'Técnicos activos con zona y carga de trabajo para su asignación.',
    sql: `SELECT id_tecnico,
       nombre_tecnico,
       especialidad,
       zona_geografica,
       disponibilidad,
       carga_trabajo
FROM public.tecnicos
WHERE disponibilidad = true
ORDER BY id_tecnico;`,
  },
  {
    id: 'facturas',
    modulo: 'Impresión de Facturas',
    archivo: 'Factura',
    descripcion: 'Registro facturable: solo pedidos en estado Instalado sin factura emitida.',
    sql: `SELECT p.id_pedido,
       p.cliente_nombre,
       p.tipo_servicio,
       p.monto_total,
       c.datos_fiscales AS cuit
FROM public.pedidos p
LEFT JOIN public.clientes c ON c.id_cliente = p.id_cliente
WHERE p.estado = 'Instalado'
  AND NOT EXISTS (SELECT 1 FROM public.facturas f WHERE f.id_pedido = p.id_pedido);`,
  },
]

// Consulta de apoyo (resumen de ventas aprobadas) que también se lista en memoria.
export const CONSULTA_METRICAS_SEMANALES = {
  modulo: 'Apoyo · Métricas semanales resumidas',
  archivo: 'Metricas_semanales',
  descripcion: 'Predicción de servicios y ventas por día (vista v_metricas_semanales).',
  sql: `CREATE OR REPLACE VIEW v_metricas_semanales AS
WITH dias AS (
  SELECT generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day'::interval)::date AS dia
)
SELECT d.dia,
  (SELECT count(*) FROM pedidos p WHERE p.fecha_pedido = d.dia) AS servicios,
  (SELECT COALESCE(sum(p.monto_total),0) FROM pedidos p
     WHERE p.fecha_pedido = d.dia AND p.flag_aprobado) AS ventas
FROM dias d;`,
}