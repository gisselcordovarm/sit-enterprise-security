import { supabase, DEMO_MODE } from './supabase'
import { formatMoney } from './format'

// =============================================================================
// Utilidades de mapeo y formato
// =============================================================================

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const diff = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000))
  if (diff < 1) return 'Ahora'
  if (diff < 60) return `Hace ${diff} min`
  const hours = Math.round(diff / 60)
  if (hours < 24) return `Hace ${hours} hora${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  if (days < 7) return `Hace ${days} día${days === 1 ? '' : 's'}`
  return d.toLocaleDateString('es-VE')
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-VE')
}

// =============================================================================
// Fallback DEMO (mismos datos mock de las vistas originales)
// =============================================================================

const demoPedidos = [
  { id: 'SIT-7844', cliente: 'Lucas Peralta', origen: 'Web', servicio: 'Cámaras Residenciales', factibilidad: 'Aprobada', pagoStatus: 'Aprobado', flag_aprobado: true, total: 350, fecha: '2026-06-11', error_pago: null, motivoFeat: null, estado: 'Pendiente', geoEstado: 'Distrito Capital', municipio: 'Libertador', ciudad: 'Caracas', zona: 'Caracas, Libertador, Distrito Capital' },
  { id: 'SIT-7842', cliente: 'Consorcio Las Heras', origen: 'Call Center', servicio: 'Monitoreo 24/7', factibilidad: 'Rechazada', pagoStatus: 'Aprobado', flag_aprobado: false, total: 1200, fecha: '2026-06-10', error_pago: null, motivoFeat: 'Sin cobertura de fibra en coordenadas', geoEstado: 'Zulia', municipio: 'Maracaibo', ciudad: 'Maracaibo', zona: 'Maracaibo, Maracaibo, Zulia' },
  { id: 'SIT-7840', cliente: 'Marcos Silva', origen: 'Call Center', servicio: 'Control de Acceso Rfid', factibilidad: 'Aprobada', pagoStatus: 'Rechazado', flag_aprobado: false, total: 850, fecha: '2026-06-09', error_pago: 'Fondos Insuficientes', motivoFeat: null, geoEstado: 'Carabobo', municipio: 'Valencia', ciudad: 'Valencia', zona: 'Valencia, Valencia, Carabobo' },
  { id: 'SIT-7839', cliente: 'Clínica del Parque', origen: 'Web', servicio: 'Alarma de Incendios + CCT', factibilidad: 'Aprobada', pagoStatus: 'Aprobado', flag_aprobado: true, total: 6800, fecha: '2026-06-08', error_pago: null, motivoFeat: null, geoEstado: 'Aragua', municipio: 'Girardot', ciudad: 'Maracay', zona: 'Maracay, Girardot, Aragua' },
]

const demoInventario = [
  { id: 'INV-101', dbId: 'INV-101', name: 'Cámara IP Domo 4K', stock: 12, minThreshold: 15, autoReorder: true, lastReorderDate: '2026-06-01', reorderStatus: 'Pendiente' },
  { id: 'INV-102', dbId: 'INV-102', name: 'Sensor PIR Movimiento', stock: 3, minThreshold: 10, autoReorder: true, lastReorderDate: null, reorderStatus: 'Ninguno' },
  { id: 'INV-103', dbId: 'INV-103', name: 'Panel Alarma Híbrido', stock: 8, minThreshold: 5, autoReorder: false, lastReorderDate: null, reorderStatus: 'Ninguno' },
  { id: 'INV-104', dbId: 'INV-104', name: 'Cable Coaxial RG6 (Rollo)', stock: 25, minThreshold: 20, autoReorder: true, lastReorderDate: null, reorderStatus: 'Ninguno' },
  { id: 'INV-105', dbId: 'INV-105', name: 'Batería Respaldo 12V', stock: 2, minThreshold: 8, autoReorder: true, lastReorderDate: '2026-06-11', reorderStatus: 'Despachado' },
  { id: 'INV-106', dbId: 'INV-106', name: 'Control de Acceso RFID', stock: 6, minThreshold: 4, autoReorder: true, lastReorderDate: null, reorderStatus: 'Ninguno' },
]

const demoTecnicos = [
  { id: 'TECH-01', name: 'Ariel Ramírez', zone: 'Distrito Capital', workload: 2, status: 'Activo' },
  { id: 'TECH-02', name: 'Carlos Ortega', zone: 'Miranda', workload: 4, status: 'Activo' },
  { id: 'TECH-03', name: 'Marcos Benítez', zone: 'Carabobo', workload: 1, status: 'Activo' },
  { id: 'TECH-04', name: 'Sofía Herrera', zone: 'Aragua', workload: 0, status: 'Activo' },
  { id: 'TECH-05', name: 'Diego Torres', zone: 'Zulia', workload: 3, status: 'Activo' },
]

const demoPendingTasks = [
  { id: 'TSK-908', client: 'Banco Nación', zone: 'Miranda', service: 'Instalación Alarma de Incendios' },
  { id: 'TSK-909', client: 'Gimnasio FitLife', zone: 'Aragua', service: 'Mantenimiento Cámaras' },
  { id: 'TSK-910', client: 'Residencia Olivos', zone: 'Distrito Capital', service: 'Instalación Sensores PIR' },
  { id: 'TSK-911', client: 'Depósito Puerto', zone: 'Carabobo', service: 'Reemplazo de Baterías UPS' },
]

const demoAssignments = [
  { id: 'ASG-701', task: 'Instalación Cámaras IP', client: 'Estación YPF', zone: 'Aragua', tech: 'Marcos Benítez', status: 'En camino' },
]

const demoInstalaciones = [
  { id: 'INST-9001', taskId: 'TSK-7844', client: 'Lucas Peralta', address: 'Av. Francisco de Miranda, Chacao, Distrito Capital', zone: 'Distrito Capital', service: 'Instalación Cámaras Residenciales', components: '3x Cámaras Domo IP, 1x NVR 8 Canales', estado: 'Programada', tecnico: 'TECH-01' },
]

const demoFacturas = [
  { id: 'FAC-2091', orderId: 'SIT-7844', cliente: 'Lucas Peralta', total: 350, rif: 'V-19347823-3', fecha: '2026-06-11', items: ['Instalación Cámaras Residenciales', 'Configuración de Red'] },
  { id: 'FAC-2092', orderId: 'SIT-7839', cliente: 'Clínica del Parque', total: 6800, rif: 'J-30581262-3', fecha: '2026-06-08', items: ['Alarma de Incendios + CCT', 'Servicio Monitoreo Anual'] },
]

const demoLogs = [
  { id: 'LOG-4501', tipo: 'Ingreso', descripcion: 'Cobro de Pedido #7844 - Lucas Peralta', monto: 350, fecha: '2026-06-11 15:45', status: 'Verificado' },
  { id: 'LOG-4502', tipo: 'Egreso', descripcion: 'Pago Proveedor Cámaras S.A. (Compra Stock)', monto: -4200, fecha: '2026-06-10 11:20', status: 'Verificado' },
  { id: 'LOG-4503', tipo: 'Ingreso', descripcion: 'Cobro de Pedido #7839 - Clínica del Parque', monto: 6800, fecha: '2026-06-08 09:15', status: 'Verificado' },
  { id: 'LOG-4504', tipo: 'Ajuste', descripcion: 'Nota de Crédito para Pedido #7840 (Error pago)', monto: -850, status: 'Pendiente', fecha: '2026-06-09 17:00' },
]

const demoIncidencias = [
  { id: 'INC-8801', client: 'Lucas Peralta', type: 'Desconexión de Canal', date: 'Hace 1 día', status: 'Cerrado', resolution: 'Resuelto por control remoto (Reinicio IP)' },
  { id: 'INC-8802', client: 'Banco Nación', type: 'Falsa Alarma Nocturna', date: 'Hace 3 días', status: 'Investigando', resolution: 'Enviando técnico para recalibrar sensor PIR' },
  { id: 'INC-8803', client: 'Clínica del Parque', type: 'Baja Batería Respaldo', date: 'Hace 5 días', status: 'Abierto', resolution: 'Batería de respaldo agotada, requiere recambio' },
  { id: 'INC-8804', client: 'Marcos Silva', type: 'Error Configuración App', date: 'Hace 6 días', status: 'Cerrado', resolution: 'Soporte telefónico configuró credenciales' },
]

const demoEncuestas = [
  { id: 1, client: 'Telecom S.A.', rating: 10, type: 'Promotor', comment: 'Excelente ruteo y puntualidad técnica.' },
  { id: 2, client: 'Lucas Peralta', rating: 9, type: 'Promotor', comment: 'Las cámaras funcionan perfecto. Muy limpio el trabajo.' },
  { id: 3, client: 'Marcos Silva', rating: 5, type: 'Detractor', comment: 'El pago dio error y tardaron en contactarme para solucionarlo.' },
  { id: 4, client: 'Roberto Díaz', rating: 8, type: 'Pasivo', comment: 'El servicio es bueno, pero la app móvil tarda en conectar.' },
]

const demoKpis = { pedidosTotales: 1248, incidenciasAbiertas: 14, tecnicosActivos: 42, tecnicosTotales: 48, nps: 74 }

const demoSemana = [
  { dia: null, servicios: 80, ventas: 450 },
  { dia: null, servicios: 95, ventas: 800 },
  { dia: null, servicios: 110, ventas: 1300 },
  { dia: null, servicios: 75, ventas: 2100 },
  { dia: null, servicios: 130, ventas: 2600 },
  { dia: null, servicios: 50, ventas: 1500 },
  { dia: null, servicios: 30, ventas: 900 },
]

const demoAlertas = [
  { id: 'D1', type: 'error', title: 'Fallo de Feat. Técnica', description: 'Pedido #7842: Error de factibilidad técnica en Zona Norte. No hay cobertura de fibra óptica disponible en las coordenadas indicadas.', time: 'Hace 5 min', details: 'Dirección: Av. San Martín 1540. Solicitud cancelada provisionalmente hasta confirmación de antena microondas.' },
  { id: 'D2', type: 'warning', title: 'Inventario Crítico', description: 'Sensores de movimiento infrarrojos (Ref: PIR-400) por debajo del umbral de seguridad (5 unidades restantes).', time: 'Hace 15 min', details: 'Inventario actual: 3 unidades. Umbral configurado: 10 unidades. Se sugiere reabastecimiento automático.' },
  { id: 'D3', type: 'success', title: 'Autenticación de Pago', description: 'Pago aprobado para Pedido #7844 (Web) por $350,00 USD. Estado: flag_aprobado = true.', time: 'Hace 30 min', details: 'Transacción ID: TXN-9081273. Procesador: Stripe SIT. Tarjeta terminada en 4821.' },
  { id: 'D4', type: 'info', title: 'Asignación de Técnico', description: 'Técnico Ariel Ramírez asignado al servicio de instalación en Zona Oeste (Orden #9034).', time: 'Hace 1 hora', details: 'Horario programado: 14:30 hs. Tipo: Instalación Cámaras IP de Alta Seguridad.' },
  { id: 'D5', type: 'error', title: 'Error de Pago', description: 'Pago rechazado para Pedido #7840 (Call Center). Código: error_pago (Fondos Insuficientes).', time: 'Hace 2 horas', details: 'Cliente: Marcos Silva. Re-intento programado de forma manual en 24 horas.' },
]

// =============================================================================
// Helpers de lógica de negocio compartida
// =============================================================================

export function computeOrderStatus(payload) {
  const factibilidad = payload.coberturaFibra === 'SI'
  const pagoStatus = payload.tarjetaLimite === 'SUFICIENTE' ? 'Aprobado' : 'Rechazado'
  return {
    factibilidad,
    pagoStatus,
    aprobado: factibilidad && pagoStatus === 'Aprobado',
    error_pago: pagoStatus === 'Rechazado' ? 'Rechazado: Fondos Insuficientes' : null,
    motivoFeat: !factibilidad ? 'Sin cobertura de fibra en la zona seleccionada' : null,
  }
}

export function getTipoCliente(rating) {
  if (rating >= 9) return 'Promotor'
  if (rating <= 6) return 'Detractor'
  return 'Pasivo'
}

export function defaultEquipoCodigo(servicio) {
  const map = {
    'Cámaras Residenciales': 'INV-101',
    'Monitoreo 24/7': 'INV-103',
    'Control de Acceso Rfid': 'INV-106',
    'Alarma de Incendios + CCT': 'INV-103',
  }
  return map[servicio] || null
}

async function withFallback(fn, fallback) {
  // Sin Supabase configurado → modo demo con datos locales.
  if (DEMO_MODE || !supabase) return fallback()
  // Con Supabase activo: se consulta en vivo. Los errores reales se relanzan
  // para que la UI los muestre (liveError) en lugar de devolver datos demo en
  //m: enmascarar, como ocurría antes.
  return await fn()
}

// =============================================================================
// PEDIDOS
// =============================================================================

const mapPedido = (r) => ({
  id: `SIT-${r.id_pedido}`,
  cliente: r.cliente_nombre,
  origen: r.origen,
  servicio: r.tipo_servicio,
  factibilidad: r.factibilidad_ok ? 'Aprobada' : 'Rechazada',
  pagoStatus: r.pago_status === 'Aprobado' ? 'Aprobado' : 'Rechazado',
  flag_aprobado: r.flag_aprobado,
  total: Number(r.monto_total),
  fecha: r.fecha_pedido,
  error_pago: r.error_pago,
  motivoFeat: r.motivo_factibilidad,
  estado: r.estado,
  geoEstado: r.geo_estado,
  municipio: r.municipio,
  ciudad: r.ciudad,
  zona: r.zona_geografica || '',
})

export async function fetchPedidos() {
  return withFallback(async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('fecha_pedido', { ascending: false })
    if (error) throw error
    return (data || []).map(mapPedido)
  }, () => [...demoPedidos])
}

export async function crearPedido(payload) {
  if (!supabase) return crearPedidoDemo(payload)
  try {
    const status = computeOrderStatus(payload)
    // La columna zona_geografica es VARCHAR(30) en el esquema vivo; se recorta
    // para no provocar un error de "value too long" al persistir.
    const zona = String([payload.ciudad, payload.municipio, payload.estado].filter(Boolean).join(', ')).slice(0, 29)

    let idCliente = null
    const { data: existing } = await supabase
      .from('clientes').select('id_cliente').eq('nombre_cliente', payload.cliente).maybeSingle()
    if (existing) idCliente = existing.id_cliente
    if (!idCliente) {
      const { data: newClient, error: cErr } = await supabase
        .from('clientes')
        .insert({
          nombre_cliente: payload.cliente,
          zona_geografica: zona,
          direccion: payload.direccion || '',
        })
        .select('id_cliente').single()
      if (cErr) throw cErr
      idCliente = newClient.id_cliente
    }

    const { data: pedido, error: pErr } = await supabase
      .from('pedidos')
      .insert({
        id_cliente: idCliente,
        cliente_nombre: payload.cliente,
        origen: payload.origen,
        tipo_servicio: payload.servicio,
        zona_geografica: zona,
        direccion: payload.direccion || null,
        cobertura_zona: status.factibilidad,
        monto_total: payload.total,
        pago_status: status.pagoStatus,
        error_pago: status.error_pago,
        motivo_factibilidad: status.motivoFeat,
        estado: status.aprobado ? 'Pendiente' : 'Rechazado',
      })
      .select('*').single()
    if (pErr) throw pErr

    if (payload.lineas && payload.lineas.length) {
      const rows = payload.lineas
        .filter((l) => l.id_equipo && l.cantidad > 0)
        .map((l) => ({ id_pedido: pedido.id_pedido, id_equipo: l.id_equipo, cantidad_solicitada: l.cantidad }))
      if (rows.length) {
        const { error: dErr } = await supabase.from('detalle_pedido').insert(rows)
        if (dErr) throw dErr
      }
    }

    const { data: fresh } = await supabase
      .from('pedidos').select('*').eq('id_pedido', pedido.id_pedido).single()
    return mapPedido(fresh ?? pedido)
  } catch (e) {
    console.warn('crearPedido fallback a demo:', e?.message || e)
    return crearPedidoDemo(payload)
  }
}

export function crearPedidoDemo(payload) {
  const status = computeOrderStatus(payload)
  const orderId = `SIT-${Math.floor(1000 + Math.random() * 9000)}`
  const zona = [payload.ciudad, payload.municipio, payload.estado].filter(Boolean).join(', ')
  const newOrder = {
    id: orderId,
    cliente: payload.cliente,
    origen: payload.origen,
    servicio: payload.servicio,
    factibilidad: status.factibilidad ? 'Aprobada' : 'Rechazada',
    pagoStatus: status.pagoStatus,
    flag_aprobado: status.aprobado,
    total: Number(payload.total),
    fecha: new Date().toISOString().split('T')[0],
    error_pago: status.error_pago,
    motivoFeat: status.motivoFeat,
    zona,
  }
  return newOrder
}

// =============================================================================
// OPERACIONES Y LOGÍSTICA
// =============================================================================

const mapInventario = (r) => ({
  id: r.codigo_equipo || `INV-${r.id_equipo}`,
  dbId: r.id_equipo,
  name: r.descripcion_equipo,
  stock: r.stock_disponible,
  minThreshold: r.umbral_minimo,
  autoReorder: r.auto_reorden,
  lastReorderDate: null,
  reorderStatus: r.solicitud_proveedor === 'PENDIENTE' ? 'Pendiente'
    : r.solicitud_proveedor ? 'Despachado' : 'Ninguno',
})

export async function fetchInventario() {
  return withFallback(async () => {
    const { data, error } = await supabase.from('inventario').select('*').order('id_equipo')
    if (error) throw error
    return (data || []).map(mapInventario)
  }, () => [...demoInventario])
}

export async function reordenarEquipo(dbId) {
  if (!supabase) {
    return { stock: 20, reorderStatus: 'Completado', lastReorderDate: new Date().toISOString().split('T')[0] }
  }
  try {
    const { data: row } = await supabase.from('inventario').select('stock_disponible').eq('id_equipo', dbId).single()
    const newStock = (row?.stock_disponible || 0) + 20
    const { data: updated, error } = await supabase
      .from('inventario')
      .update({ stock_disponible: newStock, solicitud_proveedor: 'DESPACHADO' })
      .eq('id_equipo', dbId)
      .select('*').single()
    if (error) throw error
    return {
      stock: updated.stock_disponible,
      reorderStatus: 'Completado',
      lastReorderDate: new Date().toISOString().split('T')[0],
    }
  } catch (e) {
    console.warn('reordenarEquipo fallback:', e?.message || e)
    return { stock: 20, reorderStatus: 'Completado', lastReorderDate: new Date().toISOString().split('T')[0] }
  }
}

const mapTecnico = (r) => ({
  id: `TECH-${String(r.id_tecnico).padStart(2, '0')}`,
  dbId: r.id_tecnico,
  name: r.nombre_tecnico,
  zone: r.zona_geografica,
  workload: r.carga_trabajo,
  status: r.disponibilidad ? 'Activo' : 'Inactivo',
})

export async function fetchTecnicos() {
  return withFallback(async () => {
    const { data, error } = await supabase.from('tecnicos').select('*').order('id_tecnico')
    if (error) throw error
    return (data || []).map(mapTecnico)
  }, () => [...demoTecnicos])
}

export async function fetchTareas() {
  return withFallback(async () => {
    const { data, error } = await supabase
      .from('tareas').select('*').eq('estado', 'Pendiente').order('id_tarea')
    if (error) throw error
    return (data || []).map((r) => ({
      id: `TSK-${r.id_tarea}`,
      dbId: r.id_tarea,
      client: r.cliente_nombre,
      zone: r.zona_geografica,
      service: r.servicio,
    }))
  }, () => [...demoPendingTasks])
}

export async function fetchAsignaciones() {
  return withFallback(async () => {
    const { data, error } = await supabase
      .from('tareas')
      .select('*, tecnicos(nombre_tecnico)')
      .eq('estado', 'Asignado')
      .order('fecha_asignacion', { ascending: false })
    if (error) throw error
    return (data || []).map((r) => ({
      id: `ASG-${r.id_tarea}`,
      task: r.servicio,
      client: r.cliente_nombre,
      zone: r.zona_geografica,
      tech: r.tecnicos?.nombre_tecnico || '',
      status: 'En camino',
    }))
  }, () => [...demoAssignments])
}

export async function asignarTecnico(task) {
  if (!supabase) return asignarTecnicoDemo(task)
  try {
    const { data: tecnicos } = await supabase.from('tecnicos').select('*')
    const candidates = (tecnicos || []).filter(
      (t) => t.zona_geografica === task.zone && t.disponibilidad
    )
    if (candidates.length === 0) {
      return { error: `No hay técnicos activos en la Zona ${task.zone} en este momento.` }
    }
    const selected = candidates.reduce((min, t) =>
      t.carga_trabajo < min.carga_trabajo ? t : min, candidates[0])

    await supabase
      .from('tecnicos')
      .update({ carga_trabajo: selected.carga_trabajo + 1 })
      .eq('id_tecnico', selected.id_tecnico)

    const { data: updated, error } = await supabase
      .from('tareas')
      .update({
        estado: 'Asignado',
        id_tecnico: selected.id_tecnico,
        fecha_asignacion: new Date().toISOString(),
      })
      .eq('id_tarea', task.dbId)
      .select('*').single()
    if (error) throw error

    // Genera la orden de instalación para el portal técnico
    const { error: iErr } = await supabase
      .from('instalaciones')
      .insert({
        id_pedido: updated.id_pedido || null,
        id_tecnico: selected.id_tecnico,
        fecha_programada: new Date().toISOString().split('T')[0],
        estado: 'Programada',
        materiales: updated.servicio,
      })
    if (iErr) throw iErr

    return {
      id: `ASG-${updated.id_tarea}`,
      task: updated.servicio,
      client: updated.cliente_nombre,
      zone: updated.zona_geografica,
      tech: selected.nombre_tecnico,
      status: 'En camino',
      message: `Algoritmo ejecutado: ${task.id} asignado a ${selected.nombre_tecnico} (Zona ${task.zone}) debido a menor carga de trabajo activa.`,
    }
  } catch (e) {
    console.warn('asignarTecnico fallback a demo:', e?.message || e)
    return asignarTecnicoDemo(task)
  }
}

export function asignarTecnicoDemo(task) {
  const candidates = demoTecnicos.filter((t) => t.zone === task.zone && t.status === 'Activo')
  if (candidates.length === 0) {
    return { error: `No hay técnicos activos en la Zona ${task.zone} en este momento.` }
  }
  const selected = candidates.reduce((min, t) => (t.workload < min.workload ? t : min), candidates[0])
  return {
    id: `ASG-${Math.floor(800 + Math.random() * 100)}`,
    task: task.service,
    client: task.client,
    zone: task.zone,
    tech: selected.name,
    status: 'En camino',
    message: `Algoritmo ejecutado: ${task.id} asignado a ${selected.name} (Zona ${task.zone}) debido a menor carga de trabajo activa (Trabajos anteriores: ${selected.workload}).`,
  }
}

// =============================================================================
// INSTALACIÓN
// =============================================================================

export async function fetchInstalaciones() {
  return withFallback(async () => {
    const { data, error } = await supabase
      .from('instalaciones')
      .select('*, pedidos(*, clientes(direccion, telefono))')
      .order('fecha_programada')
    if (error) throw error
    return (data || []).map((r) => ({
      id: r.id_instalacion,
      taskId: r.id_pedido ? `TSK-${r.id_pedido}` : '',
      client: r.pedidos?.cliente_nombre || '',
      address: r.pedidos?.clientes?.direccion || r.pedidos?.direccion || '',
      zone: r.pedidos?.zona_geografica || '',
      service: r.pedidos?.tipo_servicio || '',
      components: r.materiales || '',
      estado: r.estado,
      tecnico: r.id_tecnico,
    }))
  }, () => [...demoInstalaciones])
}

export async function guardarInstalacion(instalacion) {
  if (!supabase) {
    return {
      task: { client: instalacion.client, service: instalacion.service },
      notes: instalacion.notes,
      status: instalacion.status,
      signature: instalacion.signature,
      timestamp: new Date().toLocaleString(),
    }
  }
  try {
    const { data, error } = await supabase
      .from('instalaciones')
      .update({
        estado: instalacion.status === 'Completo' ? 'Completada' : instalacion.status,
        reporte_firmado: instalacion.status === 'Completo',
        firma_digital: instalacion.signature,
        notas: instalacion.notes,
        fecha_ejecucion: new Date().toISOString(),
      })
      .eq('id_instalacion', instalacion.id)
      .select('*').single()
    if (error) throw error
    return {
      task: { client: instalacion.client, service: instalacion.service },
      notes: instalacion.notes,
      status: instalacion.status,
      signature: instalacion.signature,
      timestamp: new Date().toLocaleString(),
      serverId: data?.id_instalacion,
    }
  } catch (e) {
    console.warn('guardarInstalacion fallback a demo:', e?.message || e)
    return {
      task: { client: instalacion.client, service: instalacion.service },
      notes: instalacion.notes,
      status: instalacion.status,
      signature: instalacion.signature,
      timestamp: new Date().toLocaleString(),
    }
  }
}

// =============================================================================
// FINANZAS
// =============================================================================

export async function fetchFacturas() {
  return withFallback(async () => {
    const { data, error } = await supabase
      .from('facturas')
      .select('*, clientes(nombre_cliente)')
      .order('fecha_emision', { ascending: false })
    if (error) throw error
    return (data || []).map((r) => ({
      id: `FAC-${r.id_factura}`,
      dbId: r.id_factura,
      orderId: `SIT-${r.id_pedido}`,
      cliente: r.clientes?.nombre_cliente || r.id_pedido,
      total: Number(r.monto_total),
      rif: r.rif || '',
      fecha: r.fecha_emision,
      estado_pago: r.estado_pago,
      items: (r.items || []).map((i) => i.desc),
    }))
  }, () => [...demoFacturas])
}

export async function fetchFacturables() {
  return withFallback(async () => {
    const { data, error } = await supabase.from('v_facturables').select('*')
    if (error) throw error
    return (data || []).map((r) => ({
      id_pedido: r.id_pedido,
      cliente: r.cliente_nombre,
      servicio: r.tipo_servicio,
      total: Number(r.monto_total),
      rif: r.datos_fiscales || '',
    }))
  }, () => [
    { id_pedido: 7838, cliente: 'Estación YPF', servicio: 'Cámaras IP Corporativas', total: 9000, rif: 'J-30301255-2' },
  ])
}

export async function generarFactura(pedido) {
  if (!supabase) {
    return {
      id: `FAC-${Math.floor(2100 + Math.random() * 50)}`,
      orderId: `SIT-${pedido.id_pedido}`,
      cliente: pedido.cliente,
      total: Number(pedido.total),
      rif: pedido.rif || '',
      fecha: new Date().toISOString().split('T')[0],
      items: [pedido.servicio, 'Servicios complementarios'],
    }
  }
  try {
    const { data, error } = await supabase
      .from('facturas')
      .insert({
        id_pedido: pedido.id_pedido,
        fecha_emision: new Date().toISOString().split('T')[0],
        monto_total: Number(pedido.total),
        rif: pedido.rif || null,
        estado_pago: 'Pendiente',
        items: [{ desc: pedido.servicio }, { desc: 'Servicios complementarios' }],
      })
      .select('*').single()
    if (error) throw error
    return {
      id: `FAC-${data.id_factura}`,
      orderId: `SIT-${data.id_pedido}`,
      cliente: pedido.cliente,
      total: Number(data.monto_total),
      rif: data.rif || '',
      fecha: data.fecha_emision,
      items: (data.items || []).map((i) => i.desc),
    }
  } catch (e) {
    console.warn('generarFactura fallback a demo:', e?.message || e)
    return {
      id: `FAC-${Math.floor(2100 + Math.random() * 50)}`,
      orderId: `SIT-${pedido.id_pedido}`,
      cliente: pedido.cliente,
      total: Number(pedido.total),
      rif: pedido.rif || '',
      fecha: new Date().toISOString().split('T')[0],
      items: [pedido.servicio, 'Servicios complementarios'],
    }
  }
}

export async function fetchLogs() {
  return withFallback(async () => {
    const { data, error } = await supabase
      .from('logs_financieros').select('*').order('fecha', { ascending: false })
    if (error) throw error
    return (data || []).map((r) => ({
      id: `LOG-${r.id_log}`,
      tipo: r.tipo,
      descripcion: r.descripcion,
      monto: Number(r.monto),
      fecha: new Date(r.fecha).toLocaleString('es-VE'),
      status: r.status,
    }))
  }, () => [...demoLogs])
}

export async function registrarLog({ tipo, descripcion, monto = 0, status = 'Verificado' }) {
  if (!supabase) {
    return {
      id: `LOG-${Math.floor(4505 + Math.random() * 50)}`,
      tipo, descripcion, monto, status,
      fecha: new Date().toLocaleString('es-VE'),
    }
  }
  const { data, error } = await supabase
    .from('logs_financieros')
    .insert({ tipo, descripcion, monto, status })
    .select('*').single()
  if (error) throw error
  return {
    id: `LOG-${data.id_log}`,
    tipo: data.tipo,
    descripcion: data.descripcion,
    monto: Number(data.monto),
    fecha: new Date(data.fecha).toLocaleString('es-VE'),
    status: data.status,
  }
}

// =============================================================================
// POSTVENTA Y CALIDAD
// =============================================================================

export async function fetchIncidencias() {
  return withFallback(async () => {
    const { data, error } = await supabase
      .from('incidencias').select('*').order('fecha', { ascending: false })
    if (error) throw error
    return (data || []).map((r) => ({
      id: `INC-${r.id_incidencia}`,
      dbId: r.id_incidencia,
      client: r.cliente_nombre,
      type: r.tipo,
      date: timeAgo(r.fecha),
      status: r.estado,
      resolution: r.resolucion || 'Pendiente de resolución',
      descripcion: r.descripcion || '',
    }))
  }, () => [...demoIncidencias])
}

// Crea una nueva incidencia postventa.
export async function crearIncidencia({ client, tipo, descripcion }) {
  const payload = {
    cliente_nombre: client,
    tipo,
    descripcion,
    estado: 'Abierto',
  }
  if (!supabase) {
    return {
      id: `INC-${Math.floor(8805 + Math.random() * 50)}`,
      dbId: null,
      client,
      type: tipo,
      descripcion,
      date: 'Ahora',
      status: 'Abierto',
      resolution: 'Pendiente de resolución',
    }
  }
  const { data, error } = await supabase.from('incidencias').insert(payload).select('*').single()
  if (error) throw error
  return {
    id: `INC-${data.id_incidencia}`,
    dbId: data.id_incidencia,
    client: data.cliente_nombre,
    type: data.tipo,
    descripcion: data.descripcion || '',
    date: timeAgo(data.fecha),
    status: data.estado,
    resolution: data.resolucion || 'Pendiente de resolución',
  }
}

// Actualiza el estado y/o la resolución de una incidencia (Resolver/Cerrar).
export async function actualizarIncidencia(id, { estado, resolucion }) {
  const patch = { estado }
  if (resolucion != null) patch.resolucion = resolucion
  if (!supabase) {
    const target = demoIncidencias.find((i) => i.id === id)
    if (target) {
      target.status = estado
      if (resolucion != null) target.resolution = resolucion
    }
    return { id, status: estado, resolution: resolucion }
  }
  const { data, error } = await supabase
    .from('incidencias').update(patch).eq('id_incidencia', id).select('*').single()
  if (error) throw error
  return {
    id: `INC-${data.id_incidencia}`,
    status: data.estado,
    resolution: data.resolucion || '',
  }
}

export async function fetchEncuestas() {
  return withFallback(async () => {
    const { data, error } = await supabase
      .from('encuestas').select('*').order('fecha_contacto', { ascending: false })
    if (error) throw error
    return (data || []).map((r) => ({
      id: r.id_encuesta,
      client: r.cliente_nombre,
      rating: r.nivel_satisfaccion,
      type: r.tipo_cliente,
      comment: r.comentarios || '',
    }))
  }, () => [...demoEncuestas])
}

export async function registrarEncuesta({ cliente, rating, comentario }) {
  const type = getTipoCliente(rating)
  if (!supabase) {
    return { id: Date.now(), client: cliente, rating, type, comment: comentario }
  }
  const { data, error } = await supabase
    .from('encuestas')
    .insert({
      cliente_nombre: cliente,
      nivel_satisfaccion: rating,
      tipo_cliente: type,
      comentarios: comentario,
    })
    .select('*').single()
  if (error) throw error
  return {
    id: data.id_encuesta,
    client: data.cliente_nombre,
    rating: data.nivel_satisfaccion,
    type: data.tipo_cliente,
    comment: data.comentarios || '',
  }
}

// =============================================================================
// USUARIOS Y PERFILES (roles)
// =============================================================================

const demoProfiles = [
  { id: 'u-admin', email: 'admin@tecnoinnova.com', nombre: 'Administrador', rol: 'admin', activo: true },
  { id: 'u-basic', email: 'operador@tecnoinnova.com', nombre: 'Operador Site A', rol: 'basico', activo: true },
]

export async function fetchProfiles() {
  return withFallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at')
    if (error) throw error
    return data || []
  }, () => demoProfiles.map((p) => ({ ...p })))
}

export async function updateProfileRole(id, rol) {
  return withFallback(async () => {
    const { data, error } = await supabase
      .from('profiles').update({ rol, updated_at: new Date().toISOString() })
      .eq('id', id).select('*').single()
    if (error) throw error
    return data
  }, () => {
    const p = demoProfiles.find((x) => x.id === id)
    if (p) p.rol = rol
    return p || {}
  })
}

// =============================================================================
// DASHBOARD - distribución de pedidos por estado (gráfico donut)
// =============================================================================

const demoEstados = [
  { estado: 'Instalado', value: 2 },
  { estado: 'Pendiente', value: 1 },
  { estado: 'Rechazado', value: 1 },
]

export async function fetchEstadosPedidos() {
  return withFallback(async () => {
    const { data, error } = await supabase.from('pedidos').select('estado')
    if (error) throw error
    const counts = {}
    ;(data || []).forEach((r) => { counts[r.estado] = (counts[r.estado] || 0) + 1 })
    return Object.entries(counts).map(([estado, value]) => ({ estado, value }))
  }, () => [...demoEstados])
}

// =============================================================================
// DASHBOARD
// =============================================================================

export async function fetchKpis() {
  return withFallback(async () => {
    const { data, error } = await supabase.from('v_dashboard_kpis').select('*').single()
    if (error) throw error
    return {
      pedidosTotales: data.pedidos_totales,
      incidenciasAbiertas: data.incidencias_abiertas,
      tecnicosActivos: data.tecnicos_activos,
      tecnicosTotales: data.tecnicos_totales,
      nps: Number(data.nps),
    }
  }, () => ({ ...demoKpis }))
}

export async function fetchAlertas() {
  return withFallback(async () => {
    const { data, error } = await supabase.from('v_alertas').select('*')
    if (error) throw error
    return (data || []).map((r) => ({
      id: r.id,
      type: r.tipo,
      title: r.titulo,
      description: r.descripcion,
      time: timeAgo(r.fecha),
      fecha: r.fecha,
      details: r.detalles,
    }))
  }, () => [...demoAlertas])
}

export async function fetchMetricasSemanales() {
  return withFallback(async () => {
    const { data, error } = await supabase.from('v_metricas_semanales').select('*')
    if (error) throw error
    const rows = data || []
    return {
      op: rows.map((r, i) => ({
        label: DIAS[new Date(r.dia).getDay()] || `D${i + 1}`,
        value: r.servicios,
      })),
      ing: rows.map((r, i) => ({
        label: DIAS[new Date(r.dia).getDay()] || `D${i + 1}`,
        value: Number(r.ventas),
      })),
    }
  }, () => {
    return {
      op: demoSemana.map((r, i) => ({ label: DIAS[i], value: r.servicios })),
      ing: demoSemana.map((r, i) => ({ label: DIAS[i], value: r.ventas })),
    }
  })
}

// Etiqueta corta para un día en rangos mayores a la semana (p. ej. "12/03").
function diaLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Métricas por rango de fechas (servicios y ventas agrupadas por día).
// Reutiliza la misma lógica de v_metricas_semanales pero para cualquier rango.
export async function fetchMetricasRango({ desde, hasta }) {
  return withFallback(async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select('fecha_pedido, monto_total, flag_aprobado')
      .gte('fecha_pedido', desde)
      .lte('fecha_pedido', hasta)
    if (error) throw error
    const byDay = {}
    for (const r of data || []) {
      const dia = String(r.fecha_pedido || '').slice(0, 10)
      if (!dia) continue
      if (!byDay[dia]) byDay[dia] = { servicios: 0, ventas: 0 }
      byDay[dia].servicios += 1
      if (r.flag_aprobado) byDay[dia].ventas += Number(r.monto_total || 0)
    }
    const dias = Object.keys(byDay).sort()
    return {
      op: dias.map((d) => ({ label: diaLabel(d), value: byDay[d].servicios })),
      ing: dias.map((d) => ({ label: diaLabel(d), value: byDay[d].ventas })),
    }
  }, () => ({
    op: demoSemana.map((r, i) => ({ label: DIAS[i], value: r.servicios })),
    ing: demoSemana.map((r, i) => ({ label: DIAS[i], value: r.ventas })),
  }))
}

// Reporte semanal por rango de fechas (agrupado por día).
export async function fetchReporteSemanal({ desde, hasta }) {
  return withFallback(async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select('fecha_pedido, monto_total, flag_aprobado')
      .gte('fecha_pedido', desde)
      .lte('fecha_pedido', hasta)
    if (error) throw error
    return agregarPorFecha((data || []), desde, hasta)
  }, () => {
    const rows = demoPedidos.filter((p) => {
      const d = String(p.fecha).slice(0, 10)
      return d >= desde && d <= hasta
    })
    return agregarPorFecha(rows.map((p) => ({ fecha_pedido: p.fecha, monto_total: p.total, flag_aprobado: p.flag_aprobado })), desde, hasta)
  })
}

// Agrupa pedidos por día y arma la serie (días vacíos → 0) para el rango.
function agregarPorFecha(filas, desde, hasta) {
  const counts = {}
  const sums = {}
  ;(filas || []).forEach((r) => {
    const d = String(r.fecha_pedido).slice(0, 10)
    counts[d] = (counts[d] || 0) + 1
    if (r.flag_aprobado) sums[d] = (sums[d] || 0) + Number(r.monto_total || 0)
  })
  const out = []
  const cur = new Date(`${desde}T00:00:00`)
  const end = new Date(`${hasta}T00:00:00`)
  for (; cur <= end; cur.setDate(cur.getDate() + 1)) {
    const localKey = [cur.getFullYear(), String(cur.getMonth() + 1).padStart(2, '0'), String(cur.getDate()).padStart(2, '0')].join('-')
    out.push({
      dia: cur.toLocaleDateString('es-VE'),
      servicios: counts[localKey] || 0,
      monto: sums[localKey] || 0,
    })
  }
  return out
}

// =============================================================================
// BÚSQUEDA GLOBAL (barra superior): pedidos, clientes, inventario, técnicos y facturas
// =============================================================================

export async function buscarGlobal(term) {
  const t = String(term || '').trim().toLowerCase()
  if (t.length < 2) return []
  try {
    const [pedidos, inventario, tecnicos, facturas] = await Promise.all([
      fetchPedidos(), fetchInventario(), fetchTecnicos(), fetchFacturas(),
    ])
    const match = (v) => String(v || '').toLowerCase().includes(t)
    const out = []

    pedidos.forEach((p) => {
      if (match(p.cliente) || match(p.servicio) || match(p.id) || match(p.zona)) {
        out.push({ tipo: 'Pedido', titulo: p.cliente, sub: `${p.id} · ${p.servicio}`, href: '/pedidos' })
      }
    })
    inventario.forEach((i) => {
      if (match(i.name) || match(i.id)) out.push({ tipo: 'Inventario', titulo: i.name, sub: `${i.id} · Stock: ${i.stock}`, href: '/operaciones' })
    })
    tecnicos.forEach((tec) => {
      if (match(tec.name) || match(tec.zone)) out.push({ tipo: 'Técnico', titulo: tec.name, sub: `${tec.id} · ${tec.zone}`, href: '/operaciones' })
    })
    facturas.forEach((f) => {
      if (match(f.cliente) || match(f.id)) out.push({ tipo: 'Factura', titulo: f.cliente, sub: `${f.id} · ${formatMoney(f.total)}`, href: '/finanzas' })
    })

    out.sort((a, b) => a.tipo.localeCompare(b.tipo))
    return out.slice(0, 30)
  } catch (e) {
    console.warn('buscarGlobal error:', e?.message || e)
    return []
  }
}

export { DEMO_MODE }
