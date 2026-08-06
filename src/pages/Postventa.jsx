import { useState, useEffect } from 'react';
import DataStatus from '../components/common/DataStatus';
import {
  fetchIncidencias, fetchEncuestas, registrarEncuesta,
  crearIncidencia, actualizarIncidencia,
  fetchMantenimientos, programarMantenimiento, completarMantenimiento,
  asignarTecnicoMantenimiento, sincronizarMantenimientos,
  TIPOS_MANTENIMIENTO, fetchTecnicos,
} from '../lib/data';
import { tecnicoMasCercano } from '../lib/geo';

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

  // Incidencia states
  const [inciClient, setInciClient] = useState('');
  const [inciType, setInciType] = useState('Desconexión de Canal');
  const [inciDesc, setInciDesc] = useState('');
  const [inciResol, setInciResol] = useState('');
  const [busyIncidencia, setBusyIncidencia] = useState(false);
  const [busySurvey, setBusySurvey] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // Mantenimiento preventivo states
  const [mantenimientos, setMantenimientos] = useState([]);
  const [mantCliente, setMantCliente] = useState('');
  const [mantTipo, setMantTipo] = useState(TIPOS_MANTENIMIENTO[0].label);
  const [mantFecha, setMantFecha] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [mantFrecuencia, setMantFrecuencia] = useState(6);
  const [busyMant, setBusyMant] = useState(false);
  const [syncingMant, setSyncingMant] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchIncidencias(), fetchEncuestas(), fetchMantenimientos()])
      .then(async ([inc, sur, mant]) => {
        if (!active) return;
        setIncidents(inc);
        setSurveys(sur);
        setMantenimientos(mant);
        setLiveError(null);
        // Barrido automático del calendario preventivo: marca vencidas y
        // genera las órdenes de trabajo en Operaciones.
        try {
          const res = await sincronizarMantenimientos();
          if (active && (res.creadas > 0 || res.vencidas > 0)) {
            const fresca = await fetchMantenimientos();
            if (active) setMantenimientos(fresca);
            if (res.creadas > 0) {
              setAlertMsg({ type: 'success', text: `Calendario preventivo sincronizado: ${res.creadas} orden(es) de trabajo despachadas a Operaciones.` });
            }
          }
        } catch {
          // La sincronización es no-fatal.
        }
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

  // SLA: porcentaje de incidencias cerradas sobre el total (proxy simple).
  const openCount = incidents.filter((inc) => inc.status !== 'Cerrado').length;
  const slaCompliance = incidents.length
    ? `${Math.round((((incidents.length - openCount) / incidents.length) * 100) * 10) / 10}%`
    : '—';

  // Submit survey
  const handleSurveySubmit = async (e) => {
    e.preventDefault();
    if (busySurvey) return;
    if (!newClient) return;
    setBusySurvey(true);
    setAlertMsg(null);
    try {
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
    } catch (e) {
      console.error('Error al registrar encuesta:', e);
      setAlertMsg({ type: 'error', text: 'No se pudo registrar la encuesta. Verifica la conexión e intenta de nuevo.' });
    } finally {
      setBusySurvey(false);
    }
  };

  // Crear una incidencia
  const handleCreateIncidencia = async (e) => {
    e.preventDefault();
    if (inciClient.trim() === '') {
      setAlertMsg({ type: 'error', text: 'Ingresa el nombre del cliente para registrar la incidencia.' });
      return;
    }
    setBusyIncidencia(true);
    setAlertMsg(null);
    try {
      const inc = await crearIncidencia({ client: inciClient, tipo: inciType, descripcion: inciDesc });
      setIncidents((prev) => [inc, ...prev]);
      setInciClient('');
      setInciDesc('');
      setAlertMsg({ type: 'success', text: `Incidencia ${inc.id} registrada en estado Abierto.` });
    } catch (err) {
      console.error('Error al crear incidencia:', err);
      setAlertMsg({ type: 'error', text: 'No se pudo registrar la incidencia.' });
    } finally {
      setBusyIncidencia(false);
    }
  };

  // Resolver / Cerrar incidencia
  const handleUpdateIncidencia = async (inc, estado) => {
    if (updatingId) return;
    setUpdatingId(inc.id);
    setAlertMsg(null);
    try {
      const resolucion = estado === 'Cerrado'
        ? inciResol.trim() || 'Resuelto por equipo de soporte.'
        : inc.resolution || 'Investigando...';
      const res = await actualizarIncidencia(inc.dbId ?? inc.id, { estado, resolucion });
      setIncidents((prev) => prev.map((x) =>
        x.id === inc.id
          ? { ...x, status: res.status, resolution: res.resolution || x.resolution }
          : x
      ));
      setInciResol('');
      setAlertMsg({ type: 'success', text: `Incidencia ${inc.id} marcada como ${estado}.` });
    } catch (err) {
      console.error('Error al actualizar incidencia:', err);
      setAlertMsg({ type: 'error', text: 'No se pudo actualizar la incidencia.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // ---- Mantenimiento preventivo ----

  const formatFecha = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const diasHasta = (iso) => {
    if (!iso) return null;
    const hoyMs = new Date();
    hoyMs.setHours(0, 0, 0, 0);
    const t = new Date(`${iso}T00:00:00`);
    return Math.round((t - hoyMs) / 86400000);
  };

  const hoyISO = () => new Date().toISOString().slice(0, 10);

  const proximas30 = mantenimientos.filter((m) => {
    const d = diasHasta(m.fecha);
    return m.estado !== 'Completado' && d !== null && d >= 0 && d <= 30;
  }).length;
  const vencidas = mantenimientos.filter((m) => m.estado === 'Vencido' || (m.fecha && m.fecha < hoyISO())).length;

  const badgeEstadoMant = (m) => {
    const d = diasHasta(m.fecha);
    if (m.estado === 'Vencido' || (d !== null && d < 0)) return 'badge-error';
    if (d !== null && d <= 15) return 'badge-warning';
    return 'badge-success';
  };

  const handleProgramarMantenimiento = async (e) => {
    e.preventDefault();
    if (busyMant) return;
    if (!mantCliente.trim()) {
      setAlertMsg({ type: 'error', text: 'Ingresa el cliente o instalación para el plan.' });
      return;
    }
    setBusyMant(true);
    setAlertMsg(null);
    try {
      const plan = await programarMantenimiento({
        cliente: mantCliente.trim(),
        tipo: mantTipo,
        fecha: mantFecha,
        frecuencia: mantFrecuencia,
      });
      setMantenimientos((prev) => [plan, ...prev].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))));
      setMantCliente('');
      setAlertMsg({ type: 'success', text: `Plan ${plan.id} programado. Próxima visita: ${formatFecha(plan.fecha)} (+${mantFrecuencia} meses).` });
    } catch (err) {
      console.error('Error al programar mantenimiento:', err);
      setAlertMsg({ type: 'error', text: 'No se pudo programar el mantenimiento.' });
    } finally {
      setBusyMant(false);
    }
  };

  const handleCompletarMant = async (m) => {
    if (busyMant) return;
    setBusyMant(true);
    setAlertMsg(null);
    try {
      await completarMantenimiento(m.dbId ?? m.id);
      const fresca = await fetchMantenimientos();
      setMantenimientos(fresca);
      setAlertMsg({ type: 'success', text: `Visita de ${m.client} completada. Siguiente ciclo agendado (+${m.frecuencia || 6} meses).` });
    } catch (err) {
      console.error('Error al completar mantenimiento:', err);
      setAlertMsg({ type: 'error', text: 'No se pudo completar la visita.' });
    } finally {
      setBusyMant(false);
    }
  };

  const handleAsignarMant = async (m) => {
    if (busyMant) return;
    setBusyMant(true);
    setAlertMsg(null);
    try {
      const tecs = await fetchTecnicos();
      const activos = tecs.filter((t) => t.status === 'Activo');
      const near = tecnicoMasCercano(m.zone, activos);
      if (!near?.tecnico) {
        setAlertMsg({ type: 'error', text: `No hay técnico activo con zona para ${m.zone || 'el plan'}.` });
        return;
      }
      const res = await asignarTecnicoMantenimiento(m.dbId ?? m.id, near.tecnico.dbId ?? near.tecnico.id, near.tecnico.name);
      setMantenimientos((prev) => prev.map((x) =>
        x.id === m.id ? { ...x, tecnico: res.tecnico || near.tecnico.name } : x
      ));
      const dist = near.dist ? ` (${near.dist.toFixed(0)} km desde su zona)` : '';
      setAlertMsg({ type: 'success', text: `Técnico asignado a ${m.client}: ${near.tecnico.name}${dist}.` });
    } catch (err) {
      console.error('Error al asignar técnico:', err);
      setAlertMsg({ type: 'error', text: 'No se pudo asignar el técnico.' });
    } finally {
      setBusyMant(false);
    }
  };

  const handleSyncMant = async () => {
    if (syncingMant) return;
    setSyncingMant(true);
    setAlertMsg(null);
    try {
      const res = await sincronizarMantenimientos();
      const fresca = await fetchMantenimientos();
      setMantenimientos(fresca);
      setAlertMsg({ type: 'success', text: `Calendario sincronizado: ${res.creadas} orden(es) de trabajo generada(s) en Operaciones, ${res.vencidas} visita(s) vencida(s).` });
    } catch (err) {
      console.error('Error al sincronizar:', err);
      setAlertMsg({ type: 'error', text: 'No se pudo sincronizar el calendario.' });
    } finally {
      setSyncingMant(false);
    }
  };

  return (
    <div>
      {/* Page Title */}
      <div style={{ marginBottom: 'var(--stack-lg)' }}>
        <h1 className="display-lg text-on-surface">Postventa y Calidad</h1>
      </div>

      <DataStatus loading={loading} liveError={liveError} />

      {alertMsg && (
        <div className={`alert-item alert-item--${alertMsg.type}`} style={{ marginBottom: '20px' }}>
          <span className="material-symbols-outlined">reviews</span>
          <div className="alert-content">
            <p className="body-sm text-on-surface">{alertMsg.text}</p>
          </div>
          <button className="icon-btn" aria-label="Cerrar aviso" onClick={() => setAlertMsg(null)} style={{ marginLeft: 'auto' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Quality metrics dashboard */}
      <section className="grid-3" style={{ marginBottom: '20px' }}>
        <div className="kpi-card glass-panel" style={{ background: 'var(--glass-bg)', minHeight: '120px' }}>
          <span className="label-caps text-on-surface-variant">Score NPS Corporativo</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
            <span className="display-lg text-secondary" style={{ fontSize: '36px', lineHeight: '1' }}>{calculateNPS()}</span>
            <span className="label-caps text-on-surface-variant">Puntos</span>
          </div>
          <span className="body-sm text-on-surface-variant" style={{ display: 'block', marginTop: '8px' }}>
            {surveys.filter((s) => s.rating >= 9).length} Promotores vs {surveys.filter((s) => s.rating <= 6).length} Detractores
          </span>
        </div>

        <div className="kpi-card glass-panel" style={{ background: 'var(--glass-bg)', minHeight: '120px' }}>
          <span className="label-caps text-on-surface-variant">Cumplimiento SLA</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
            <span className="display-lg text-success" style={{ fontSize: '36px', lineHeight: '1' }}>{slaCompliance}</span>
          </div>
        </div>

        <div className="kpi-card glass-panel" style={{ background: 'var(--glass-bg)', minHeight: '120px' }}>
          <span className="label-caps text-on-surface-variant">Incidencias Críticas</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
            <span className="display-lg text-error" style={{ fontSize: '36px', lineHeight: '1' }}>
              {openCount}
            </span>
            <span className="label-caps text-on-surface-variant">Activas</span>
          </div>
        </div>
      </section>

      {/* Calendario de Mantenimiento Preventivo (semestral automático) */}
      <section className="card glass-panel" style={{ background: 'var(--glass-bg)', marginBottom: '20px' }}>
        <div className="card-header-border" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="headline-md text-on-surface">Calendario de Mantenimiento Preventivo</h2>
            <span className="label-caps text-on-surface-variant">Visitas automáticas cada 6 meses · cambio de baterías de respaldo, limpieza de lentes, prueba de sirena</span>
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} disabled={syncingMant} onClick={handleSyncMant}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sync</span>
            {syncingMant ? 'Sincronizando...' : 'Sincronizar calendario'}
          </button>
        </div>

        <div className="grid-3" style={{ marginBottom: '16px' }}>
          <div className="kpi-card" style={{ background: 'var(--surface-container-low)', minHeight: '78px' }}>
            <span className="label-caps text-on-surface-variant">Próximas 30 días</span>
            <span className="display-lg text-primary" style={{ display: 'block', marginTop: '6px', fontSize: '30px' }}>{proximas30}</span>
          </div>
          <div className="kpi-card" style={{ background: 'var(--surface-container-low)', minHeight: '78px' }}>
            <span className="label-caps text-on-surface-variant">Visitas vencidas</span>
            <span className="display-lg text-error" style={{ display: 'block', marginTop: '6px', fontSize: '30px' }}>{vencidas}</span>
          </div>
          <div className="kpi-card" style={{ background: 'var(--surface-container-low)', minHeight: '78px' }}>
            <span className="label-caps text-on-surface-variant">Ciclos activos</span>
            <span className="display-lg text-success" style={{ display: 'block', marginTop: '6px', fontSize: '30px' }}>{mantenimientos.length}</span>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Formulario para programar plan */}
          <div style={{ background: 'var(--surface-container-low)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)' }}>
            <span className="label-caps text-primary" style={{ display: 'block', marginBottom: '12px' }}>Programar plan de mantenimiento</span>
            <form onSubmit={handleProgramarMantenimiento} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cliente / Instalación</label>
                <input className="form-input" placeholder="Ej. Clínica del Parque" value={mantCliente} onChange={(e) => setMantCliente(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Tipo de visita</label>
                <select className="form-select" value={mantTipo} onChange={(e) => setMantTipo(e.target.value)}>
                  {TIPOS_MANTENIMIENTO.map((t) => (
                    <option key={t.label} value={t.label}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid-2" style={{ gap: '12px', marginBottom: 0 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Próxima fecha</label>
                  <input type="date" className="form-input" value={mantFecha} onChange={(e) => setMantFecha(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Frecuencia (meses)</label>
                  <select className="form-select" value={mantFrecuencia} onChange={(e) => setMantFrecuencia(Number(e.target.value))}>
                    <option value={6}>6 meses (semestral)</option>
                    <option value={3}>3 meses (trimestral)</option>
                    <option value={12}>12 meses (anual)</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={busyMant}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>event_available</span>
                {busyMant ? 'Programando...' : 'Programar Visita'}
              </button>
            </form>
          </div>

          {/* Calendario: próximas visitas */}
          <div>
            <span className="label-caps text-secondary" style={{ display: 'block', marginBottom: '8px' }}>Próximas visitas del calendario</span>
            <div style={{ maxHeight: '430px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {mantenimientos.map((m) => {
                const d = diasHasta(m.fecha);
                const vencida = m.estado === 'Vencido' || (d !== null && d < 0);
                return (
                  <div key={m.id} style={{ padding: '12px 14px', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
                      <div>
                        <span className="body-sm text-on-surface" style={{ fontWeight: 'bold' }}>{m.client}</span>
                        <span className="body-sm text-on-surface-variant" style={{ display: 'block', fontSize: '12px' }}>{m.tipo}</span>
                        <span className="label-caps text-on-surface-variant" style={{ fontSize: '9px', display: 'block', marginTop: '2px' }}>
                          {m.servicio || m.zone || 'Sin zona'} {m.tecnico ? ` · ${m.tecnico}` : ''}
                        </span>
                      </div>
                      <span className={`badge ${badgeEstadoMant(m)}`} style={{ whiteSpace: 'nowrap' }}>
                        {vencida ? `Vencida (hace ${Math.abs(d)}d)` : (d !== null ? `En ${d} día${d === 1 ? '' : 's'}` : m.estado)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>
                        {m.fecha ? `Visita: ${formatFecha(m.fecha)}` : ''}{m.ultima ? ` · Última: ${formatFecha(m.ultima)}` : ''}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '11px', color: 'var(--primary)' }} disabled={busyMant} onClick={() => handleAsignarMant(m)}>
                          Asignar técnico
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} disabled={busyMant} onClick={() => handleCompletarMant(m)}>
                          Completar +{m.frecuencia || 6}m
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {mantenimientos.length === 0 && (
                <p className="body-sm text-on-surface-variant" style={{ textAlign: 'center', padding: '16px' }}>
                  Sin planes de mantenimiento. Programa uno o completa una instalación para que se genere automáticamente.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid-2">
        {/* Incident Alerts (Last 7 Days) */}
        <section className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
          <div className="card-header-border">
            <h2 className="headline-md text-on-surface">Historial de Incidencias (7 Días)</h2>
            <span className="badge badge-info">{incidents.length} registros</span>
          </div>

          <form onSubmit={handleCreateIncidencia} style={{ marginBottom: '16px', background: 'var(--surface-container-low)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <span className="label-caps text-primary" style={{ display: 'block', marginBottom: '8px' }}>Registrar nueva incidencia</span>
            <div className="grid-2" style={{ gap: '10px', marginBottom: '0' }}>
              <div className="form-group">
                <label>Cliente</label>
                <input className="form-input" placeholder="Ej. Banco Nación" value={inciClient} onChange={(e) => setInciClient(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Tipo de incidencia</label>
                <select className="form-select" value={inciType} onChange={(e) => setInciType(e.target.value)}>
                  <option>Desconexión de Canal</option>
                  <option>Falsa Alarma Nocturna</option>
                  <option>Baja Batería Respaldo</option>
                  <option>Error Configuración App</option>
                  <option>Fallo de Cámara / Equipo</option>
                  <option>Otro</option>
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label>Descripción</label>
              <input className="form-input" placeholder="Detalle breve del problema reportado" value={inciDesc} onChange={(e) => setInciDesc(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busyIncidencia}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add_alert</span>
              {busyIncidencia ? 'Registrando...' : 'Crear Incidencia'}
            </button>
          </form>

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
                <div style={{ background: 'var(--surface-container-low)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary-container)', marginBottom: '8px' }}>
                  <span className="label-caps text-on-surface-variant" style={{ fontSize: '9px', display: 'block' }}>Resolución / Observaciones:</span>
                  <p className="body-sm text-on-surface" style={{ fontSize: '13px', marginTop: '2px' }}>{inc.resolution}</p>
                </div>
                {inc.status !== 'Cerrado' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      className="form-input"
                      placeholder="Nota de resolución (opcional)"
                      value={inciResol}
                      onChange={(e) => setInciResol(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '12px' }} disabled={updatingId === inc.id} onClick={() => handleUpdateIncidencia(inc, 'Investigando')}>
                        Investigando
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '12px', color: 'var(--success)' }} disabled={updatingId === inc.id} onClick={() => handleUpdateIncidencia(inc, 'Cerrado')}>
                        Cerrar / Resolver
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {incidents.length === 0 && (
              <p className="body-sm text-on-surface-variant" style={{ textAlign: 'center', padding: '16px' }}>No hay incidencias registradas.</p>
            )}
          </div>
        </section>

        {/* Survey feedback & Submission Form */}
        <section className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busySurvey}>
              <span className="material-symbols-outlined">{busySurvey ? 'hourglass_top' : 'rate_review'}</span>
              {busySurvey ? 'Registrando...' : 'Registrar Calificación'}
            </button>
          </form>

          {/* Feedback Feed */}
          <div>
            <span className="label-caps text-secondary" style={{ display: 'block', marginBottom: '8px' }}>Comentarios Recientes</span>
            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {surveys.map((s) => (
                <div key={s.id} style={{ padding: '8px 12px', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="body-sm text-on-surface" style={{ fontWeight: 'bold' }}>{s.client}</span>
                    <span className={`badge ${s.type === 'Promotor' ? 'badge-success' : s.type === 'Pasivo' ? 'badge-warning' : 'badge-error'}`} style={{ fontSize: '10px' }}>
                      Puntuación: {s.rating} ({s.type})
                    </span>
                  </div>
                  <p className="body-sm text-on-surface-variant" style={{ fontStyle: 'italic' }}>"{s.comment}"</p>
                </div>
              ))}
              {surveys.length === 0 && (
                <p className="body-sm text-on-surface-variant" style={{ textAlign: 'center', padding: '16px' }}>Aún no hay encuestas de satisfacción.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
