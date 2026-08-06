// =============================================================================
// MULTIMONEDA (USD / VES-BCV / IGTF) - SIT Enterprise Security
// -----------------------------------------------------------------------------
// - Tasa oficial del BCV vía /api/tasa-bcv (cacheada en localStorage por día).
// - Cálculo del IGTF (Impuesto a Grandes Transacciones Financieras, 3%)
//   para facturas emitidas en dólares, requisito legal venezolano.
// =============================================================================

export const IGTF_RATE = 0.03

const STORAGE_KEY = 'sit_tasa_bcv'
const DEFAULT_TASA = 36.5

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.tasa) return null
    return parsed
  } catch {
    return null
  }
}

function writeStored(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // almacenamiento no disponible: se ignora
  }
}

// Devuelve { tasa, fecha, fuente } de la tasa BCV del día. Nunca lanza:
// si el servicio falla, reutiliza el valor cacheado o un referencial.
export async function getTasaBCV() {
  const hoy = todayISO()
  const stored = readStored()
  if (stored && stored.fecha === hoy) return stored

  try {
    const res = await fetch('/api/tasa-bcv', { signal: AbortSignal.timeout(8000) })
    if (res.ok) {
      const data = await res.json()
      const val = {
        tasa: Number(data.tasa),
        fecha: (data.fecha || hoy).slice(0, 10),
        fuente: data.fuente || 'BCV',
      }
      if (Number.isFinite(val.tasa) && val.tasa > 0) {
        writeStored(val)
        return val
      }
    }
  } catch {
    // sin red o servicio caído: se continúa con lo almacenado
  }

  if (stored) return stored
  return { tasa: DEFAULT_TASA, fecha: hoy, fuente: 'referencial' }
}

// IGTF 3% sobre el monto en USD (base gravable de la transacción).
export function calcularIGTF(usd, tasa) {
  const base = Number(usd) || 0
  const rate = Number(tasa) || 0
  const igtfUsd = base * IGTF_RATE
  const subtotalBs = rate ? base * rate : 0
  const igtfBs = rate ? igtfUsd * rate : 0
  return {
    subtotalUsd: base,
    igtfUsd,
    totalUsd: base + igtfUsd,
    subtotalBs,
    igtfBs,
    totalBs: (base + igtfUsd) * rate,
    tasa: rate,
  }
}
