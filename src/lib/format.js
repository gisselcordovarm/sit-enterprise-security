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

// =============================================================================
// TELÉFONO DE VENEZUELA (+58)
// Convención: +58 412 123-4567 (10 dígitos: 3 del código de área + 7 del número).
// =============================================================================

const VZLA_CODES = [412, 414, 416, 424, 426, 212, 201, 211, 213, 214, 222, 231, 235, 241, 243, 251, 252, 254, 257, 258, 261, 262, 263, 265, 266, 269, 271, 272, 273, 275, 276, 281, 283, 285, 286, 287, 288, 291, 292, 293, 294, 295, 296, 298]

// Convierte cualquier entrada en solo dígitos (acepta 11, 10 o ya con 58).
function digitsOnlyTel(value) {
  return String(value || '').replace(/\D/g, '')
}

// Normaliza los dígitos del teléfono quitando código de país (+58) y 0 inicial.
function normalizeDigits(value) {
  let d = digitsOnlyTel(value)
  if (d.startsWith('58')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return d
}

// Formatea progresivamente según lo escrito para mostrarlo como +58.
export function formatVzPhone(raw) {
  const d = normalizeDigits(raw).slice(0, 10)
  if (d.length === 0) return ''
  const area = d.slice(0, 3)
  const rest = d.slice(3)
  if (rest.length === 0) return `+58 ${area}`
  const core = rest.slice(0, 7)
  const sep = core.length > 4 ? `${core.slice(0, 4)}-${core.slice(4)}` : core
  return `+58 ${area} ${sep}`.trim()
}

// Devuelve { ok, error, value }. Valida y normaliza a +58 XX XXX-XXXX.
export function normalizeVzPhone(value) {
  const d = normalizeDigits(value)
  if (d.length !== 10) {
    return { ok: false, error: 'El teléfono venezolano debe tener el formato +58 412 123-4567.', value: formatVzPhone(value) }
  }
  const code = Number(d.slice(0, 3))
  if (!VZLA_CODES.includes(code)) {
    return { ok: false, error: `El código de área ${d.slice(0, 3)} no corresponde a Venezuela.`, value: formatVzPhone(value) }
  }
  return { ok: true, error: null, value: formatVzPhone(value) }
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