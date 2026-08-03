import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DataStatus from '../components/common/DataStatus';
import { fetchKpis, fetchAlertas, fetchMetricasSemanales, fetchEstadosPedidos, fetchMetricasRango } from '../lib/data';
import { formatMoney } from '../lib/format';

const PERIODS = {
  week: { label: 'Esta Semana' },
  month: { label: 'Este Mes' },
  year: { label: 'Este Año' },
};

const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alertFilter, setAlertFilter] = useState('ALL');

  const [kpis, setKpis] = useState({ pedidosTotales: 0, incidenciasAbiertas: 0, tecnicosActivos: 0, tecnicosTotales: 0, nps: 0 });
  const [alerts, setAlerts] = useState([]);
  const [semana, setSemana] = useState({ op: [], ing: [] });
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveError, setLiveError] = useState(null);

  const [period, setPeriod] = useState('week');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [rangeData, setRangeData] = useState(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const periodRef = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchKpis(), fetchAlertas(), fetchMetricasSemanales(), fetchEstadosPedidos()])
      .then(([kpiData, alertData, weekData, estadoData]) => {
        if (!active) return;
        setKpis(kpiData);
        setAlerts(alertData);
        setSemana(weekData);
        setEstados(estadoData);
        setLiveError(null);
      })
      .catch(() => {
        if (active) setLiveError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  // Cuando el período es mes/año se consulta el rango real sobre pedidos.
  useEffect(() => {
    if (period === 'week') { setRangeData(null); return; }
    let active = true;
    setPeriodLoading(true);
    const now = new Date();
    let desde;
    if (period === 'month') {
      desde = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      desde = new Date(now.getFullYear(), 0, 1);
    }
    fetchMetricasRango({ desde: isoLocal(desde), hasta: isoLocal(now) })
      .then((res) => { if (active) setRangeData(res); })
      .catch(() => { if (active) setRangeData({ op: [], ing: [] }); })
      .finally(() => { if (active) setPeriodLoading(false); });
    return () => { active = false; };
  }, [period]);

  // Cerrar el selector de período con clic fuera y con Escape.
  useEffect(() => {
    if (!periodOpen) return;
    const onDown = (e) => { if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setPeriodOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [periodOpen]);

  // Cerrar el modal de alerta con la tecla Escape y manejar el foco.
  useEffect(() => {
    if (!selectedAlert) return;
    const onKey = (e) => { if (e.key === 'Escape') setSelectedAlert(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedAlert]);

  const filteredAlerts = alertFilter === 'ALL'
    ? alerts
    : alerts.filter((alert) => alert.type === alertFilter.toLowerCase());

  const buildChart = (rows) => {
    if (!rows.length) return [];
    const maxVal = Math.max(...rows.map((r) => r.value), 1);
    return rows.map((r) => ({
      label: r.label,
      value: r.value,
      height: Math.max(20, Math.round((r.value / maxVal) * 230)),
    }));
  };

  // Tendencia real calculada desde los datos de la semana ya cargada:
  // compara el promedio del 1er bloque de días contra el 2do. Sin valores fijos.
  const seriesTrend = (series) => {
    if (!series || series.length < 2) return { label: 'Estable', up: null };
    const mid = Math.floor(series.length / 2);
    const avg = (arr) => arr.reduce((s, r) => s + Number(r.value || 0), 0) / Math.max(arr.length, 1);
    const before = avg(series.slice(0, mid));
    const after = avg(series.slice(mid));
    if (before === 0 && after === 0) return { label: 'Estable', up: null };
    const pct = before === 0 ? 100 : Math.round(((after - before) / before) * 100);
    if (pct === 0) return { label: 'Estable', up: null };
    return { label: `${pct > 0 ? '+' : ''}${pct}%`, up: pct > 0 };
  };

  const activeSeries = period === 'week' ? semana : rangeData || { op: [], ing: [] };
  const chartData = buildChart(activeSeries.op);
  const tendOp = seriesTrend(semana.op);
  const tendIng = seriesTrend(semana.ing);
  const ingresoSemana = semana.ing.reduce((s, r) => s + Number(r.value || 0), 0);

  const kpiCards = [
    { title: 'Pedidos Totales', value: kpis.pedidosTotales.toLocaleString(), trend: tendOp ? tendOp.label : 'Estable', trendUp: tendOp ? tendOp.up : null, blobBg: 'rgba(165, 216, 255, 0.5)' },
    { title: 'Ingresos de la Semana', value: formatMoney(ingresoSemana), trend: tendIng ? tendIng.label : 'Estable', trendUp: tendIng ? tendIng.up : null, blobBg: 'rgba(131, 106, 157, 0.5)' },
    { title: 'Técnicos Activos', value: `${kpis.tecnicosActivos} / ${kpis.tecnicosTotales}`, trend: 'En tiempo real', trendUp: null, blobBg: 'rgba(78, 71, 207, 0.2)', isPrimary: true },
    { title: 'Satisfacción NPS', value: String(kpis.nps), trend: 'Calculado', trendUp: null, blobBg: 'rgba(224, 226, 233, 0.5)' },
  ];

  // Estado de operaciones derivado de datos reales (no hardcodeado).
  const pctFlota = kpis.tecnicosTotales ? Math.round((kpis.tecnicosActivos / kpis.tecnicosTotales) * 100) : 0;
  const totalEstados = estados.reduce((s, e) => s + Number(e.value || 0), 0);
  const pendientesEstados = estados.filter((e) => !['Completado', 'Entregado', 'Cerrado'].includes(e.estado)).reduce((s, e) => s + Number(e.value || 0), 0);
  const pctAlmacen = totalEstados ? Math.round((pendientesEstados / totalEstados) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: 'var(--section-margin)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="display-lg text-on-surface" style={{ marginBottom: '4px' }}>Resumen General</h1>
            <p className="body-sm text-on-surface-variant">Métricas en tiempo real y estado de las operaciones</p>
          </div>
        </div>
      </header>

      <DataStatus loading={loading} liveError={liveError} />

      {/* Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--widget-gap)' }}>
        {/* Main Metrics (Span 2 columns on xl) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--widget-gap)' }}>
          {/* KPI Row */}
          <div className="kpi-grid">
            {kpiCards.map((kpi, idx) => (
              <div
                key={idx}
                className="kpi-card glass-panel"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '1.5rem',
                  padding: 'var(--card-padding)',
                }}
              >
                {/* Decorative blob */}
                <div
                  className="kpi-blob"
                  style={{
                    position: 'absolute',
                    right: '-16px',
                    top: '-16px',
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    background: kpi.blobBg,
                    filter: 'blur(40px)',
                    transition: 'background 0.3s',
                  }}
                />
                <p className="label-caps text-on-surface-variant" style={{ marginBottom: '8px', position: 'relative', zIndex: 10 }}>{kpi.title}</p>
                <h3
                  className="headline-lg"
                  style={{
                    color: kpi.isPrimary ? 'var(--primary)' : 'var(--on-surface)',
                    position: 'relative',
                    zIndex: 10,
                  }}
                >
                  {kpi.value}
                </h3>
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px', position: 'relative', zIndex: 10 }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: '16px',
                    color: kpi.trendUp === true ? 'var(--primary)' : kpi.trendUp === false ? 'var(--error)' : 'var(--on-surface-variant)',
                  }}>
                    {kpi.trendUp === true ? 'trending_up' : kpi.trendUp === false ? 'trending_down' : 'horizontal_rule'}
                  </span>
                  <span className="body-sm" style={{
                    color: kpi.trendUp === true ? 'var(--primary)' : kpi.trendUp === false ? 'var(--error)' : 'var(--on-surface-variant)',
                  }}>
                    {kpi.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* System Activity Graph */}
          <div className="glass-panel" style={{ borderRadius: '1.5rem', padding: 'var(--card-padding)', height: '400px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative', zIndex: 35 }}>
              <h3 className="headline-md text-on-surface">Actividad del Sistema</h3>
              <div
                ref={periodRef}
                className="glass-panel"
                style={{ borderRadius: 'var(--radius-full)', padding: '4px', display: 'flex', alignItems: 'center', gap: '4px', position: 'relative', zIndex: 20 }}
              >
                <button
                  type="button"
                  onClick={() => setPeriodOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={periodOpen}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px 4px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--on-surface-variant)' }}
                >
                  <span className="body-sm text-on-surface-variant">{PERIODS[period].label}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--on-surface-variant)' }}>{periodOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                {periodLoading && (
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--on-surface-variant)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                )}
                {periodOpen && (
                  <div
                    role="menu"
                    style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: '170px', background: 'var(--surface-container-highest)', borderRadius: 'var(--radius-lg)', boxShadow: '0 12px 32px rgba(0,0,0,0.22)', padding: '6px', zIndex: 40 }}
                  >
                    {Object.keys(PERIODS).map((key) => (
                      <button
                        key={key}
                        type="button"
                        role="menuitemradio"
                        aria-checked={period === key}
                        onClick={() => { setPeriod(key); setPeriodOpen(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '10px 12px',
                          background: period === key ? 'rgba(78, 71, 207, 0.12)' : 'none',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                          fontSize: '13px',
                          color: period === key ? 'var(--primary)' : 'var(--on-surface)',
                          fontWeight: period === key ? 700 : 500,
                        }}
                      >
                        <span>{PERIODS[key].label}</span>
                        {period === key && (
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>check</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Decorative gradient */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50%', background: 'linear-gradient(to top, rgba(78, 71, 207, 0.1), transparent)', zIndex: 0 }} />
            {/* Bars */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', position: 'relative', zIndex: 10, marginTop: '16px', paddingBottom: '32px', borderBottom: '1px solid rgba(199, 196, 214, 0.3)', paddingLeft: '32px', paddingRight: '8px' }}>
              {chartData.length > 0 ? chartData.map((d, i) => (
                <div
                  key={i}
                  style={{
                    width: `${Math.max(30, 100 / chartData.length - 2)}%`,
                    height: `${d.height}px`,
                    background: i === 3 ? 'linear-gradient(135deg, #6862e9, #4e47cf)' : 'var(--surface-container-highest)',
                    borderRadius: '9999px 9999px 0 0',
                    position: 'relative',
                    cursor: 'pointer',
                    boxShadow: i === 3 ? '0 0 15px rgba(78, 71, 207, 0.4)' : 'none',
                    transition: 'all 0.3s',
                  }}
                  title={`${d.label}: ${d.value}`}
                >
                  <span style={{
                    position: 'absolute',
                    top: '-32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '11px',
                    fontWeight: i === 3 ? '700' : '400',
                    color: i === 3 ? 'var(--primary)' : 'var(--on-surface-variant)',
                    whiteSpace: 'nowrap',
                  }}>
                    {d.label}: {d.value}
                  </span>
                </div>
              )) : (
                <div style={{ width: '100%', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                  <span className="body-sm">Sin datos disponibles</span>
                </div>
              )}
            </div>
            {/* X-axis labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', marginTop: '8px', paddingLeft: '32px', paddingRight: '8px' }}>
              {semana.op.map((s, i) => (
                <span key={i} style={{ color: i === 3 ? 'var(--primary)' : undefined, fontWeight: i === 3 ? '700' : '400' }}>{s.label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar (Span 1 column on xl) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--widget-gap)' }}>
          {/* Operations Status */}
          <div className="glass-panel-elevated" style={{ borderRadius: '1.5rem', padding: 'var(--card-padding)', position: 'relative', overflow: 'hidden', background: 'rgba(104, 98, 233, 0.03)' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '128px', height: '128px', background: 'rgba(78, 71, 207, 0.1)', borderRadius: '0 0 0 100%', filter: 'blur(32px)' }} />
            <h3 className="headline-md text-on-surface" style={{ marginBottom: '24px', position: 'relative', zIndex: 10 }}>Estado de Operaciones</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '0.75rem', transition: 'background 0.2s', cursor: 'pointer' }} onClick={() => navigate('/operaciones')} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(104, 98, 233, 0.08)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(165, 216, 255, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>local_shipping</span>
                  </div>
                  <div>
                    <p className="body-sm text-on-surface" style={{ fontWeight: '700' }}>Flota Activa</p>
                    <p className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>{pctFlota}% Operativa</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>chevron_right</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '0.75rem', transition: 'background 0.2s', cursor: 'pointer' }} onClick={() => navigate('/pedidos')} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(104, 98, 233, 0.08)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(131, 106, 157, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>inventory_2</span>
                  </div>
                  <div>
                    <p className="body-sm text-on-surface" style={{ fontWeight: '700' }}>Almacén</p>
                    <p className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>Pedidos en curso {pctAlmacen}%</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>chevron_right</span>
              </div>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="glass-panel" style={{ borderRadius: '1.5rem', padding: 'var(--card-padding)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className="headline-md text-on-surface">Alertas Recientes</h3>
              <a href="/postventa" className="body-sm text-primary" style={{ textDecoration: 'none', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); navigate('/postventa'); }}>Ver Todo</a>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
              {filteredAlerts.length > 0 ? (
                filteredAlerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className="glass-panel"
                    style={{
                      padding: '16px',
                      borderRadius: '1rem',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      borderLeft: `4px solid ${alert.type === 'error' ? 'var(--error)' : alert.type === 'warning' ? 'var(--secondary)' : alert.type === 'success' ? 'var(--success)' : 'var(--primary)'}`,
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <span className={`material-symbols-outlined`} style={{
                      color: alert.type === 'error' ? 'var(--error)' : alert.type === 'warning' ? 'var(--secondary)' : alert.type === 'success' ? 'var(--success)' : 'var(--primary)',
                      marginTop: '2px',
                    }}>
                      {alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : alert.type === 'success' ? 'check_circle' : 'info'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="body-sm text-on-surface" style={{ fontWeight: '700' }}>{alert.title}</p>
                      <p className="body-sm text-on-surface-variant" style={{ fontSize: '12px', marginTop: '4px', lineHeight: '1.4' }}>{alert.description}</p>
                      <span className="label-caps text-on-surface-variant" style={{ fontSize: '10px', marginTop: '8px', display: 'block' }}>{alert.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '8px' }}>notifications_off</span>
                  <p className="body-sm">No hay alertas recientes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de la alerta */}
      {selectedAlert && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="alert-modal-title" onClick={() => setSelectedAlert(null)}>
          <div className="modal-content glass-panel" style={{ background: 'var(--glass-bg-strong)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`material-symbols-outlined`} style={{ color: selectedAlert.type === 'error' ? 'var(--error)' : selectedAlert.type === 'warning' ? 'var(--secondary)' : selectedAlert.type === 'success' ? 'var(--success)' : 'var(--primary)' }}>
                  {selectedAlert.type === 'error' ? 'error' : selectedAlert.type === 'warning' ? 'warning' : selectedAlert.type === 'success' ? 'check_circle' : 'info'}
                </span>
                <h3 id="alert-modal-title" className="headline-md text-on-surface">{selectedAlert.title}</h3>
              </div>
              <button className="icon-btn" aria-label="Cerrar alerta" onClick={() => setSelectedAlert(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <span className="label-caps text-on-surface-variant">Fecha y Hora</span>
                <p className="body-md text-on-surface" style={{ marginTop: '4px' }}>{selectedAlert.time}</p>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <span className="label-caps text-on-surface-variant">Resumen de Alerta</span>
                <p className="body-md text-on-surface" style={{ marginTop: '4px' }}>{selectedAlert.description}</p>
              </div>
              <div style={{ padding: '16px', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)' }}>
                <span className="label-caps text-secondary">Detalles Técnicos</span>
                <p className="body-sm text-on-surface" style={{ marginTop: '8px', whiteSpace: 'pre-line', lineHeight: '20px' }}>
                  {selectedAlert.details}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedAlert(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
