// =============================================================================
// DIVISIÓN POLÍTICO-TERRITORIAL DE VENEZUELA
// Estados → Municipios → Ciudades (subconjunto representativo para el
// formulario en cascada de zonas de instalación).
// =============================================================================

export const ESTADOS_VENEZUELA = [
  {
    estado: 'Distrito Capital',
    municipios: [
      { municipio: 'Libertador', ciudades: ['Caracas', 'El Paraíso', 'San Bernardino', 'Catia'] },
      { municipio: 'Chacao', ciudades: ['Chacao'] },
      { municipio: 'Baruta', ciudades: ['Baruta', 'Las Mercedes'] },
      { municipio: 'Sucre', ciudades: ['Petare', 'La Urbina'] },
    ],
  },
  {
    estado: 'Miranda',
    municipios: [
      { municipio: 'Guicaipuro', ciudades: ['Los Teques'] },
      { municipio: 'Cristóbal Rojas', ciudades: ['Charallave'] },
      { municipio: 'Urdaneta', ciudades: ['Cúa', 'Nueva Cúa'] },
      { municipio: 'Simón Bolívar', ciudades: ['San Francisco de Yare'] },
      { municipio: 'Briones', ciudades: ['San José de los Altos'] },
    ],
  },
  {
    estado: 'Anzoátegui',
    municipios: [
      { municipio: 'Simón Bolívar', ciudades: ['Barcelona', 'Puerto La Cruz'] },
      { municipio: 'Sotillo', ciudades: ['Puerto La Cruz', 'Lechería'] },
      { municipio: 'Sigado', ciudades: ['El Tigre'] },
      { municipio: 'Freites', ciudades: ['Anaco'] },
    ],
  },
  {
    estado: 'Lara',
    municipios: [
      { municipio: 'Iribarren', ciudades: ['Barquisimeto'] },
      { municipio: 'Palavecino', ciudades: ['Cabudare'] },
      { municipio: 'Jiménez', ciudades: ['Quíbor'] },
    ],
  },
  {
    estado: 'Zulia',
    municipios: [
      { municipio: 'Maracaibo', ciudades: ['Maracaibo'] },
      { municipio: 'San Francisco', ciudades: ['San Francisco'] },
      { municipio: 'Cabimas', ciudades: ['Cabimas'] },
      { municipio: 'Lagunillas', ciudades: ['Ciudad Ojeda'] },
    ],
  },
  {
    estado: 'Carabobo',
    municipios: [
      { municipio: 'Valencia', ciudades: ['Valencia', 'Naguanagua'] },
      { municipio: 'Guacara', ciudades: ['Guacara'] },
      { municipio: 'Puerto Cabello', ciudades: ['Puerto Cabello'] },
      { municipio: 'Los Guayos', ciudades: ['Los Guayos'] },
    ],
  },
  {
    estado: 'Aragua',
    municipios: [
      { municipio: 'Girardot', ciudades: ['Maracay'] },
      { municipio: 'Francisco Linares Alcántara', ciudades: ['Turmero'] },
      { municipio: 'Santiago Mariño', ciudades: ['Turmero'] },
      { municipio: 'Sucre', ciudades: ['Cagua'] },
    ],
  },
  {
    estado: 'Bolívar',
    municipios: [
      { municipio: 'Heres', ciudades: ['Ciudad Bolívar'] },
      { municipio: 'Caroní', ciudades: ['Ciudad Guayana', 'Puerto Ordaz'] },
      { municipio: 'Piar', ciudades: ['Guasipati'] },
    ],
  },
  {
    estado: 'Monagas',
    municipios: [
      { municipio: 'Maturín', ciudades: ['Maturín'] },
      { municipio: 'Ezequiel Zamora', ciudades: ['Punta de Mata'] },
      { municipio: 'Uracoa', ciudades: ['Uracoa'] },
    ],
  },
  {
    estado: 'Sucre',
    municipios: [
      { municipio: 'Sucre', ciudades: ['Cumaná'] },
      { municipio: 'Bermúdez', ciudades: ['Carúpano'] },
      { municipio: 'Rojas', ciudades: ['Irapa'] },
    ],
  },
  {
    estado: 'Nueva Esparta',
    municipios: [
      { municipio: 'Maneiro', ciudades: ['Pampatar'] },
      { municipio: 'Mariño', ciudades: ['Porlamar'] },
      { municipio: 'Arismendi', ciudades: ['La Asunción'] },
    ],
  },
  {
    estado: 'Falcón',
    municipios: [
      { municipio: 'Miranda', ciudades: ['Coro', 'Santa Ana de Coro'] },
      { municipio: 'Carirubana', ciudades: ['Punto Fijo'] },
      { municipio: 'Buchivacoa', ciudades: ['Capatárida'] },
    ],
  },
  {
    estado: 'Táchira',
    municipios: [
      { municipio: 'San Cristóbal', ciudades: ['San Cristóbal'] },
      { municipio: 'Capacho', ciudades: ['Capacho Nuevo', 'Capacho Viejo'] },
      { municipio: 'Torbes', ciudades: ['San Josecito'] },
    ],
  },
  {
    estado: 'Mérida',
    municipios: [
      { municipio: 'Libertador', ciudades: ['Mérida'] },
      { municipio: 'Campo Elías', ciudades: ['Ejido'] },
      { municipio: 'Muñoz', ciudades: ['Lourdes'] },
    ],
  },
  {
    estado: 'Trujillo',
    municipios: [
      { municipio: 'Trujillo', ciudades: ['Trujillo'] },
      { municipio: 'Boconó', ciudades: ['Boconó'] },
      { municipio: 'Valera', ciudades: ['Valera'] },
    ],
  },
  {
    estado: 'Barinas',
    municipios: [
      { municipio: 'Barinas', ciudades: ['Barinas'] },
      { municipio: 'Pedro Briceño', ciudades: ['Barrancos'] },
      { municipio: 'Socopó', ciudades: ['Socopó'] },
    ],
  },
  {
    estado: 'Ciudad Guayana – Bolívar',
    municipios: [
      { municipio: 'Caroní', ciudades: ['Puerto Ordaz', 'San Felix'] },
      { municipio: 'Heres', ciudades: ['Ciudad Bolívar'] },
    ],
  },
  {
    estado: 'Apure',
    municipios: [
      { municipio: 'San Fernando', ciudades: ['San Fernando de Apure'] },
      { municipio: 'Achaguas', ciudades: ['Achaguas'] },
    ],
  },
  {
    estado: 'La Guaira',
    municipios: [
      { municipio: 'Vargas', ciudades: ['La Guaira', 'Maiquetía'] },
      { municipio: 'Carayaca', ciudades: ['Carayaca'] },
    ],
  },
]

// Helpers de búsqueda para el componente en cascada.
export function municipiosDe(estado) {
  return ESTADOS_VENEZUELA.find((e) => e.estado === estado)?.municipios || []
}

export function ciudadesDe(estado, municipio) {
  return municipiosDe(estado).find((m) => m.municipio === municipio)?.ciudades || []
}

// Compone un texto resumido (compatible con la columna zona_geografica).
export function formatoZona({ estado = '', municipio = '', ciudad = '' }) {
  return [ciudad, municipio, estado].filter(Boolean).join(', ') || ''
}