import { useState, useEffect } from 'react';
import DataStatus from '../components/common/DataStatus';
import MapaLogistica from '../components/maps/MapaLogistica';
import {
  fetchInventario, reordenarEquipo,
  fetchTecnicos, fetchTareas, fetchAsignaciones, asignarTecnico,
} from '../lib/data';

export default function Operaciones() {
  const [inventory, setInventory] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveError, setLiveError] = useState(null);
  const [operMessage, setOperMessage] = useState(null);
  const [busyReorder, setBusyReorder] = useState(null);
  const [busyAssign, setBusyAssign] = useState(null);
  const [vista, setVista] = useState('lista'); // 'lista' | 'mapa'

  useEffect(() => {
    let active = true;
    Promise.all([fetchInventario(), fetchTecnicos(), fetchTareas(), fetchAsignaciones()])
      .then(([inv, tech, tasks, asg]) => {
        if (!active) return;
        setInventory(inv);
        setTechnicians(tech);
        setPendingTasks(tasks);
        setAssignments(asg);
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

  // Auto-reorder trigger
  const handleTriggerReorder = async (itemId) => {
    if (busyReorder) return;
    setBusyReorder(itemId);
    setOperMessage(null);
    try {
      const result = await reordenarEquipo(itemId);
      setInventory((prev) =>
        prev.map((item) =>
          item.dbId === itemId
            ? { ...item, stock: item.stock + 20, reorderStatus: 'Completado', lastReorderDate: new Date().toISOString().split('T')[0] }
            : item
        )
      );
      setOperMessage({ type: 'success', text: `Reabastecimiento automático disparado. Stock incrementado a ${result.stock} uds.` });
    } catch (err) {
      console.error(err);
      setOperMessage({ type: 'error', text: 'No se pudo disparar el reabastecimiento. Intente de nuevo.' });
    } finally {
      setBusyReorder(null);
    }
  };

  // Technician Assignment Algorithm
  const handleAssignTask = async (task) => {
    if (busyAssign) return;
    setBusyAssign(task.id);
    setOperMessage(null);
    try {
      const result = await asignarTecnico(task);
      if (result.error) {
        setOperMessage({ type: 'error', text: `No se pudo asignar ${task.id}. ${result.error}` });
        return;
      }
      setPendingTasks((prev) => prev.filter((t) => t.id !== task.id));
      setTechnicians((prev) =>
        prev.map((t) => (t.name === result.tech ? { ...t, workload: t.workload + 1 } : t))
      );
      setAssignments((prev) => [result, ...prev]);
      setOperMessage({ type: 'success', text: result.message || `Algoritmo ejecutado: ${task.id} asignado a ${result.tech}.` });
    } catch (err) {
      console.error(err);
      setOperMessage({ type: 'error', text: 'No se pudo ejecutar la asignación. Intente de nuevo.' });
    } finally {
      setBusyAssign(null);
    }
  };

  return (
    <div>
      {/* Page Title */}
      <div style={{ marginBottom: 'var(--stack-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="display-lg text-on-surface">Operaciones y Logística</h1>
        </div>

        {/* Conmutador Vista Lista / Mapa */}
        <div className="seg-toggle" role="tablist" aria-label="Vista de operaciones">
          <button
            type="button"
            role="tab"
            aria-selected={vista === 'lista'}
            className={`seg-btn ${vista === 'lista' ? 'active' : ''}`}
            onClick={() => setVista('lista')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>view_list</span> Lista
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vista === 'mapa'}
            className={`seg-btn ${vista === 'mapa' ? 'active' : ''}`}
            onClick={() => setVista('mapa')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>map</span> Mapa interactivo
          </button>
        </div>
      </div>

      <DataStatus loading={loading} liveError={liveError} />

      {operMessage && (
        <div className={`alert-item alert-item--${operMessage.type}`} style={{ marginBottom: '20px' }}>
          <span className="material-symbols-outlined">
            {operMessage.type === 'success' ? 'done' : 'report'}
          </span>
          <div className="alert-content">
            <p className="body-sm text-on-surface">{operMessage.text}</p>
          </div>
          <button className="icon-btn" aria-label="Cerrar aviso" onClick={() => setOperMessage(null)} style={{ marginLeft: 'auto' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {vista === 'mapa' ? (
        <section className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
          <div className="card-header-border">
            <div>
              <h2 className="headline-md text-on-surface">Geolocalización y Ruteo Óptimo</h2>
              <span className="body-sm text-on-surface-variant">
                Ubicación de instalaciones, posición GPS de técnicos y ruta óptima (reduce costo de combustible y tiempo de traslado).
              </span>
            </div>
          </div>
          <MapaLogistica tecnicos={technicians} tareas={pendingTasks} onAsignar={handleAssignTask} />
        </section>
      ) : (
      <>
      {/* Grid 2 Columns */}
      <div className="grid-2">
        {/* Inventory Monitor Panel */}
        <section className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
          <div className="card-header-border">
            <div>
              <h2 className="headline-md text-on-surface">Control de Stock Crítico</h2>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Componente</th>
                  <th>Stock Actual</th>
                  <th>Mínimo</th>
                  <th>Gatillo Auto-Reorden</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  const isCritical = item.stock < item.minThreshold;
                  const stockPct = item.minThreshold > 0
                    ? Math.min(100, Math.round((item.stock / item.minThreshold) * 100))
                    : 100;
                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="body-sm text-on-surface" style={{ fontWeight: '500', display: 'block' }}>{item.name}</span>
                        <span className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>{item.id}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="body-sm" style={{ fontWeight: 'bold', color: isCritical ? 'var(--error)' : 'var(--success)' }}>
                            {item.stock} uds.
                          </span>
                          {isCritical && (
                            <span className="badge badge-error" style={{ fontSize: '9px', padding: '2px 6px' }}>BAJO</span>
                          )}
                        </div>
                        <div className="stock-bar" title={`Nivel: ${stockPct}% del mínimo`}>
                          <div className={`stock-bar-fill ${isCritical ? 'stock-bar-fill--low' : ''}`} style={{ width: `${stockPct}%` }} />
                        </div>
                      </td>
                      <td><span className="body-sm text-on-surface">{item.minThreshold} uds.</span></td>
                      <td>
                        {isCritical && item.autoReorder ? (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                            disabled={!!busyReorder}
                            onClick={() => handleTriggerReorder(item.dbId)}
                          >
                            {busyReorder === item.dbId ? 'Reponiendo...' : 'Reordenar +20'}
                          </button>
                        ) : item.autoReorder ? (
                          <span className="label-caps text-success" style={{ fontSize: '10px' }}>CONFIGURADO</span>
                        ) : (
                          <span className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>DESACTIVADO</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {inventory.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: '24px' }}>Sin componentes en el inventario.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Dispatch & Assignation Algorithm Panel */}
        <section className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
          <div className="card-header-border">
            <div>
              <h2 className="headline-md text-on-surface">Algoritmo de Ruteo Geográfico</h2>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span className="label-caps text-secondary" style={{ display: 'block', marginBottom: '8px' }}>Servicios Pendientes de Despacho</span>
            {pendingTasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingTasks.map((task) => (
                  <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)' }}>
                    <div>
                      <span className="body-sm text-on-surface" style={{ fontWeight: 'bold' }}>{task.service}</span>
                      <span className="body-sm text-on-surface-variant" style={{ display: 'block', fontSize: '13px' }}>Cliente: {task.client} | Zona: <strong>{task.zone}</strong></span>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} disabled={!!busyAssign} onClick={() => handleAssignTask(task)}>
                      {busyAssign === task.id ? 'Asignando...' : 'Asignar Técnico'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="body-sm text-success">Todos los servicios han sido asignados correctamente.</p>
            )}
          </div>

          <div>
            <span className="label-caps text-on-surface-variant" style={{ display: 'block', marginBottom: '8px' }}>Carga de Trabajo de Técnicos</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {technicians.map((t) => (
                <div key={t.id} style={{ flex: '1 1 140px', padding: '10px', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)' }}>
                  <span className="body-sm text-on-surface" style={{ fontWeight: 'bold', display: 'block' }}>{t.name}</span>
                  <span className="label-caps text-primary" style={{ fontSize: '10px', display: 'block' }}>Zona {t.zone}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span className="body-sm text-on-surface-variant">Tareas: {t.workload}</span>
                    <span className={`tech-status ${t.status === 'Activo' ? 'tech-status--on' : 'tech-status--off'}`}>
                      <span className="tech-status-dot" />
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
              {technicians.length === 0 && (
                <p className="body-sm text-on-surface-variant" style={{ padding: '12px', width: '100%', textAlign: 'center' }}>Sin técnicos registrados.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Assignment lists */}
      <section className="card glass-panel" style={{ background: 'var(--glass-bg)', marginTop: '20px' }}>
        <div className="card-header-border">
          <h2 className="headline-md text-on-surface">Asignaciones en Ejecución</h2>
          <span className="badge badge-info">{assignments.length} activas</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Asignación</th>
                <th>Servicio</th>
                <th>Cliente</th>
                <th>Zona</th>
                <th>Técnico Asignado</th>
                <th>Estado Técnico</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((asg) => (
                <tr key={asg.id}>
                  <td><span className="label-caps text-on-surface" style={{ fontWeight: 'bold' }}>{asg.id}</span></td>
                  <td><span className="body-sm text-on-surface">{asg.task}</span></td>
                  <td><span className="body-sm text-on-surface">{asg.client}</span></td>
                  <td><span className="badge badge-info">Zona {asg.zone}</span></td>
                  <td><span className="body-sm text-secondary" style={{ fontWeight: '500' }}>{asg.tech}</span></td>
                  <td>
                    <span className="badge badge-warning">
                      {asg.status}
                    </span>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: '24px' }}>No hay asignaciones en ejecución.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      </>
      )}
    </div>
  );
}
