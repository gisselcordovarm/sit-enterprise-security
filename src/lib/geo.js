// =============================================================================
// GEOLOCALIZACIÓN Y GEOGRÁFICA (SIT Enterprise Security)
// Coordenadas aproximadas (lat/lng) de estados y ciudades de Venezuela para el
// mapa interactivo (Leaflet/OSM) y el algoritmo de ruteo óptimo.
// -----------------------------------------------------------------------------
// Las zonas del sistema se guardan como texto "Ciudad, Municipio, Estado"
// (ver zonasVenezuela.js). Esta capa las traduce a coordenadas para:
//   - Ubicar la instalación del cliente en el mapa.
//   - Posición estimada del técnico (base/zona asignada).
//   - Distancia real (haversine) y ruta óptima entre puntos.
// =============================================================================

// Centroides aproximados por estado (fallback cuando no hay ciudad conocida).
export const ESTADO_CENTROIDES = {
  'Distrito Capital': { lat: 10.4806, lng: -66.9036 },
  'Vargas': { lat: 10.6, lng: -66.9 },
  'La Guaira': { lat: 10.6, lng: -66.9 },
  Miranda: { lat: 10.2, lng: -66.5 },
  Anzoátegui: { lat: 9.6, lng: -64.4 },
  Lara: { lat: 10.07, lng: -69.32 },
  Zulia: { lat: 10.5, lng: -71.5 },
  Carabobo: { lat: 10.2, lng: -68.0 },
  Aragua: { lat: 10.15, lng: -67.5 },
  Bolívar: { lat: 7.5, lng: -63.5 },
  'Ciudad Guayana – Bolívar': { lat: 8.35, lng: -62.65 },
  Monagas: { lat: 9.5, lng: -63.2 },
  Sucre: { lat: 10.5, lng: -63.5 },
  'Nueva Esparta': { lat: 10.95, lng: -63.9 },
  Falcón: { lat: 11.2, lng: -69.8 },
  Táchira: { lat: 7.9, lng: -72.0 },
  Mérida: { lat: 8.5, lng: -71.2 },
  Trujillo: { lat: 9.4, lng: -70.4 },
  Barinas: { lat: 8.6, lng: -70.0 },
  Apure: { lat: 7.6, lng: -68.5 },
  Cojedes: { lat: 9.4, lng: -68.5 },
  Guárico: { lat: 8.7, lng: -66.5 },
  Portuguesa: { lat: 9.1, lng: -69.3 },
  Yaracuy: { lat: 10.4, lng: -68.7 },
  Amazonas: { lat: 4.0, lng: -66.0 },
  'Delta Amacuro': { lat: 9.0, lng: -61.5 },
}

// Coordenadas de las principales ciudades usadas por la app.
export const CIUDAD_COORDS = {
  Caracas: { lat: 10.4806, lng: -66.9036 },
  'El Paraíso': { lat: 10.4767, lng: -66.9381 },
  'San Bernardino': { lat: 10.5144, lng: -66.9213 },
  Catia: { lat: 10.5069, lng: -66.9405 },
  Chacao: { lat: 10.4953, lng: -66.8531 },
  Baruta: { lat: 10.4376, lng: -66.8681 },
  'Las Mercedes': { lat: 10.4881, lng: -66.8548 },
  Petare: { lat: 10.4744, lng: -66.8101 },
  'La Urbina': { lat: 10.4863, lng: -66.808 },
  'Los Teques': { lat: 10.3453, lng: -67.0406 },
  Charallave: { lat: 10.2423, lng: -66.8575 },
  Cúa: { lat: 10.166, lng: -66.8875 },
  'San Francisco de Yare': { lat: 10.178, lng: -66.748 },
  'San José de los Altos': { lat: 10.386, lng: -67.022 },
  Maracaibo: { lat: 10.6316, lng: -71.6407 },
  'San Francisco': { lat: 10.562, lng: -71.652 },
  Cabimas: { lat: 10.399, lng: -71.44 },
  'Ciudad Ojeda': { lat: 10.2, lng: -71.3 },
  Valencia: { lat: 10.162, lng: -68.0077 },
  Naguanagua: { lat: 10.254, lng: -68.007 },
  Guacara: { lat: 10.228, lng: -67.879 },
  'Puerto Cabello': { lat: 10.473, lng: -68.012 },
  'Los Guayos': { lat: 10.178, lng: -67.932 },
  Maracay: { lat: 10.2469, lng: -67.5958 },
  Turmero: { lat: 10.229, lng: -67.474 },
  Cagua: { lat: 10.186, lng: -67.459 },
  'Ciudad Bolívar': { lat: 8.129, lng: -63.54 },
  'Ciudad Guayana': { lat: 8.358, lng: -62.651 },
  'Puerto Ordaz': { lat: 8.293, lng: -62.684 },
  Guasipati: { lat: 7.474, lng: -61.9 },
  Barquisimeto: { lat: 10.0677, lng: -69.3474 },
  Cabudare: { lat: 10.017, lng: -69.263 },
  Quíbor: { lat: 9.926, lng: -69.617 },
  Barcelona: { lat: 10.1333, lng: -64.701 },
  'Puerto La Cruz': { lat: 10.218, lng: -64.632 },
  Lechería: { lat: 10.195, lng: -64.693 },
  'El Tigre': { lat: 8.89, lng: -64.252 },
  Anaco: { lat: 9.433, lng: -64.464 },
  Maturín: { lat: 9.7457, lng: -63.183 },
  'Punta de Mata': { lat: 9.68, lng: -63.62 },
  Cumaná: { lat: 10.456, lng: -64.182 },
  Carúpano: { lat: 10.668, lng: -63.24 },
  Irapa: { lat: 10.572, lng: -62.578 },
  Pampatar: { lat: 10.998, lng: -63.861 },
  Porlamar: { lat: 10.956, lng: -63.848 },
  'La Asunción': { lat: 11.029, lng: -63.862 },
  Coro: { lat: 11.402, lng: -69.668 },
  'Punto Fijo': { lat: 11.7, lng: -70.2 },
  Capatárida: { lat: 11.18, lng: -70.617 },
  'San Cristóbal': { lat: 7.768, lng: -72.225 },
  'Capacho Nuevo': { lat: 7.82, lng: -72.3 },
  'Capacho Viejo': { lat: 7.835, lng: -72.32 },
  'San Josecito': { lat: 7.72, lng: -72.24 },
  Mérida: { lat: 8.598, lng: -71.144 },
  Ejido: { lat: 8.546, lng: -71.237 },
  Lourdes: { lat: 8.66, lng: -71.26 },
  Trujillo: { lat: 9.366, lng: -70.433 },
  Boconó: { lat: 9.254, lng: -70.585 },
  Valera: { lat: 9.317, lng: -70.604 },
  Barinas: { lat: 8.622, lng: -70.207 },
  Barrancos: { lat: 8.5, lng: -70.0 },
  Socopó: { lat: 8.23, lng: -70.81 },
  'San Fernando de Apure': { lat: 7.883, lng: -67.473 },
  Achaguas: { lat: 7.78, lng: -68.22 },
  'La Guaira': { lat: 10.603, lng: -66.933 },
  Maiquetía: { lat: 10.596, lng: -66.971 },
  Carayaca: { lat: 10.528, lng: -67.085 },
  'San Felix': { lat: 8.326, lng: -62.672 },
  Uracoa: { lat: 8.98, lng: -62.42 },
  Capacho: { lat: 7.82, lng: -72.3 },
}

// Traduce un texto de zona ("Ciudad, Municipio, Estado") a coordenadas.
export function coordsDeZona(zona) {
  if (!zona) return null
  const parts = String(zona).split(',').map((s) => s.trim()).filter(Boolean)
  const ciudad = parts[0] || ''
  const estado = parts[parts.length - 1] || ''
  if (CIUDAD_COORDS[ciudad]) return { lat: CIUDAD_COORDS[ciudad].lat, lng: CIUDAD_COORDS[ciudad].lng }
  if (ESTADO_CENTROIDES[estado]) return { lat: ESTADO_CENTROIDES[estado].lat, lng: ESTADO_CENTROIDES[estado].lng }
  if (ESTADO_CENTROIDES[ciudad]) return { lat: ESTADO_CENTROIDES[ciudad].lat, lng: ESTADO_CENTROIDES[ciudad].lng }
  return null
}

// Distancia en kilómetros (fórmula del haversine).
export function haversineKm(a, b) {
  if (!a || !b) return null
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Distancia entre dos zonas por nombre.
export function distanciaEntreZonas(zonaA, zonaB) {
  return haversineKm(coordsDeZona(zonaA), coordsDeZona(zonaB))
}

// Devuelve el técnico activo más cercano (por distancia real) a una zona.
export function tecnicoMasCercano(zona, tecnicos) {
  const destino = coordsDeZona(zona)
  if (!destino || !Array.isArray(tecnicos) || tecnicos.length === 0) return null
  let best = null
  for (const t of tecnicos) {
    if (t.status && t.status !== 'Activo') continue
    const c = coordsDeZona(t.zone)
    if (!c) continue
    const dist = haversineKm(destino, c)
    if (!best || dist < best.dist) best = { tecnico: t, dist, coords: c }
  }
  return best
}

// Estimación de tiempo de traslado (velocidad media 45 km/h en zona urbana).
export function etaMinutos(distKm) {
  if (distKm == null) return null
  return Math.max(5, Math.round((distKm / 45) * 60))
}
