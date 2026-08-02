import { useState, useRef, useEffect } from 'react';
import DataStatus from '../components/common/DataStatus';
import { fetchInstalaciones, guardarInstalacion } from '../lib/data';

export default function Instalacion() {
  const [instalaciones, setInstalaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveError, setLiveError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const [notes, setNotes] = useState('');
  const [installedCount, setInstalledCount] = useState('Completo');
  const [savedReport, setSavedReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  // HTML5 Canvas Digital Signature ref
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    let active = true;
    fetchInstalaciones()
      .then((data) => {
        if (!active) return;
        setInstalaciones(data);
        const pending = data.find((i) => i.estado === 'Programada' || i.estado === 'Pendiente') || data[0] || null;
        setSelectedTask(pending);
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

  // Setup Canvas context
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  }, [selectedTask]);

  // Drawing Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Check if signature canvas has drawn content
  const hasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return true;
    }
    return false;
  };

  // Submit Completed report
  const handleSaveReport = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    // Requiere firma del cliente antes de confirmar la entrega.
    if (!hasSignature()) {
      setErrorMsg('Debes capturar la firma digital del cliente antes de confirmar la entrega.');
      const sigZone = document.querySelector('.signature-canvas');
      if (sigZone) sigZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSavedReport(null);

    const canvas = canvasRef.current;
    const signatureImg = canvas ? canvas.toDataURL() : null;

    try {
      const result = await guardarInstalacion({
        id: selectedTask.id,
        client: selectedTask.client,
        service: selectedTask.service,
        notes,
        status: installedCount,
        signature: signatureImg,
      });
      setSavedReport(result);
      setInstalaciones((prev) => prev.filter((i) => i.id !== selectedTask.id));
      setNotes('');
      clearSignature();
    } catch (err) {
      console.error('Error al guardar instalación:', err);
      setErrorMsg('No se pudo guardar el reporte de instalación. Verificá la conexión e intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleNextOrder = () => {
    setSavedReport(null);
    const next = instalaciones.find((i) => i.estado === 'Programada' || i.estado === 'Pendiente');
    setSelectedTask(next || null);
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      {/* Page Title */}
      <div style={{ marginBottom: 'var(--stack-lg)', textAlign: 'center' }}>
        <span className="label-caps text-secondary">Portal Técnico Móvil</span>
        <h1 className="headline-lg text-on-surface" style={{ marginTop: '4px' }}>Instalación y Firma</h1>
        <p className="body-sm text-on-surface-variant">Interfaz responsiva optimizada para operación en smartphones.</p>
      </div>

      <DataStatus loading={loading} liveError={liveError} />

      {savedReport ? (
        <section className="card glass-panel" style={{ background: 'var(--tint-success)', border: '1px solid rgba(14, 159, 110, 0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span className="material-symbols-outlined text-success" style={{ fontSize: '48px' }}>check_circle</span>
            <h2 className="headline-md text-on-surface">¡Parte Técnico Guardado!</h2>
            <p className="body-sm text-on-surface-variant">El parte ha sido sincronizado al servidor central.</p>
          </div>

          <div style={{ background: 'var(--surface-container-low)', padding: '12px', borderRadius: 'var(--radius-lg)', marginBottom: '16px' }}>
            <span className="label-caps text-primary" style={{ display: 'block', marginBottom: '8px' }}>Resumen de Entrega</span>
            <p className="body-sm text-on-surface"><strong>Cliente:</strong> {savedReport.task.client}</p>
            <p className="body-sm text-on-surface"><strong>Servicio:</strong> {savedReport.task.service}</p>
            <p className="body-sm text-on-surface"><strong>Estado:</strong> {savedReport.status}</p>
            <p className="body-sm text-on-surface"><strong>Notas:</strong> {savedReport.notes || 'Sin observaciones'}</p>
            <p className="body-sm text-on-surface-variant" style={{ fontSize: '11px', marginTop: '6px' }}><strong>Sincronizado:</strong> {savedReport.timestamp}</p>
          </div>

          {savedReport.signature && (
            <div style={{ textAlign: 'center' }}>
              <span className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '6px' }}>Firma Digital Capturada</span>
              <div style={{ background: '#0b1326', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '8px', display: 'inline-block' }}>
                <img src={savedReport.signature} alt="Firma Digital" style={{ maxHeight: '80px', filter: 'brightness(1.5)' }} />
              </div>
            </div>
          )}

          <button className="btn btn-primary" style={{ marginTop: '20px', width: '100%' }} onClick={handleNextOrder}>
            Cargar Siguiente Orden
          </button>
        </section>
      ) : (
        <div>
          {!selectedTask ? (
            <section className="card glass-panel" style={{ background: 'var(--glass-bg)', textAlign: 'center', padding: '32px' }}>
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '48px' }}>check_circle</span>
              <h2 className="headline-md text-on-surface" style={{ marginTop: '12px' }}>Sin órdenes de instalación pendientes</h2>
              <p className="body-sm text-on-surface-variant">Las órdenes asignadas aparecerán aquí para completar el parte técnico y la firma digital.</p>
            </section>
          ) : (
            <div>
              {/* Selector de orden de instalación */}
              {instalaciones.length > 1 && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label>Seleccionar Orden de Trabajo</label>
                  <select
                    className="form-select"
                    value={selectedTask.id}
                    onChange={(e) => setSelectedTask(instalaciones.find((i) => String(i.id) === e.target.value))}
                  >
                    {instalaciones.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.client} — {inst.service} ({inst.estado})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Active Job Information */}
              <section className="card glass-panel" style={{ background: 'var(--glass-bg)', marginBottom: '16px' }}>
                <div className="card-header-border">
                  <span className="badge badge-info">{selectedTask.taskId}</span>
                  <span className="label-caps text-secondary">Orden Asignada</span>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <h3 className="headline-md text-on-surface" style={{ fontSize: '18px' }}>{selectedTask.client}</h3>
                  <p className="body-sm text-on-surface-variant" style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span>
                    {selectedTask.address}
                  </p>
                </div>
                <div style={{ background: 'var(--surface-container-low)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)' }}>
                  <span className="label-caps text-primary" style={{ fontSize: '10px' }}>Materiales a Instalar:</span>
                  <p className="body-sm text-on-surface" style={{ marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{selectedTask.components}</p>
                </div>
              </section>

              {/* Form Report */}
              <section className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
                <div className="card-header-border">
                  <h2 className="headline-md text-on-surface" style={{ fontSize: '16px' }}>Reporte de Intervención</h2>
                </div>
                <form onSubmit={handleSaveReport}>
                  <div className="form-group">
                    <label>Resultado de Instalación</label>
                    <select
                      className="form-select"
                      value={installedCount}
                      onChange={(e) => setInstalledCount(e.target.value)}
                    >
                      <option value="Completo">Instalación 100% Operativa</option>
                      <option value="Incompleto - Falta Material">Incompleto - Falta Material</option>
                      <option value="Incompleto - Problema Técnico">Incompleto - Problema de Factibilidad</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Notas Técnicas y Observaciones</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Detalle la ubicación de los equipos instalados o inconvenientes detectados..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{ minHeight: '80px' }}
                    />
                  </div>

                  {/* Digital Signature Canvas Pad */}
                  <div className="form-group">
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Firma Digital del Cliente</span>
                      <button type="button" className="btn-ghost" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={clearSignature}>
                        Limpiar
                      </button>
                    </label>

                    <div className="signature-canvas" style={{ background: '#060e20', border: errorMsg ? '2px solid var(--error)' : '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: '140px', touchAction: 'none' }}>
                      <canvas
                        ref={canvasRef}
                        width={460}
                        height={140}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        style={{ cursor: 'crosshair', display: 'block', width: '100%', height: '100%' }}
                      />
                    </div>
                    <span className="label-caps text-on-surface-variant" style={{ fontSize: '9px', marginTop: '4px', display: 'block', textTransform: 'none' }}>
                      Use el mouse o el dedo sobre la pantalla para firmar.
                    </span>
                  </div>

                  {errorMsg && (
                    <div className="alert-item alert-item--error" style={{ margin: '0 0 12px' }}>
                      <span className="material-symbols-outlined">warning</span>
                      <div className="alert-content">
                        <p className="body-sm text-on-surface">{errorMsg}</p>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
                    <span className="material-symbols-outlined">send_and_archive</span>
                    {saving ? 'Guardando...' : 'Confirmar y Firmar Entrega'}
                  </button>
                </form>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
