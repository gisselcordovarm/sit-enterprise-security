import { useState, useEffect } from 'react';
import DataStatus from '../components/common/DataStatus';
import { fetchKpis, fetchAlertas, fetchMetricasSemanales } from '../lib/data';

export default function Dashboard() {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alertFilter, setAlertFilter] = useState('ALL');
  const [chartMetric, setChartMetric] = useState('OP'); // 'OP' = Operaciones, 'ING' = Ingresos

  const [kpis, setKpis] = useState({ pedidosTotales: 0, incidenciasAbiertas: 0, tecnicosActivos: 0, tecnicosTotales: 0, nps: 0 });
  const [alerts, setAlerts] = useState([]);
  const [semana, setSemana] = useState({ op: [], ing: [] });
  const [loading, setLoading] = useState(true);
  const [liveError, setLiveError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchKpis(), fetchAlertas(), fetchMetricasSemanales()])
      .then(([kpiData, alertData, weekData]) => {
        if (!active) return;
        setKpis(kpiData);
        setAlerts(alertData);
        setSemana(weekData);
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

  const chartData = buildChart(chartMetric === 'OP' ? semana.op : semana.ing);

  const kpiCards = [
    { title: 'Pedidos Totales', value: kpis.pedidosTotales.toLocaleString(), trend: '+14%', trendUp: true, icon: 'shopping_bag', colorClass: 'text-primary', containerBg: 'rgba(94, 139, 255, 0.1)' },
    { title: 'Alarmas Activas', value: String(kpis.incidenciasAbiertas), trend: '-24%', trendUp: false, icon: 'emergency_home', colorClass: 'text-error', containerBg: 'rgba(255, 180, 171, 0.1)' },
    { title: 'Técnicos Activos', value: `${kpis.tecnicosActivos} / ${kpis.tecnicosTotales}`, trend: '92%', trendUp: true, icon: 'engineering', colorClass: 'text-success', containerBg: 'rgba(62, 241, 181, 0.1)' },
    { title: 'Satisfacción NPS', value: String(kpis.nps), trend: '+5ptos', trendUp: true, icon: 'thumb_up', colorClass: 'text-secondary', containerBg: 'rgba(220, 184, 255, 0.1)' },
  ];

  return (
    <div>
      {/* Title section */}
      <div style={{ marginBottom: 'var(--stack-lg)' }}>
        <h1 className="display-lg text-on-surface">Panel Central</h1>
        <p className="body-md text-on-surface-variant">Monitoreo general de operaciones de seguridad y factibilidad técnica.</p>
      </div>

      <DataStatus loading={loading} liveError={liveError} />

      {/* KPI Bento Grid */}
      <section className="kpi-grid">
        {kpiCards.map((kpi, idx) => (
          <div key={idx} className="kpi-card glass-panel" style={{ background: 'rgba(23, 31, 51, 0.55)' }}>
            <div className="kpi-header">
              <span className="label-caps text-on-surface-variant">{kpi.title}</span>
              <div className="kpi-icon-wrapper" style={{ background: kpi.containerBg }}>
                <span className={`material-symbols-outlined ${kpi.colorClass}`}>{kpi.icon}</span>
              </div>
            </div>
            <div>
              <div className="kpi-value text-on-surface">{kpi.value}</div>
              <div className="trend-indicator body-sm">
                <span
                  className="material-symbols-outlined"
                  style={{ color: kpi.trendUp ? 'var(--success)' : 'var(--error)', fontSize: '16px' }}
                >
                  {kpi.trendUp ? 'trending_up' : 'trending_down'}
                </span>
                <span style={{ color: kpi.trendUp ? 'var(--success)' : 'var(--error)', fontWeight: 'bold' }}>
                  {kpi.trend}
                </span>
                <span className="text-on-surface-variant">vs semana anterior</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Asymmetric Grid */}
      <div className="asymmetric-grid">
        {/* SVG Operations Chart Panel */}
        <section className="card glass-panel" style={{ background: 'rgba(23, 31, 51, 0.55)' }}>
          <div className="card-header-border">
            <div>
              <h2 className="headline-md text-on-surface">Métricas de Operaciones</h2>
              <span className="body-sm text-on-surface-variant">Resumen diario de servicios e instalaciones ejecutadas</span>
            </div>
            {/* Metric selector tabs */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setChartMetric('OP')}
                className={`btn ${chartMetric === 'OP' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Servicios
              </button>
              <button
                onClick={() => setChartMetric('ING')}
                className={`btn ${chartMetric === 'ING' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Ventas
              </button>
            </div>
          </div>

          {/* SVG Custom Chart */}
          <div className="chart-container" style={{ position: 'relative' }}>
            <svg viewBox="0 0 700 300" width="100%" height="100%">
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary-container)" />
                  <stop offset="100%" stopColor="rgba(94, 139, 255, 0.1)" />
                </linearGradient>
                <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--secondary)" />
                  <stop offset="100%" stopColor="rgba(220, 184, 255, 0.2)" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="50" y1="50" x2="650" y2="50" stroke="var(--outline-variant)" strokeDasharray="4" strokeWidth="0.5" />
              <line x1="50" y1="125" x2="650" y2="125" stroke="var(--outline-variant)" strokeDasharray="4" strokeWidth="0.5" />
              <line x1="50" y1="200" x2="650" y2="200" stroke="var(--outline-variant)" strokeDasharray="4" strokeWidth="0.5" />
              <line x1="50" y1="250" x2="650" y2="250" stroke="var(--outline-variant)" strokeWidth="1" />

              {/* Y Axis Labels */}
              <text x="35" y="55" fill="var(--on-surface-variant)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="end">150</text>
              <text x="35" y="130" fill="var(--on-surface-variant)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="end">100</text>
              <text x="35" y="205" fill="var(--on-surface-variant)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="end">50</text>
              <text x="35" y="255" fill="var(--on-surface-variant)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="end">0</text>

              {/* Render Bars */}
              {chartData.map((data, index) => {
                const barWidth = 45;
                const spacing = 80;
                const xPos = 70 + index * spacing;
                const yPos = 250 - data.height;

                return (
                  <g key={index}>
                    <rect
                      x={xPos - 10}
                      y="30"
                      width={barWidth + 20}
                      height="220"
                      fill="transparent"
                      className="chart-guide"
                      style={{ cursor: 'pointer' }}
                    />
                    <rect
                      x={xPos}
                      y={yPos}
                      width={barWidth}
                      height={data.height}
                      fill="url(#barGradient)"
                      rx="6"
                      className="chart-bar-rect"
                    />
                    <text
                      x={xPos + barWidth / 2}
                      y={yPos - 8}
                      fill="var(--on-surface)"
                      fontSize="11"
                      fontFamily="var(--font-mono)"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {data.value}
                    </text>
                    <text
                      x={xPos + barWidth / 2}
                      y="275"
                      fill="var(--on-surface-variant)"
                      fontSize="12"
                      fontFamily="var(--font-body)"
                      textAnchor="middle"
                    >
                      {data.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>

        {/* Recent Alerts Feed Panel */}
        <section className="card glass-panel" style={{ background: 'rgba(23, 31, 51, 0.55)' }}>
          <div className="card-header-border">
            <div>
              <h2 className="headline-md text-on-surface">Eventos y Alertas</h2>
              <span className="body-sm text-on-surface-variant">Filtro en tiempo real</span>
            </div>
            {/* Alert Severity Filter */}
            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', padding: '4px 10px', fontSize: '12px' }}
            >
              <option value="ALL">Todos</option>
              <option value="ERROR">Críticos</option>
              <option value="WARNING">Advertencia</option>
              <option value="SUCCESS">Éxitos</option>
              <option value="INFO">Info</option>
            </select>
          </div>

          <div className="alerts-feed">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`alert-item alert-item--${alert.type}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <span className={`material-symbols-outlined text-${alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'secondary' : alert.type === 'success' ? 'success' : 'primary'}`}>
                    {alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : alert.type === 'success' ? 'check_circle' : 'info'}
                  </span>
                  <div className="alert-content" style={{ width: '100%' }}>
                    <h4 className="text-on-surface">{alert.title}</h4>
                    <p className="body-sm text-on-surface-variant">{alert.description}</p>
                    <span className="alert-time">{alert.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '8px' }}>notifications_off</span>
                <p className="body-md">No hay alertas del tipo seleccionado.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal for alert details */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="modal-content glass-panel" style={{ background: '#131b2e' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`material-symbols-outlined text-${selectedAlert.type === 'error' ? 'error' : selectedAlert.type === 'warning' ? 'secondary' : selectedAlert.type === 'success' ? 'success' : 'primary'}`}>
                  {selectedAlert.type === 'error' ? 'error' : selectedAlert.type === 'warning' ? 'warning' : selectedAlert.type === 'success' ? 'check_circle' : 'info'}
                </span>
                <h3 className="headline-md text-on-surface">{selectedAlert.title}</h3>
              </div>
              <button className="icon-btn" onClick={() => setSelectedAlert(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <span className="label-caps text-on-surface-variant">Fecha y Hora</span>
                <p className="body-md text-on-surface" style={{ marginTop: '4px' }}>{selectedAlert.time} (Tiempo de servidor)</p>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <span className="label-caps text-on-surface-variant">Resumen de Alerta</span>
                <p className="body-md text-on-surface" style={{ marginTop: '4px' }}>{selectedAlert.description}</p>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)' }}>
                <span className="label-caps text-secondary">Detalles Técnicos / Acción Requerida</span>
                <p className="body-sm text-on-surface" style={{ marginTop: '8px', whiteSpace: 'pre-line', lineHeight: '20px' }}>
                  {selectedAlert.details}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedAlert(null)}>Cerrar</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  alert(`Iniciando protocolo de resolución para evento: ${selectedAlert.title}`);
                  setSelectedAlert(null);
                }}
              >
                Resolver Evento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
