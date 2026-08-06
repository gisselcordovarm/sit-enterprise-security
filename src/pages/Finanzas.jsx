import { useState, useEffect } from 'react';
import DataStatus from '../components/common/DataStatus';
import {
  fetchFacturas, fetchFacturables, generarFactura,
  fetchLogs, registrarLog,
} from '../lib/data';
import { formatMoney } from '../lib/format';
import { generarPdfFactura } from '../lib/reportes';
import { getTasaBCV } from '../lib/multimoneda';

export default function Finanzas() {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [facturables, setFacturables] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [financeLogs, setFinanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveError, setLiveError] = useState(null);
  const [emailAlert, setEmailAlert] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);
  const [tasaInfo, setTasaInfo] = useState(null);
  const [tasaLoading, setTasaLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([fetchFacturables(), fetchFacturas(), fetchLogs()])
      .then(([fac, inv, logs]) => {
        if (!active) return;
        setFacturables(fac);
        setInvoices(inv);
        setFinanceLogs(logs);
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

  // Tasa oficial BCV del día (cacheada 24 h en el navegador).
  useEffect(() => {
    let active = true;
    getTasaBCV()
      .then((t) => { if (active) setTasaInfo(t); })
      .catch(() => {})
      .finally(() => { if (active) setTasaLoading(false); });
    return () => { active = false; };
  }, []);

  // La generación del PDF de factura usa el generador compartido (lib/reportes.js).

  const addLog = async (tipo, descripcion, monto = 0) => {
    try {
      const log = await registrarLog({ tipo, descripcion, monto });
      setFinanceLogs((prev) => [log, ...prev]);
    } catch (err) {
      console.error('No se pudo registrar el movimiento:', err);
    }
  };

  // Generar factura para un pedido facturable (estado Instalado)
  const handleGenerateInvoice = async (facturable) => {
    if (generatingId !== null) return;
    setGeneratingId(facturable.id_pedido);
    setEmailAlert(null);
    try {
      const invoice = await generarFactura(facturable);
      setInvoices((prev) => [invoice, ...prev]);
      setFacturables((prev) => prev.filter((f) => f.id_pedido !== facturable.id_pedido));
      generarPdfFactura(invoice);
      await addLog('Ajuste', `Exportación PDF Factura ${invoice.id}`, 0);
    } catch (e) {
      console.error('Error al generar factura:', e);
      setEmailAlert({
        type: 'error',
        msg: `No se pudo generar la factura para ${facturable.cliente}. Verifica la base de datos e intenta de nuevo.`,
      });
    } finally {
      setGeneratingId(null);
    }
  };

  // Exportar PDF de una factura existente
  const handleExportPDF = async (inv) => {
    if (generatingId !== null) return;
    setGeneratingId(inv.id);
    setEmailAlert(null);
    try {
      generarPdfFactura(inv);
      await addLog('Ajuste', `Exportación PDF Factura ${inv.id}`, 0);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      setEmailAlert({ type: 'error', msg: `No se pudo exportar el PDF de la factura ${inv.id}.` });
    } finally {
      setGeneratingId(null);
    }
  };

  // Simulate Sending Invoice via Email
  const simulateSendEmail = async (inv) => {
    if (isSendingEmail) return;
    if (!inv.rif) {
      setEmailAlert({ type: 'error', msg: `La factura ${inv.id} no tiene RIF registrado. No se puede enviar.` });
      return;
    }
    setIsSendingEmail(true);
    setEmailAlert(null);
    await addLog('Pago', `Envío de factura ${inv.id} por email a ${inv.cliente}`, 0);
    setTimeout(() => {
      setIsSendingEmail(false);
      setEmailAlert({
        type: 'success',
        msg: `Factura ${inv.id} enviada correctamente a la casilla facturacion@${inv.cliente.toLowerCase().replace(/\s+/g, '')}.com`,
      });
    }, 1500);
  };

  return (
    <div>
      {/* Page Title */}
      <div style={{ marginBottom: 'var(--stack-lg)' }}>
        <h1 className="display-lg text-on-surface">Administración y Finanzas</h1>
      </div>

      <DataStatus loading={loading} liveError={liveError} />

      {emailAlert && (
        <div className={`alert-item alert-item--${emailAlert.type}`} style={{ marginBottom: '20px' }}>
          <span className="material-symbols-outlined">mail</span>
          <div className="alert-content">
            <p className="body-sm text-on-surface">{emailAlert.msg}</p>
          </div>
          <button className="icon-btn" aria-label="Cerrar aviso" onClick={() => setEmailAlert(null)} style={{ marginLeft: 'auto' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Tasa BCV oficial + IGTF */}
      <section className="card glass-panel" style={{ background: 'var(--glass-bg)', marginBottom: 'var(--stack-lg)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>currency_exchange</span>
              <h2 className="headline-md text-on-surface">Tasa BCV Oficial (USD/VES)</h2>
              <span className={`badge ${tasaLoading ? 'badge-pending' : 'badge-success'}`}>
                {tasaLoading ? 'Consultando...' : 'En vivo'}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {tasaLoading ? (
              <span className="label-caps text-on-surface-variant">Obteniendo tasa del BCV…</span>
            ) : (
              <>
                <span className="display-lg text-success" style={{ display: 'block' }}>
                  Bs {Number(tasaInfo?.tasa || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="label-caps text-on-surface-variant">
                  {tasaInfo?.fecha} · {tasaInfo?.fuente}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="grid-2">
        {/* Pending Invoices for Generation */}
        <section className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
          <div className="card-header-border">
            <h2 className="headline-md text-on-surface">Comprobantes Listos para Facturar</h2>
            <span className="badge badge-info">{facturables.length} pendientes</span>
          </div>

          {facturables.length === 0 ? (
            <p className="body-sm text-success" style={{ padding: '12px 0' }}>
              No hay pedidos instalados pendientes de facturación.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {facturables.map((fac) => (
                <div
                  key={fac.id_pedido}
                  style={{
                    padding: '16px',
                    background: 'var(--surface-container-low)',
                    border: '1px solid var(--outline-variant)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <span className="badge badge-info" style={{ marginBottom: '6px' }}>SIT-{fac.id_pedido}</span>
                      <h3 className="body-md text-on-surface" style={{ fontWeight: 'bold' }}>{fac.cliente}</h3>
                      <p className="body-sm text-on-surface-variant">{fac.servicio}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="body-md text-success" style={{ fontWeight: 'bold', display: 'block' }}>
                        {formatMoney(fac.total)}
                      </span>
                      <span className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>Instalado</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      disabled={generatingId === fac.id_pedido}
                      onClick={() => handleGenerateInvoice(fac)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                      {generatingId === fac.id_pedido ? 'Generando...' : '+ PDF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card-header-border" style={{ marginTop: '20px' }}>
            <h2 className="headline-md text-on-surface">Facturas Emitidas</h2>
            <span className="badge badge-info">{invoices.length} emitidas</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {invoices.map((inv) => (
              <div
                key={inv.id}
                style={{
                  padding: '16px',
                  background: selectedInvoice?.id === inv.id ? 'var(--tint-primary)' : 'var(--surface-container-low)',
                  border: selectedInvoice?.id === inv.id ? '1px solid var(--primary)' : '1px solid var(--outline-variant)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedInvoice(inv)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="badge badge-info" style={{ marginBottom: '6px' }}>{inv.id}</span>
                    <h3 className="body-md text-on-surface" style={{ fontWeight: 'bold' }}>{inv.cliente}</h3>
                    <p className="body-sm text-on-surface-variant">Orden vinculada: {inv.orderId} | RIF: {inv.rif}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="body-md text-success" style={{ fontWeight: 'bold', display: 'block' }}>
                      {formatMoney(inv.total)}
                    </span>
                    <span className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>{inv.fecha}</span>
                  </div>
                </div>

                {selectedInvoice?.id === inv.id && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--outline-variant)', paddingTop: '12px' }}>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      disabled={generatingId === inv.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportPDF(inv);
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                      {generatingId === inv.id ? 'Exportando...' : 'Generar Factura PDF'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      disabled={isSendingEmail}
                      onClick={(e) => {
                        e.stopPropagation();
                        simulateSendEmail(inv);
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>mail</span>
                      {isSendingEmail ? 'Enviando...' : 'Enviar por Email'}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {invoices.length === 0 && (
              <p className="body-sm text-on-surface-variant" style={{ textAlign: 'center', padding: '16px' }}>No hay facturas emitidas todavía.</p>
            )}
          </div>
        </section>

        {/* Ledger Contabilidad Logs */}
        <section className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
          <div className="card-header-border">
            <h2 className="headline-md text-on-surface">Libro Diario de Transacciones</h2>
            <span className="badge badge-info">{financeLogs.length} asientos</span>
          </div>

          <div className="table-container" style={{ maxHeight: '520px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Detalle</th>
                  <th>Importe</th>
                  <th>Conciliado</th>
                </tr>
              </thead>
              <tbody>
                {financeLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="body-sm text-on-surface" style={{ fontWeight: 'bold', display: 'block' }}>{log.id}</span>
                      <span className="label-caps text-on-surface-variant" style={{ fontSize: '9px' }}>{log.fecha}</span>
                    </td>
                    <td>
                      <span className="body-sm text-on-surface" style={{ display: 'block' }}>{log.descripcion}</span>
                      <span className="badge badge-info" style={{ fontSize: '9px', padding: '1px 6px' }}>{log.tipo}</span>
                    </td>
                    <td>
                      <span className="body-sm" style={{ fontWeight: 'bold', color: log.monto > 0 ? 'var(--success)' : log.monto === 0 ? 'var(--on-surface-variant)' : 'var(--error)' }}>
                        {log.monto === 0 ? 'N/A' : formatMoney(log.monto)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${log.status === 'Verificado' ? 'badge-success' : 'badge-pending'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {financeLogs.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: '24px' }}>Sin movimientos registrados en el libro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
