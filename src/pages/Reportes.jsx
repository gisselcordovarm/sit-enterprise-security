import { useEffect, useState } from 'react'
import DataStatus from '../components/common/DataStatus'
import {
  fetchMetricasSemanales,
  fetchInventario,
  fetchTecnicos,
  fetchFacturas,
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

const hoyMenos = (dias) => new Date(Date.now() - dias * 86400000).toLocaleDateString('es-VE')

export default function Reportes() {
  const [loading, setLoading] = useState(true)
  const [liveError, setLiveError] = useState(null)

  const [inventario, setInventario] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [facturas, setFacturas] = useState([])
  const [semanal, setSemanal] = useState([])
  const [sqlAbierta, setSqlAbierta] = useState('')
  const [nota, setNota] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      fetchInventario(),
      fetchTecnicos(),
      fetchFacturas(),
      fetchMetricasSemanales(),
    ])
      .then(([inv, tec, fac, met]) => {
        if (!active) return
        const op = met.op || []
        const ing = met.ing || []
        setInventario(inv)
        setTecnicos(tec)
        setFacturas(fac)
        setSemanal(op.map((o, i) => ({
          dia: o.label,
          servicios: o.value,
          monto: ing[i]?.value || 0,
        })))
        setLiveError(null)
      })
      .catch(() => { if (active) setLiveError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const exportInventario = () => {
    exportarXLSX('Listado_inventario', ['Código', 'Componente', 'Stock', 'Mínimo', 'Auto-reorder', 'Reposición'], 
      inventario.map((i) => [i.id, i.name, i.stock, i.minThreshold, i.autoReorder ? 'Sí' : 'No', i.reorderStatus]))
    setNota('Listado de inventario exportado a Excel (.XLS).')
  }

  const exportTecnicos = () => {
    exportarCSV('Listado_tecnicos_disponibles', ['ID', 'Nombre', 'Zona/Estado', 'Carga de trabajo', 'Disponibilidad'],
      tecnicos.map((t) => [t.id, t.name, t.zone, t.workload, t.status === 'Activo' ? 'Disponible' : t.status]))
    setNota('Listado de técnicos disponibles exportado a .CSV.')
  }

  const exportSemanal = () => {
    generarPdfReporteSemanal({
      filas: semanal,
      desde: hoyMenos(6),
      hasta: hoyMenos(0),
    })
    setNota('Reporte semanal de pedidos generado en .PDF.')
  }

  const exportFacturaPdf = (inv) => {
    generarPdfFactura(inv)
    setNota('Factura impresa en .PDF.')
  }

  const exportMemoriaSql = () => {
    generarPdfConsultaSQL([...CONSULTAS_REPORTES, CONSULTA_METRICAS_SEMANALES])
    setNota('PDF de memoria con las consultas SQL generado.')
  }

  const abreSql = (id) => setSqlAbierta((v) => (v === id ? '' : id))

  return (
    <div>
      <div style={{ marginBottom: 'var(--stack-lg)' }}>
        <h1 className="display-lg text-on-surface">Reportes del Sistema</h1>
        <p className="body-md text-on-surface-variant">Consultas SQL en pantalla y generación de reportes en PDF, Excel y CSV.</p>
      </div>

      <DataStatus loading={loading} liveError={liveError} />

      {nota && (
        <div className="m3-banner" style={{ background: 'rgba(62, 241, 181, 0.12)', borderColor: 'rgba(62, 241, 181, 0.3)' }}>
          <span className="label-caps text-success">{nota}</span>
        </div>
      )}

      {/* Reporte semanal */}
      <section className="card glass-panel" style={{ background: 'rgba(23, 31, 51, 0.55)', marginBottom: 'var(--stack-lg)' }}>
        <div className="card-header-border" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="headline-md text-on-surface">1 · Reporte semanal de pedidos (.PDF)</h2>
            <span className="body-sm text-on-surface-variant">{CONSULTAS_REPORTES[0].descripcion}</span>
          </div>
          <button className="btn btn-primary" onClick={exportSemanal}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>picture_as_pdf</span>
            Generar PDF
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
        <div className="card glass-panel" style={{ background: 'rgba(23, 31, 51, 0.55)' }}>
          <div className="card-header-border">
            <div>
              <h2 className="headline-md text-on-surface">Listado de Inventario (.XLS)</h2>
              <span className="body-sm text-on-surface-variant">{inventario.length} componente(s) en existencias</span>
            </div>
            <button className="btn btn-secondary" onClick={exportInventario}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>grid_on</span>
              Exportar Excel
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
              </tbody>
            </table>
          </div>
        </div>

        {/* Técnicos */}
        <div className="card glass-panel" style={{ background: 'rgba(23, 31, 51, 0.55)' }}>
          <div className="card-header-border">
            <div>
              <h2 className="headline-md text-on-surface">Listado de Técnicos (.CSV)</h2>
              <span className="body-sm text-on-surface-variant">{tecnicos.length} técnico(s) enlistados</span>
            </div>
            <button className="btn btn-secondary" onClick={exportTecnicos}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>table_rows</span>
              Exportar CSV
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
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Facturas */}
      <section className="card glass-panel" style={{ background: 'rgba(23, 31, 51, 0.55)', marginTop: 'var(--stack-lg)' }}>
        <div className="card-header-border">
          <div>
            <h2 className="headline-md text-on-surface">Impresión de Facturas (.PDF)</h2>
            <span className="body-sm text-on-surface-variant">Documentos emitidos listos para impresión</span>
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
      <section className="card glass-panel" style={{ background: 'rgba(23, 31, 51, 0.55)', marginTop: 'var(--stack-lg)' }}>
        <div className="card-header-border" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="headline-md text-on-surface">Consultas SQL usadas en los reportes</h2>
            <span className="body-sm text-on-surface-variant">Mostradas en pantalla e incluidas en el PDF de memoria.</span>
          </div>
          <button className="btn btn-primary" onClick={exportMemoriaSql}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
            Descargar PDF con SQL
          </button>
        </div>
        {[...CONSULTAS_REPORTES, CONSULTA_METRICAS_SEMANALES].map((q) => (
          <div key={q.modulo} style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', marginBottom: '10px', overflow: 'hidden' }}>
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