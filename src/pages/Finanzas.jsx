import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import DataStatus from '../components/common/DataStatus';
import {
  fetchFacturas, fetchFacturables, generarFactura,
  fetchLogs, registrarLog,
} from '../lib/data';
import { formatMoney } from '../lib/format';

export default function Finanzas() {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [facturables, setFacturables] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [financeLogs, setFinanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveError, setLiveError] = useState(null);
  const [emailAlert, setEmailAlert] = useState(null);

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

  // PDF Generator using jsPDF
  const generatePDF = (inv) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Header Brand
      doc.setFillColor(11, 19, 38);
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('SIT ENTERPRISE SECURITY', 15, 18);

      doc.setFontSize(10);
      doc.text('Sistema Integrado TecnoInnova S.A.', 15, 25);
      doc.text('Factura Electrónica B', 15, 30);

      // Invoice metadata
      doc.setTextColor(230, 230, 230);
      doc.text(`Nro Factura: ${inv.id}`, 140, 18);
      doc.text(`Fecha: ${inv.fecha}`, 140, 25);
      doc.text(`Orden: ${inv.orderId}`, 140, 32);

      // Customer Info
      doc.setFillColor(240, 240, 240);
      doc.rect(15, 50, 180, 25, 'F');

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`CLIENTE: ${inv.cliente.toUpperCase()}`, 20, 56);
      doc.text(`CUIT: ${inv.cuit}`, 20, 62);
      doc.text('Condición IVA: Responsable Inscripto', 20, 68);

      // Items Table header
      doc.setFillColor(194, 198, 216);
      doc.rect(15, 85, 180, 10, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFont('Helvetica', 'bold');
      doc.text('Descripción del Servicio', 20, 91);
      doc.text('Importe (USD)', 150, 91);

      // Items Row
      doc.setFont('Helvetica', 'normal');
      inv.items.forEach((item, index) => {
        const y = 105 + index * 10;
        doc.text(item, 20, y);
      });

      // Divider line
      doc.setDrawColor(150, 150, 150);
      doc.line(15, 140, 195, 140);

      // Total Box
      doc.setFontSize(14);
      doc.setFont('Helvetica', 'bold');
      doc.text('TOTAL FACTURADO:', 95, 155);
      doc.text(formatMoney(inv.total), 150, 155);

      doc.save(`Factura-${inv.id}-${inv.cliente.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
    }
  };

  const addLog = async (tipo, descripcion, monto = 0) => {
    const log = await registrarLog({ tipo, descripcion, monto });
    setFinanceLogs((prev) => [log, ...prev]);
  };

  // Generar factura para un pedido facturable (estado Instalado)
  const handleGenerateInvoice = async (facturable) => {
    const invoice = await generarFactura(facturable);
    setInvoices((prev) => [invoice, ...prev]);
    setFacturables((prev) => prev.filter((f) => f.id_pedido !== facturable.id_pedido));
    generatePDF(invoice);
    await addLog('Ajuste', `Exportación PDF Factura ${invoice.id}`, 0);
  };

  // Exportar PDF de una factura existente
  const handleExportPDF = async (inv) => {
    generatePDF(inv);
    await addLog('Ajuste', `Exportación PDF Factura ${inv.id}`, 0);
  };

  // Simulate Sending Invoice via Email
  const simulateSendEmail = (inv) => {
    setIsSendingEmail(true);
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
        <p className="body-md text-on-surface-variant">Generación automática de facturas PDF, simulación de despacho por correo y libro contable digital.</p>
      </div>

      <DataStatus loading={loading} liveError={liveError} />

      {emailAlert && (
        <div className={`alert-item alert-item--${emailAlert.type}`} style={{ marginBottom: '20px' }}>
          <span className="material-symbols-outlined">mail</span>
          <div className="alert-content">
            <p className="body-sm text-on-surface">{emailAlert.msg}</p>
          </div>
          <button className="icon-btn" onClick={() => setEmailAlert(null)} style={{ marginLeft: 'auto' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

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
                      onClick={() => handleGenerateInvoice(fac)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                      Generar Factura + PDF
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
                    <p className="body-sm text-on-surface-variant">Orden vinculada: {inv.orderId} | CUIT: {inv.cuit}</p>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportPDF(inv);
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                      Generar Factura PDF
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
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
