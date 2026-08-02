// =============================================================================
// UTILIDADES DE REPORTES
// Generación en el cliente de: PDF (jsPDF), XLS (SpreadsheetML) y CSV.
// =============================================================================
import { jsPDF } from 'jspdf'
import { formatMoney } from './format'

// ---- Descarga genérica -----------------------------------------------------
function descargarBlob(nombre, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  requestAnimationFrame(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}

// ---- CSV (con BOM para Excel y separador de punto - estilo es-VE) ----------
export function exportarCSV(nombre, columnas, filas) {
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lineas = [columnas.map(esc).join(';')]
  filas.forEach((f) => lineas.push(f.map(esc).join(';')))
  const contenido = '\uFEFF' + lineas.join('\r\n')
  descargarBlob(nombre.endsWith('.csv') ? nombre : `${nombre}.csv`, new Blob([contenido], { type: 'text/csv;charset=utf-8;' }))
}

// ---- XLS mediante formato SpreadsheetXML 2003 (abre en Excel) --------------
export function exportarXLSX(nombre, columnas, filas) {
  const xml = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  let filasXml = '<Row><Cell><Data ss:Type="String">SIT · TecnoInnova — Empresa de Seguridad</Data></Cell></Row>'
  columnas.forEach((c) => {
    filasXml += `<Cell ss:StyleID="head"><Data ss:Type="String">${xml(c)}</Data></Cell>`
  })
  filasXml += '</Row>'
  filas.forEach((f) => {
    filasXml += '<Row>'
    f.forEach((v) => {
      const esNumero = typeof v === 'number' && !Number.isNaN(v)
      filasXml += `<Cell><Data ss:Type="${esNumero ? 'Number' : 'String'}">${esNumero ? v : xml(v)}</Data></Cell>`
    })
    filasXml += '</Row>'
  })

  const wb =
    `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Styles>
 <Style ss:ID="head">
  <Font ss:Bold="1" ss:Color="#3E5C9A"/>
 </Style>
</Styles>
<Worksheet ss:Name="${xml(nombre.replace(/\.xlsx?$/, ''))}">
<Table>
${filasXml}
</Table>
</Worksheet>
</Workbook>`

  descargarBlob(`${nombre}.xls`, new Blob([wb], { type: 'application/vnd.ms-excel' }))
}

// ---- Cabecera de página para PDF (jsPDF) -----------------------------------
function cabeceraPDF(doc, titulo) {
  doc.setFillColor(11, 19, 38)
  doc.rect(0, 0, 210, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('SIT Enterprise Security', 15, 16)
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Sistema Integrado TecnoInnova · Reportes', 15, 23)
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(180, 220, 255)
  doc.text(titulo, 15, 33)
}

// ---- Reporte semanal de pedidos (.PDF) ----
export function generarPdfReporteSemanal({ filas, desde, hasta }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', putOnlyUsedFonts: false })
  cabeceraPDF(doc, 'Reporte Semanal de Pedidos')
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Ejecutado: ${new Date().toLocaleDateString('es-VE')} · Rango: ${desde} → ${hasta}`, 15, 47)

  // Tabla
  doc.setFont('Helvetica', 'bold')
  doc.setFillColor(218, 226, 253)
  doc.rect(15, 53, 180, 9, 'F')
  ;['Día', 'Servicios', 'Ventas', 'Monto (USD)'].forEach((h, i) => {
    const x = 18 + i * 45
    doc.setTextColor(0, 0, 0)
    doc.text(h, x, 59)
  })

  doc.setFont('Helvetica', 'normal')
  let y = 66
  filas.forEach((f, i) => {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
    if (i % 2 === 1) {
      doc.setFillColor(245, 247, 252)
      doc.rect(15, y - 5, 190, 8, 'F')
    }
    doc.setTextColor(40, 40, 40)
    doc.text(f.dia, 18, y)
    doc.text(String(f.servicios), 63, y)
    doc.text(String(f.pedidos), 108, y)
    doc.text(formatMoney(f.monto), 153, y)
    y += 8
  })

  doc.save('Reporte_semanal_pedidos.pdf')
}

// ---- Genera el PDF de una factura (.PDF) ----
export function generarPdfFactura(inv) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFillColor(11, 19, 38)
  doc.rect(0, 0, 210, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('Helvetica', 'bold')
  doc.text('SIT ENTERPRISE SECURITY', 15, 18)
  doc.setFontSize(10)
  doc.setFont('Helvetica', 'normal')
  doc.text('Sistema Integrado TecnoInnova S.A.', 15, 25)
  doc.text('Factura Electrónica B', 15, 30)
  doc.setTextColor(230, 230, 230)
  doc.text(`Nro Factura: ${inv.id}`, 140, 18)
  doc.text(`Fecha: ${inv.fecha}`, 140, 25)
  doc.text(`Orden: ${inv.orderId || ''}`, 140, 32)

  doc.setFillColor(240, 240, 240)
  doc.rect(15, 50, 180, 25, 'F')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.setFont('Helvetica', 'bold')
  doc.text(`CLIENTE: ${inv.cliente.toUpperCase()}`, 20, 56)
  doc.setFont('Helvetica', 'normal')
  doc.text(`CUIT: ${inv.cuit}`, 20, 62)
  doc.text('Condición IVA: Responsable Inscripto', 20, 68)

  doc.setFillColor(194, 198, 216)
  doc.rect(15, 85, 180, 10, 'F')
  doc.setFont('Helvetica', 'bold')
  doc.text('Descripción del Servicio', 20, 91)
  doc.text('Importe (USD)', 150, 91)

  doc.setFont('Helvetica', 'normal')
  ;(inv.items || []).forEach((item, index) => {
    const y = 105 + index * 10
    doc.text(String(item), 20, y)
  })

  doc.setDrawColor(150, 150, 150)
  doc.line(15, 140, 195, 140)
  doc.setFontSize(14)
  doc.setFont('Helvetica', 'bold')
  doc.text('TOTAL FACTURADO:', 100, 155)
  doc.text(formatMoney(inv.total), 150, 155)

  doc.save(`Factura-${inv.id}-${String(inv.cliente || '').replace(/\s+/g, '-')}.pdf`)
}

// ---- PDF con las consultas SQL (memoria a entregar) ----
export function generarPdfConsultaSQL(queries) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  cabeceraPDF(doc, 'Reportes · Consultas SQL en Base de Datos')

  let y = 52
  queries.forEach((q, idx) => {
    if (y > 250) {
      doc.addPage()
      y = 20
    }
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(11, 19, 38)
    doc.rect(15, y - 5, 180, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.text(`${idx + 1}. ${q.modulo}`, 18, y)
    y += 12

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.text(q.descripcion, 15, y)
    y += 6

    doc.setFont('Courier', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(30, 30, 30)
    const lines = doc.splitTextToSize(q.sql, 180)
    lines.forEach((l) => {
      if (y > 278) {
        doc.addPage()
        y = 18
      }
      doc.text(l, 15, y)
      y += 4
    })
    y += 6
  })

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Memoria técnica de consultas · SIT Enterprise Security', 15, 285)
  doc.save('Reportes_consultas_SQL.pdf')
}