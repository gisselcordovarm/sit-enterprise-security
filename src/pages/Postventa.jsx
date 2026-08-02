import { useState, useEffect } from 'react';
import DataStatus from '../components/common/DataStatus';
import { fetchIncidencias, fetchEncuestas, registrarEncuesta } from '../lib/data';

export default function Postventa() {
  const [incidents, setIncidents] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveError, setLiveError] = useState(null);

  // Form states
  const [newClient, setNewClient] = useState('');
  const [newRating, setNewRating] = useState('10');
  const [newComment, setNewComment] = useState('');
  const [alertMsg, setAlertMsg] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchIncidencias(), fetchEncuestas()])
      .then(([inc, sur]) => {
        if (!active) return;
        setIncidents(inc);
        setSurveys(sur);
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

  // NPS Score Calculator
  const calculateNPS = () => {
    if (surveys.length === 0) return 0;
    const promoters = surveys.filter((s) => s.rating >= 9).length;
    const detractors = surveys.filter((s) => s.rating <= 6).length;
    return Math.round(((promoters - detractors) / surveys.length) * 100);
  };

  const slaCompliance = '94.2%';

  // Submit survey
  const handleSurveySubmit = async (e) => {
    e.preventDefault();
    if (!newClient) return;

    const ratingVal = parseInt(newRating);
    const newSurvey = await registrarEncuesta({
      cliente: newClient,
      rating: ratingVal,
      comentario: newComment,
    });

    setSurveys((prev) => [newSurvey, ...prev]);
    setNewClient('');
    setNewRating('10');
    setNewComment('');
    setAlertMsg({ type: 'success', text: 'Encuesta registrada. El indicador NPS del panel se ha recalculado.' });
  };

  const openCount = incidents.filter((inc) => inc.status !== 'Cerrado').length;

  return (
    <div>
      {/* Page Title */}
      <div style={{ marginBottom: 'var(--stack-lg)' }}>
        <h1 className="display-lg text-on-surface">Postventa y Calidad</h1>
        <p className="body-md text-on-surface-variant">Monitoreo de incidencias recientes de 7 días, retroalimentación del cliente y cálculo del NPS corporativo.</p>
      </div>

      <DataStatus loading={loading} liveError={liveError} />

      {alertMsg && (
        <div className={`alert-item alert-item--${alertMsg.type}`} style={{ marginBottom: '20px' }}>
          <span className="material-symbols-outlined">reviews</span>
          <div className="alert-content">
            <p className="body-sm text-on-surface">{alertMsg.text}</p>
          </div>
          <button className="icon-btn" onClick={() => setAlertMsg(null)} style={{ marginLeft: 'auto' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Quality metrics dashboard */}
      <section className="grid-3" style={{ marginBottom: '20px' }}>
        <div className="kpi-card glass-panel" style={{ background: 'rgba(23, 31, 51, 0.55)', minHeight: '120px' }}>
          <span className="label-caps text-on-surface-variant">Score NPS Corporativo</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
            <span className="display-lg text-secondary" style={{ fontSize: '36px', lineHeight: '1' }}>{calculateNPS()}</span>
            <span className="label-caps text-on-surface-variant">Puntos</span>
          </div>
          <span className="body-sm text-on-surface-variant" style={{ display: 'block', marginTop: '8px' }}>
            {surveys.filter((s) => s.rating >= 9).length} Promotores vs {surveys.filter((s) => s.rating <= 6).length} Detractores
          </span>
        </div>

        <div className="kpi-card glass-panel" style={{ background: 'rgba(23, 31, 51, 0.55)', minHeight: '120px' }}>
          <span className="label-caps text-on-surface-variant">Cumplimiento SLA</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
            <span className="display-lg text-success" style={{ fontSize: '36px', lineHeight: '1' }}>{slaCompliance}</span>
          </div>
          <span className="body-sm text-on-surface-variant" style={{ display: 'block', marginTop: '8px' }}>Meta corporativa: 95.0%</span>
        </div>

        <div className="kpi-card glass-panel" style={{ background: 'rgba(23, 31, 51, 0.55)', minHeight: '120px' }}>
          <span className="label-caps text-on-surface-variant">Incidencias Críticas</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
            <span className="display-lg text-error" style={{ fontSize: '36px', lineHeight: '1' }}>
              {openCount}
            </span>
            <span className="label-caps text-on-surface-variant">Activas</span>
          </div>
          <span className="body-sm text-on-surface-variant" style={{ display: 'block', marginTop: '8px' }}>Monitoreo de últimas 168 horas</span>
        </div>
      </section>

      <div className="grid-2">
        {/* Incident Alerts (Last 7 Days) */}
        <section className="card glass-panel" style={{ background: 'rgba(23, 31, 51, 0.55)' }}>
          <div className="card-header-border">
            <h2 className="headline-md text-on-surface">Historial de Incidencias (7 Días)</h2>
            <span className="badge badge-info">{incidents.length} registros</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {incidents.map((inc) => (
              <div
                key={inc.id}
                style={{
                  padding: '12px 16px',
                  background: 'var(--surface-container-low)',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div>
                    <span className="body-sm text-on-surface" style={{ fontWeight: 'bold' }}>{inc.type}</span>
                    <span className="body-sm text-on-surface-variant" style={{ display: 'block', fontSize: '12px' }}>Cliente: {inc.client} | {inc.date}</span>
                  </div>
                  <span className={`badge ${inc.status === 'Cerrado' ? 'badge-success' : inc.status === 'Investigando' ? 'badge-warning' : 'badge-error'}`}>
                    {inc.status}
                  </span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary-container)' }}>
                  <span className="label-caps text-on-surface-variant" style={{ fontSize: '9px', display: 'block' }}>Resolución / Observaciones:</span>
                  <p className="body-sm text-on-surface" style={{ fontSize: '13px', marginTop: '2px' }}>{inc.resolution}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Survey feedback & Submission Form */}
        <section className="card glass-panel" style={{ background: 'rgba(23, 31, 51, 0.55)' }}>
          <div className="card-header-border">
            <h2 className="headline-md text-on-surface">Registrar Encuesta de Satisfacción</h2>
          </div>

          <form onSubmit={handleSurveySubmit} style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label>Cliente</label>
              <input
                type="text"
                placeholder="Ej. Lucas Peralta"
                className="form-input"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                required
              />
            </div>

            <div className="grid-2" style={{ gap: '12px', marginBottom: '0' }}>
              <div className="form-group">
                <label>Puntaje Recomendación (0 al 10)</label>
                <select
                  className="form-select"
                  value={newRating}
                  onChange={(e) => setNewRating(e.target.value)}
                >
                  {[...Array(11).keys()].map((val) => (
                    <option key={val} value={val}>{val} {val >= 9 ? '(Promotor)' : val >= 7 ? '(Pasivo)' : '(Detractor)'}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Comentarios del Cliente</label>
                <input
                  type="text"
                  placeholder="Ej. Muy buena atención técnica..."
                  className="form-input"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <span className="material-symbols-outlined">rate_review</span>
              Registrar Calificación
            </button>
          </form>

          {/* Feedback Feed */}
          <div>
            <span className="label-caps text-secondary" style={{ display: 'block', marginBottom: '8px' }}>Comentarios Recientes</span>
            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {surveys.map((s) => (
                <div key={s.id} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="body-sm text-on-surface" style={{ fontWeight: 'bold' }}>{s.client}</span>
                    <span className={`badge ${s.type === 'Promotor' ? 'badge-success' : s.type === 'Pasivo' ? 'badge-warning' : 'badge-error'}`} style={{ fontSize: '10px' }}>
                      Puntuación: {s.rating} ({s.type})
                    </span>
                  </div>
                  <p className="body-sm text-on-surface-variant" style={{ fontStyle: 'italic' }}>"{s.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
