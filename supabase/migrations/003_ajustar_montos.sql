-- =============================================================================
-- SIT Enterprise Security · AJUSTE DE MONTOS DE EJEMPLO A DÓLARES
-- Aplica los nuevos montos (trabajos máximos < USD 10.000) sobre los datos ya
-- cargados, SIN borrar registros. Es idempotente.
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- =============================================================================

-- 1) Pedidos
UPDATE public.pedidos SET monto_total = 350   WHERE id_pedido = 7844;
UPDATE public.pedidos SET monto_total = 1200  WHERE id_pedido = 7842;
UPDATE public.pedidos SET monto_total = 850   WHERE id_pedido = 7840;
UPDATE public.pedidos SET monto_total = 6800  WHERE id_pedido = 7839;
UPDATE public.pedidos SET monto_total = 9000  WHERE id_pedido = 7848;

-- 2) Facturas
UPDATE public.facturas SET monto_total = 350, cuit = 'V-200000233' WHERE id_pedido = 7844;
UPDATE public.facturas SET monto_total = 6800, cuit = 'V-305812623' WHERE id_pedido = 7839;

-- 3) Libro contable (logs_financieros)
UPDATE public.logs_financieros SET monto = 350 WHERE descripcion LIKE '%Cobro de Pedido #7844%';
UPDATE public.logs_financieros SET monto = 6800 WHERE descripcion LIKE '%Cobro de Pedido #7839%';
UPDATE public.logs_financieros SET monto = -4200 WHERE descripcion LIKE '%Compra Stock%' AND monto < 0;
UPDATE public.logs_financieros SET monto = -850 WHERE descripcion LIKE '%Nota de Crédito%';

-- 4) Inventario (precio unitario en USD)
UPDATE public.inventario SET precio = 120 WHERE codigo_equipo = 'INV-101';
UPDATE public.inventario SET precio = 35  WHERE codigo_equipo = 'INV-102';
UPDATE public.inventario SET precio = 220 WHERE codigo_equipo = 'INV-103';
UPDATE public.inventario SET precio = 18  WHERE codigo_equipo = 'INV-104';
UPDATE public.inventario SET precio = 60  WHERE codigo_equipo = 'INV-105';
UPDATE public.inventario SET precio = 280 WHERE codigo_equipo = 'INV-106';