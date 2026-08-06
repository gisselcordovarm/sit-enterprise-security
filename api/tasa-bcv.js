// =============================================================================
// TASA OFICIAL BCV (USD/VES) - función serverless de Vercel
// -----------------------------------------------------------------------------
// Obtiene la tasa oficial del Banco Central de Venezuela. Fuentes:
//   1) Canal oficial BCV (https://www.bcv.org.ve/cws2/ws_tasas_bcv.php, XML).
//   2) Espejo del BCV vía dolarapi (https://ve.dolarapi.com/v1/dolares/oficial).
// Si ambas fallan responde 502 con el último valor cacheado si existe.
// Se cachea en la instancia (1 h) + HTTP cache para no saturar las fuentes.
// No requiere claves: la tasa es pública.
// =============================================================================

let cache = null // { ts, data }

const TTL_MS = 60 * 60 * 1000 // 1 hora

function parseBcvXml(xml) {
  // El XML del BCV trae <ds_tasa>36.50</ds_tasa> (o con coma: 36,50).
  const m = xml.match(/<ds_tasa>\s*([\d.,]+)\s*<\/ds_tasa>/i)
  if (!m) return null
  const n = Number(String(m[1]).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

async function fetchTasa() {
  // 1) Canal oficial BCV
  try {
    const r = await fetch('https://www.bcv.org.ve/cws2/ws_tasas_bcv.php', {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'SIT-Enterprise-Security/1.0' },
    })
    if (r.ok) {
      const xml = await r.text()
      const tasa = parseBcvXml(xml)
      if (tasa) {
        return { tasa, fecha: new Date().toISOString().slice(0, 10), fuente: 'BCV (oficial)' }
      }
    }
  } catch (e) {
    console.warn('[tasa-bcv] BCV oficial no disponible:', e?.message)
  }

  // 2) Espejo del BCV (dolarapi)
  try {
    const r = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'SIT-Enterprise-Security/1.0' },
    })
    if (r.ok) {
      const j = await r.json()
      const tasa = Number(j?.promedio ?? j?.precio)
      if (Number.isFinite(tasa) && tasa > 0) {
        const fecha = (j?.fechaActualizacion || j?.fecha || new Date().toISOString()).slice(0, 10)
        return { tasa, fecha, fuente: 'espejo BCV (dolarapi)' }
      }
    }
  } catch (e) {
    console.warn('[tasa-bcv] espejo dolarapi no disponible:', e?.message)
  }

  return null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')

  if (cache && Date.now() - cache.ts < TTL_MS) {
    return res.status(200).json(cache.data)
  }

  const data = await fetchTasa()
  if (data) {
    cache = { ts: Date.now(), data }
    return res.status(200).json(data)
  }

  if (cache?.data) {
    return res.status(200).json({ ...cache.data, fuente: `${cache.data.fuente} (cache)` })
  }

  return res.status(502).json({ error: 'No se pudo obtener la tasa BCV en este momento.' })
}
