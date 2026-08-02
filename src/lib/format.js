// =============================================================================
// FORMATO MONETARIO DE VENEZUELA (montos en dólares $)
// Convención usada: "$1.234.567,89" (separador de miles: punto, decimales: coma).
// =============================================================================

const veFormatter = new Intl.NumberFormat('es-VE', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '$0,00'
  return veFormatter.format(n).replace(/\u00A0/g, ' ').trim()
}

// Versión sin decimales cuando el valor es entero (más limpio en tablas).
export function formatMoneyCompact(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '$0'
  const int = Math.round(n)
  if (Math.abs(n - int) < 0.005) {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(int).replace(/\u00A0/g, ' ').trim()
  }
  return formatMoney(n)
}