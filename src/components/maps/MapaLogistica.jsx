// =============================================================================
// MAPA LOGÍSTICO INTERACTIVO (Leaflet + OpenStreetMap)
// -----------------------------------------------------------------------------
// Muestra la vista geográfica de las operaciones:
//   - Marcadores de instalación del cliente (tareas pendientes de despacho).
//   - Posición de los técnicos (base/zona asignada) + GPS real del dispositivo
//     actual en tiempo real (navigator.geolocation.watchPosition).
//   - Ruta óptima por carretera (OSRM) con fallback a línea recta y cálculo de
//     distancia (haversine) y tiempo estimado de traslado.
// =============================================================================
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './mapas.css'
import { coordsDeZona, tecnicoMasCercano, etaMinutos } from '../../lib/geo'

const TEC_COLORS = ['#0b6e4f', '#1665a1', '#8a4baf', '#c2410c', '#1e40af', '#0f766e', '#b45309']

function initialDe(nombre) {
  return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function techIcon(nombre, color) {
  return L.divIcon({
    className: 'geo-marker-wrap',
    html: `<div class="geo-pin geo-pin--tech" style="--geo-color:${color}"><span>${initialDe(nombre)}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  })
}

const taskIcon = () =>
  L.divIcon({
    className: 'geo-marker-wrap',
    html: `<div class="geo-pin geo-pin--task"><span class="material-symbols-outlined">construction</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  })

const gpsIcon = () =>
  L.divIcon({
    className: 'geo-marker-wrap',
    html: `<div class="geo-pin geo-pin--gps"><span class="geo-gps-dot"></span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  })

// Ajusta el encuadre del mapa a los puntos visibles.
function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points || points.length === 0) return
    map.fitBounds(L.latLngBounds(points), { padding: [44, 44], maxZoom: 12 })
  }, [map, points])
  return null
}

// Centra el mapa en una posición dada (botón "Mi posición GPS").
function CentroEn({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 14, { duration: 0.8 })
  }, [map, target])
  return null
}

// Ruta real por carretera vía OSRM (servidor público de demostración). Si falla,
// se conserva la línea recta como respaldo.
async function fetchRutaReal(origin, dest) {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}` +
      `?overview=full&geometries=geojson&steps=false`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    if (!json?.routes?.[0]?.geometry?.coordinates?.length) return null
    return json.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
  } catch {
    return null
  }
}

export default function MapaLogistica({ tecnicos = [], tareas = [], onAsignar }) {
  const [rutasReales, setRutasReales] = useState({})
  const [miPos, setMiPos] = useState(null)
  const [centro, setCentro] = useState(null)
  const [gpsEstado, setGpsEstado] = useState('geolocation' in navigator ? 'buscando' : 'error')
  const [rutaActiva, setRutaActiva] = useState(null)

  // Ruta óptima base: cada tarea se asocia al técnico más cercano (distancia real).
  const baseRutas = useMemo(
    () =>
      (tareas || [])
        .map((t) => {
          const dest = coordsDeZona(t.zone)
          const cercano = tecnicoMasCercano(t.zone, tecnicos)
          if (!dest) return null
          const techCoords = cercano?.coords || null
          return {
            taskId: t.id,
            task: t,
            tech: cercano?.tecnico || null,
            distKm: cercano?.dist ?? null,
            eta: etaMinutos(cercano?.dist ?? null),
            coords: [dest, techCoords].filter(Boolean),
            dest,
            techCoords,
          }
        })
        .filter(Boolean),
    [tecnicos, tareas],
  )
  const rutas = baseRutas

  // Actualiza las líneas con la ruta real por carretera (OSRM) cuando hay datos.
  useEffect(() => {
    let cancel = false
    if (rutas.length === 0) return
    Promise.all(
      rutas.map(async (r) => {
        if (!r.dest || !r.techCoords) return null
        const real = await fetchRutaReal(r.techCoords, r.dest)
        return real ? { taskId: r.taskId, real } : null
      }),
    ).then((results) => {
      if (cancel) return
      const next = {}
      results.forEach((x) => { if (x) next[x.taskId] = x.real })
      setRutasReales(next)
    })
    return () => { cancel = true }
  }, [rutas])

  // GPS real del dispositivo en tiempo real.
  useEffect(() => {
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setMiPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) })
        setGpsEstado('activo')
      },
      () => setGpsEstado('error'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const puntosEncuadre = useMemo(() => {
    const pts = []
    rutas.forEach((r) => { if (r.dest) pts.push([r.dest.lat, r.dest.lng]) })
    tecnicos.forEach((t) => { const c = coordsDeZona(t.zone); if (c) pts.push([c.lat, c.lng]) })
    if (miPos) pts.push([miPos.lat, miPos.lng])
    return pts
  }, [rutas, tecnicos, miPos])

  const colorDe = (nombre) => {
    const idx = tecnicos.findIndex((t) => t.name === nombre)
    return TEC_COLORS[((idx % TEC_COLORS.length) + TEC_COLORS.length) % TEC_COLORS.length]
  }

  const asignadas = new Set(rutas.filter((r) => r.tech).map((r) => r.taskId))

  return (
    <div className="geo-wrap">
      <MapContainer center={[8.5, -66]} zoom={6} className="geo-map" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={puntosEncuadre} />
        <CentroEn target={centro} />

        {/* Rutas: técnico -> cliente */}
        {rutas.map((r) => {
          if (!r.techCoords || !r.dest) return null
          const coords = rutasReales[r.taskId] || r.coords
          const esActiva = rutaActiva === r.taskId
          return (
            <Polyline
              key={`ruta-${r.taskId}`}
              positions={coords}
              pathOptions={{
                color: esActiva ? '#f59e0b' : colorDe(r.tech?.name),
                weight: esActiva ? 5 : 3,
                opacity: 0.85,
                dashArray: esActiva ? null : '6 6',
              }}
            />
          )
        })}

        {/* Técnicos */}
        {tecnicos.map((t) => {
          const c = coordsDeZona(t.zone)
          if (!c) return null
          return (
            <Marker key={t.id} position={[c.lat, c.lng]} icon={techIcon(t.name, colorDe(t.name))}>
              <Popup>
                <div className="geo-pop">
                  <strong>{t.name}</strong>
                  <span>Zona: {t.zone}</span>
                  <span>Tareas activas: {t.workload}</span>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Tareas / instalaciones del cliente */}
        {rutas.map((r) =>
          r.dest ? (
            <Marker key={r.taskId} position={[r.dest.lat, r.dest.lng]} icon={taskIcon()}>
              <Popup>
                <div className="geo-pop">
                  <strong>{r.task.client}</strong>
                  <span>{r.task.service}</span>
                  <span>Zona: {r.task.zone}</span>
                  {r.tech && (
                    <span style={{ color: 'var(--secondary)' }}>
                      Ruta → {r.tech.name} · {r.distKm != null ? `${r.distKm.toFixed(1)} km` : '—'} · ETA {r.eta} min
                    </span>
                  )}
                  {r.tech && (
                    <button
                      className="btn btn-primary geo-asignar"
                      onClick={() => { setRutaActiva(r.taskId); onAsignar?.(r.task) }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>alt_route</span> Asignar a {r.tech.name}
                    </button>
                  )}
                  {!r.tech && <span className="text-error">Sin técnico disponible</span>}
                </div>
              </Popup>
            </Marker>
          ) : null,
        )}

        {/* GPS real del dispositivo */}
        {miPos && (
          <Marker position={[miPos.lat, miPos.lng]} icon={gpsIcon()}>
            <Popup>
              <div className="geo-pop">
                <strong>Tu posición (GPS real)</strong>
                <span>Precisión: ±{miPos.acc} m</span>
                <span>Lat: {miPos.lat.toFixed(5)} · Lng: {miPos.lng.toFixed(5)}</span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Panel de control */}
      <div className="geo-panel">
        <div className="geo-panel-title">
          <span className="material-symbols-outlined">map</span> Ruteo óptimo
          <span className="badge badge-info">{asignadas.size}/{rutas.length} con ruta</span>
        </div>
        <div className="geo-lista">
          {rutas.length === 0 && <p className="body-sm text-on-surface-variant">Sin servicios para enrutar.</p>}
          {rutas.map((r) => (
            <button
              key={r.taskId}
              type="button"
              className={`geo-ruta ${rutaActiva === r.taskId ? 'activa' : ''}`}
              onClick={() => setRutaActiva(r.taskId === rutaActiva ? null : r.taskId)}
            >
              <span className="material-symbols-outlined">location_on</span>
              <div>
                <strong>{r.task.client}</strong>
                <span>{r.task.service} · {r.task.zone}</span>
                <span className="geo-ruta-meta">
                  {r.tech
                    ? `→ ${r.tech.name} · ${r.distKm != null ? `${r.distKm.toFixed(1)} km` : '—'} · ~${r.eta} min`
                    : 'Sin técnico cercano'}
                </span>
              </div>
              <span className="material-symbols-outlined geo-chev">chevron_right</span>
            </button>
          ))}
        </div>
      </div>

      {/* Botón / estado GPS */}
      <div className="geo-gpsbar">
        {gpsEstado === 'activo' ? (
          <span className="geo-gps-ok">
            <span className="geo-gps-dot--mini" /> GPS activo{miPos ? ` · ±${miPos.acc} m` : ''}
          </span>
        ) : gpsEstado === 'buscando' ? (
          <span className="geo-gps-wait">Buscando GPS…</span>
        ) : (
          <span className="geo-gps-err">GPS no disponible</span>
        )}
        <button className="btn btn-secondary geo-centro" onClick={() => miPos ? setCentro(miPos) : null} disabled={!miPos}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>my_location</span> Mi posición
        </button>
      </div>
    </div>
  )
}
