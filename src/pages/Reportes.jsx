import { useEffect, useState } from 'react'
import DataStatus from '../components/common/DataStatus'
import {
  fetchInventario,
  fetchTecnicos,
  fetchFacturas,
  fetchReporteSemanal,
} from '../lib/data'
import {
  exportarCSV,
  exportarXLSX,
  generarPdfReporteSemanal,
  generarPdfFactura,
  generarPdfConsultaSQL,
} from '../lib/reportes'
import { CONSULTAS_REPORTES, CONSULTA_METRICAS_SEMANALES } from '../lib/reportQueries'
import { formatMoney } from '../lib/format'

const toIso = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
const hoyMenos = (dias) => {
  const d = new Date(Date.now() - dias * 86400000)
  return toIso(d)
}

export default function Reportes() {
  const [loading, setLoading] = useState(true)
  const [liveError, setLiveError] = useState(null)
  const [consultando, setConsultando] = useState(false)

  const [inventario, setInventario] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [facturas, setFacturas] = useState([])
  const [semanal, setSemanal] = useState([])
  const [desde, setDesde] = useState(() => hoyMenos(6))
  const [hasta, setHasta] = useState(() => hoyMenos(0))
  const [sqlAbierta, setSqlAbierta] = useState('')
  const [nota, setNota] = useState('')
  const [exportando, setExportando] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      fetchInventario(),
      fetchTecnicos(),
      fetchFacturas(),
      fetchReporteSemanal({ desde: hoyMenos(6), hasta: hoyMenos(0) }),
    ])
      .then(([inv, tec, fac, sem]) => {
        if (!active) return
        setInventario(inv)
        setTecnicos(tec)
        setFacturas(fac)
        setSemanal(sem)
        setLiveError(null)
      })
      .catch(() => { if (active) setLiveError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const consultarSemanal = async () => {
    if (!desde || !hasta || hasta < desde) {
      setNota('Verifique el rango de fechas (la fecha final debe ser mayor o igual a la inicial).')
      return
    }
    setConsultando(true)
    try {
      const data = await fetchReporteSemanal({ desde, hasta })
      setSemanal(data)
      setNota(`Reporte semanal consultado: ${new Date(`${desde}T00:00`).toLocaleDateString('es-VE')} → ${new Date(`${hasta}T00:00`).toLocaleDateString('es-VE')}.`)
    } catch {
      setNota('No se pudo consultar el rango.')
    } finally {
      setConsultando(false)
    }
  }

  const exportRango = async () => {
    if (exportando) return
    if (!desde || !hasta || hasta < desde) {
      setNota('Verifique el rango de fechas antes de generar el PDF.')
      return
    }
    setExportando('rango')
    try {
      const data = await fetchReporteSemanal({ desde, hasta })
      if (data.length === 0) {
        setNota('Sin pedidos registrados en el rango seleccionado.')
        return
      }
      setSemanal(data)
      generarPdfReporteSemanal({ filas: data, desde, hasta })
      setNota('Reporte semanal de pedidos generado en .PDF.')
    } catch {
      setNota('No se pudo generar el PDF del reporte semanal.')
    } finally {
      setExportando('')
    }
  }

  const wrapExport = (key, fn, okMsg) => async (...args) => {
    if (exportando) return
    setExportando(key)
    try {
      fn(...args)
      setNota(okMsg)
    } catch (err) {
      console.error(err)
      setNota('No se pudo generar el archivo. Verifica la conexión.')
    } finally {
      setExportando('')
    }
  }

  const exportInventario = wrapExport('inventario', () => {
    exportarXLSX('Listado_inventario', ['Código', 'Componente', 'Stock', 'Mínimo', 'Auto-reorder', 'Reposición'],
      inventario.map((i) => [i.id, i.name, i.stock, i.minThreshold, i.autoReorder ? 'Sí' : 'No', i.reorderStatus]),
      { colWidths: [12, 30, 10, 10, 14, 14], moneda: [] })
  }, 'Listado de inventario exportado a Excel (.XLS).')

  const exportTecnicos = wrapExport('tecnicos', () => {
    exportarCSV('Listado_tecnicos_disponibles', ['ID', 'Nombre', 'Zona/Estado', 'Carga de trabajo', 'Disponibilidad'],
      tecnicos.map((t) => [t.id, t.name, t.zone, t.workload, t.status === 'Activo' ? 'Disponible' : t.status]))
  }, 'Listado de técnicos disponibles exportado a .CSV.')

  const exportFacturaPdf = wrapExport('pdf',
    (inv) => generarPdfFactura(inv),
    'Factura impresa en .PDF.')

  const exportMemoriaSql = wrapExport('memoria', () => {
    generarPdfConsultaSQL([...CONSULTAS_REPORTES, CONSULTA_METRICAS_SEMANALES])
  }, 'PDF de memoria con las consultas SQL generado.')

  const abreSql = (id) => setSqlAbierta((v) => (v === id ? '' : id))

  return (
    <div>
      <div style={{ marginBottom: 'var(--stack-lg)' }}>
        <h1 className="display-lg text-on-surface">Reportes del Sistema</h1>
      </div>

      <DataStatus loading={loading} liveError={liveError} />

      {nota && (
        <div className="m3-banner" style={{ background: 'var(--tint-success)', borderColor: 'rgba(14, 159, 110, 0.3)' }}>
          <span className="label-caps text-success">{nota}</span>
        </div>
      )}

      {/* Reporte semanal */}
      <section className="card glass-panel" style={{ background: 'var(--glass-bg)', marginBottom: 'var(--stack-lg)' }}>
        <div className="card-header-border" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="headline-md text-on-surface">1 · Reporte semanal de pedidos (.PDF)</h2>
            <span className="body-sm text-on-surface-variant">{CONSULTAS_REPORTES[0].descripcion}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 'var(--stack-md)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Desde</label>
            <input type="date" className="form-input" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Hasta</label>
            <input type="date" className="form-input" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={consultarSemanal} disabled={consultando}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
            {consultando ? 'Consultando...' : 'Consultar rango'}
          </button>
          <button className="btn btn-primary" onClick={exportRango} disabled={!!exportando}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>picture_as_pdf</span>
            {exportando === 'rango' ? 'Generando...' : 'Generar PDF'}
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Día</th><th>Servicios realizados</th><th>Ventas (USD)</th></tr>
            </thead>
            <tbody>
              {semanal.length > 0 ? semanal.map((s, i) => (
                <tr key={i}>
                  <td><span className="body-sm text-on-surface">{s.dia}</span></td>
                  <td><span className="body-sm text-on-surface">{s.servicios}</span></td>
                  <td><span className="body-sm text-success">{formatMoney(s.monto)}</span></td>
                </tr>
              )) : (
                <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: '18px' }}>Sin datos semanales.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-2">
        {/* Inventario */}
        <div className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
          <div className="card-header-border">
            <div>
              <h2 className="headline-md text-on-surface">Listado de Inventario (.XLS)</h2>
              <span className="body-sm text-on-surface-variant">{inventario.length} componente(s) en existencias</span>
            </div>
            <button className="btn btn-secondary" onClick={exportInventario} disabled={!!exportando}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>grid_on</span>
              {exportando === 'inventario' ? 'Exportando...' : 'Exportar Excel'}
            </button>
          </div>
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Código</th><th>Componente</th><th>Stock</th></tr>
              </thead>
              <tbody>
                {inventario.map((i) => (
                  <tr key={i.id}>
                    <td className="label-caps text-on-surface">{i.id}</td>
                    <td className="body-sm text-on-surface">{i.name}</td>
                    <td className="body-sm text-on-surface">{i.stock}</td>
                  </tr>
                ))}
                {inventario.length === 0 && (
                  <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: '18px' }}>Sin componentes en el inventario.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Técnicos */}
        <div className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
          <div className="card-header-border">
            <div>
              <h2 className="headline-md text-on-surface">Listado de Técnicos (.CSV)</h2>
              <span className="body-sm text-on-surface-variant">{tecnicos.length} técnico(s) enlistados</span>
            </div>
<button className="btn btn-secondary" onClick={exportTecnicos} disabled={!!exportando}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
              {exportando === 'tecnicos' ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>Nombre</th><th>Zona</th><th>Carga</th></tr>
              </thead>
              <tbody>
                {tecnicos.map((t) => (
                  <tr key={t.id}>
                    <td className="label-caps text-on-surface">{t.id}</td>
                    <td className="body-sm text-on-surface">{t.name}</td>
                    <td className="body-sm text-on-surface">{t.zone}</td>
                    <td className="body-sm text-on-surface">{t.workload}</td>
                  </tr>
                ))}
                {tecnicos.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: '18px' }}>Sin técnicos enlistados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Facturas */}
      <section className="card glass-panel" style={{ background: 'var(--glass-bg)', marginTop: 'var(--stack-lg)' }}>
        <div className="card-header-border">
          <div>
            <h2 className="headline-md text-on-surface">Impresión de Facturas (.PDF)</h2>
          </div>
          <span className="badge badge-info">{facturas.length} facturas</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Factura</th><th>Cliente</th><th>Total (USD)</th><th>Acción</th></tr>
            </thead>
            <tbody>
              {facturas.length > 0 ? facturas.map((inv) => (
                <tr key={inv.id}>
                  <td className="label-caps text-on-surface">{inv.id}</td>
                  <td className="body-sm text-on-surface">{inv.cliente}</td>
                  <td className="body-sm text-on-surface">{formatMoney(inv.total)}</td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => exportFacturaPdf(inv)}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>print</span>
                      PDF
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: '18px' }}>
                  Sin facturas emitidas aún.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Consultas SQL */}
      <section className="card glass-panel" style={{ marginTop: 'var(--stack-lg)' }}>
        <div className="card-header-border" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="headline-md text-on-surface">Consultas SQL usadas en los reportes</h2>
          </div>
          <button className="btn btn-primary" onClick={exportMemoriaSql} disabled={!!exportando}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
            {exportando === 'memoria' ? 'Generando...' : 'Descargar PDF con SQL'}
          </button>
        </div>
        {[...CONSULTAS_REPORTES, CONSULTA_METRICAS_SEMANALES].map((q) => (
          <div
            key={q.modulo}
            style={{
              background: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '10px',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => abreSql(q.modulo)}
              className="btn-ghost"
              style={{ width: '100%', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 0, fontSize: '14px' }}
            >
              <span>{q.modulo}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {sqlAbierta === q.modulo ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {sqlAbierta === q.modulo && (
              <pre className="sql-block">{q.sql}</pre>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}