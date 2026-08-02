import { useState, useEffect } from 'react';
import DataStatus from '../components/common/DataStatus';
import ZonaVe from '../components/common/ZonaVe';
import { fetchPedidos, crearPedido, fetchInventario, defaultEquipoCodigo } from '../lib/data';
import { formatMoney } from '../lib/format';

export default function Pedidos() {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveError, setLiveError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    cliente: '',
    origen: 'Web',
    servicio: 'Cámaras Residenciales',
    estado: '',
    municipio: '',
    ciudad: '',
    direccion: '',
    coberturaFibra: 'SI',
    tarjetaLimite: 'SUFICIENTE',
    total: '',
  });

  // Líneas de pedido (equipos a reservar del inventario)
  const [lineas, setLineas] = useState([]);
  const [formAlert, setFormAlert] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchPedidos(), fetchInventario()])
      .then(([pedidosData, invData]) => {
        if (!active) return;
        setOrders(pedidosData);
        setInventory(invData);
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

  const handleServicioChange = (servicio) => {
    setFormData((prev) => ({ ...prev, servicio }));
    setLineas((prev) => {
      if (prev.length > 0) return prev;
      const codigo = defaultEquipoCodigo(servicio);
      const item = inventory.find((i) => i.id === codigo);
      if (item) {
        return [{ id_equipo: item.dbId, codigo: item.id, name: item.name, cantidad: 1 }];
      }
      return prev;
    });
  };

  const addLinea = () => {
    const item = inventory.find((i) => !lineas.some((l) => l.id_equipo === i.dbId)) || inventory[0];
    if (item) {
      setLineas([...lineas, { id_equipo: item.dbId, codigo: item.id, name: item.name, cantidad: 1 }]);
    }
  };

  const updateLinea = (index, field, value) => {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const removeLinea = (index) => {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  };

  // Form submit handler
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!formData.cliente || formData.total == null || String(formData.total).trim() === '' || Number(formData.total) <= 0) {
      setFormAlert({ type: 'warning', msg: 'Por favor complete el nombre del cliente y un monto total mayor a cero.' });
      return;
    }

    setSaving(true);
    setFormAlert(null);
    let newOrder;
    try {
      newOrder = await crearPedido({
        ...formData,
        total: parseFloat(formData.total),
        lineas: lineas.map((l) => ({ id_equipo: l.id_equipo, cantidad: l.cantidad })),
      });
    } catch (err) {
      console.error(err);
      setFormAlert({ type: 'error', msg: 'No se pudo registrar el pedido. Intente de nuevo.' });
      setSaving(false);
      return;
    }

    setOrders((prev) => [newOrder, ...prev]);
    setFormData({
      cliente: '',
      origen: 'Web',
      servicio: 'Cámaras Residenciales',
      estado: '',
      municipio: '',
      ciudad: '',
      direccion: '',
      coberturaFibra: 'SI',
      tarjetaLimite: 'SUFICIENTE',
      total: '',
    });
    setLineas([]);

    if (newOrder.flag_aprobado) {
      setFormAlert({ type: 'success', msg: `¡Pedido ${newOrder.id} creado y APROBADO automáticamente! Cumple factibilidad técnica y financiera.` });
    } else {
      setFormAlert({
        type: 'error',
        msg: `Pedido ${newOrder.id} registrado pero RECHAZADO: ${newOrder.factibilidad !== 'Aprobada' ? 'Fallo técnico (factibilidad/stock).' : ''} ${newOrder.pagoStatus !== 'Aprobado' ? 'Fallo financiero (error_pago).' : ''}`,
      });
    }
    setSaving(false);
  };

  return (
    <div>
      {/* Page Title */}
      <div style={{ marginBottom: 'var(--stack-lg)' }}>
        <h1 className="display-lg text-on-surface">Pedidos e Ingresos</h1>
        <p className="body-md text-on-surface-variant">Gestión de captación de órdenes por Web / Call Center y pre-evaluación algorítmica.</p>
      </div>

      <DataStatus loading={loading} liveError={liveError} />

      {formAlert && (
        <div
          className={`alert-item alert-item--${formAlert.type}`}
          style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="material-symbols-outlined">
              {formAlert.type === 'success' ? 'check_circle' : formAlert.type === 'error' ? 'error' : 'warning'}
            </span>
            <span className="body-md text-on-surface">{formAlert.msg}</span>
          </div>
          <button className="icon-btn" aria-label="Cerrar aviso" onClick={() => setFormAlert(null)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      <div className="grid-2">
        {/* Order Capture Form */}
        <section className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
          <div className="card-header-border">
            <h2 className="headline-md text-on-surface">Captar Nuevo Pedido</h2>
          </div>
          <form onSubmit={handleSubmitOrder}>
            <div className="form-group">
              <label>Nombre del Cliente / Empresa</label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez / Telecom S.A."
                className="form-input"
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Dirección de Instalación</label>
              <input
                type="text"
                placeholder="Ej. Av. Francisco de Miranda, Chacao"
                className="form-input"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              />
            </div>

            <div className="grid-2" style={{ gap: '12px', marginBottom: '0' }}>
              <div className="form-group">
                <label>Canal de Origen</label>
                <select
                  className="form-select"
                  value={formData.origen}
                  onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
                >
                  <option value="Web">Web</option>
                  <option value="Call Center">Call Center</option>
                </select>
              </div>
              <div className="form-group">
                <label>Servicio Solicitado</label>
                <select
                  className="form-select"
                  value={formData.servicio}
                  onChange={(e) => handleServicioChange(e.target.value)}
                >
                  <option value="Cámaras Residenciales">Cámaras Residenciales</option>
                  <option value="Monitoreo 24/7">Monitoreo 24/7</option>
                  <option value="Control de Acceso Rfid">Control de Acceso Rfid</option>
                  <option value="Alarma de Incendios + CCT">Alarma de Incendios + CCT</option>
                </select>
              </div>
            </div>

            <div className="form-group">
                <label>Zona de Instalación (Venezuela)</label>
                <ZonaVe
                  value={{ estado: formData.estado, municipio: formData.municipio, ciudad: formData.ciudad }}
                  onChange={(z) => setFormData({ ...formData, ...z })}
                />
              </div>
              <div className="form-group">
                <label>Monto Total (USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Monto en dólares"
                  className="form-input"
                  value={formData.total}
                  onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                  required
                />
              </div>

            {/* Líneas de pedido (reservan stock del inventario) */}
            <div style={{ padding: '16px', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--outline-variant)', marginBottom: 'var(--stack-lg)' }}>
              <span className="label-caps text-secondary" style={{ display: 'block', marginBottom: '12px' }}>
                Equipos a Reservar (Detalle de Pedido)
              </span>

              {lineas.length === 0 && (
                <p className="body-sm text-on-surface-variant" style={{ marginBottom: '10px', fontSize: '12px' }}>
                  Sin líneas. Al validar se reservará el equipo sugerido para el servicio o podrá agregarlos manualmente.
                </p>
              )}

              {lineas.map((linea, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <select
                    className="form-select"
                    style={{ flex: 1, padding: '8px 12px' }}
                    value={linea.id_equipo}
                    onChange={(e) => {
                      const item = inventory.find((i) => String(i.dbId) === e.target.value);
                      updateLinea(index, 'id_equipo', item?.dbId);
                      updateLinea(index, 'codigo', item?.id);
                      updateLinea(index, 'name', item?.name);
                    }}
                  >
                    {inventory.map((item) => (
                      <option key={item.dbId} value={item.dbId}>
                        {item.name} ({item.id}) — Stock: {item.stock}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    style={{ width: '70px', padding: '8px' }}
                    value={linea.cantidad}
                    onChange={(e) => updateLinea(index, 'cantidad', Math.max(1, Number(e.target.value)))}
                  />
                  <button type="button" className="icon-btn" aria-label="Eliminar línea" onClick={() => removeLinea(index)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                  </button>
                </div>
              ))}

              <button type="button" className="btn-ghost" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={addLinea}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>add_circle</span>
                Agregar equipo
              </button>
            </div>

            {/* Algorithm inputs simulation */}
            <div style={{ padding: '16px', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--outline-variant)', marginBottom: 'var(--stack-lg)' }}>
              <span className="label-caps text-secondary" style={{ display: 'block', marginBottom: '12px' }}>Parámetros de Validación Automática</span>

              <div className="grid-2" style={{ gap: '12px', marginBottom: '0' }}>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '12px' }}>¿Factibilidad Técnica (Fibra)?</label>
                  <select
                    className="form-select"
                    value={formData.coberturaFibra}
                    onChange={(e) => setFormData({ ...formData, coberturaFibra: e.target.value })}
                    style={{ padding: '8px 12px' }}
                  >
                    <option value="SI">Sí (Hay cobertura)</option>
                    <option value="NO">No (Fallo de Factibilidad)</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '12px' }}>Verificación Financiera (Tarjeta)</label>
                  <select
                    className="form-select"
                    value={formData.tarjetaLimite}
                    onChange={(e) => setFormData({ ...formData, tarjetaLimite: e.target.value })}
                    style={{ padding: '8px 12px' }}
                  >
                    <option value="SUFICIENTE">Fondos Suficientes</option>
                    <option value="INSUFICIENTE">Rechazar (error_pago)</option>
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
              <span className="material-symbols-outlined">{saving ? 'hourglass_top' : 'verified_user'}</span>
              {saving ? 'Registrando...' : 'Validar y Registrar Pedido'}
            </button>
          </form>
        </section>

        {/* Orders Listing status */}
        <section className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
          <div className="card-header-border">
            <h2 className="headline-md text-on-surface">Historial de Órdenes Evaluadas</h2>
            <span className="badge badge-info">{orders.length} registros</span>
          </div>

          <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID / Canal</th>
                  <th>Cliente</th>
                  <th>Factibilidad</th>
                  <th>Pago</th>
                  <th>Estado Final</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className="body-sm text-on-surface" style={{ fontWeight: 'bold', display: 'block' }}>{order.id}</span>
                      <span className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>{order.origen}</span>
                    </td>
                    <td>
                      <span className="body-sm text-on-surface" style={{ display: 'block' }}>{order.cliente}</span>
                      <span className="label-caps text-primary" style={{ fontSize: '10px' }}>{formatMoney(order.total)}</span>
                      {order.zona && <span className="label-caps text-on-surface-variant" style={{ fontSize: '9px', display: 'block' }}>{order.zona}</span>}
                    </td>
                    <td>
                      <span className={`badge ${order.factibilidad === 'Aprobada' ? 'badge-success' : 'badge-error'}`}>
                        {order.factibilidad}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${order.pagoStatus === 'Aprobado' ? 'badge-success' : 'badge-error'}`}>
                        {order.pagoStatus}
                      </span>
                    </td>
                    <td>
                      {order.flag_aprobado ? (
                        <span className="badge badge-success" style={{ fontWeight: 'bold' }}>
                          Autorizado
                        </span>
                      ) : (
                        <div>
                          <span className="badge badge-error" style={{ display: 'block', textAlign: 'center', marginBottom: '2px' }}>
                            Rechazado
                          </span>
                          <span className="label-caps text-error" style={{ fontSize: '9px', display: 'block', textTransform: 'none' }}>
                            {order.error_pago ? 'Error de pago' : 'Error de factibilidad'}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
