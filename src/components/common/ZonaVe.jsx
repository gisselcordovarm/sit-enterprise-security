import { ESTADOS_VENEZUELA, municipiosDe, ciudadesDe } from '../../lib/zonasVenezuela'

// Selector en cascada Estado → Municipio → Ciudad de Venezuela.
// value: { estado, municipio, ciudad }. onChange recibe el objeto actualizado.
export default function ZonaVe({ value, onChange, disabled = false }) {
  const estado = value?.estado || ''
  const municipio = value?.municipio || ''
  const ciudad = value?.ciudad || ''
  const municipios = municipiosDe(estado)
  const ciudades = ciudadesDe(estado, municipio)

  return (
    <div className="grid-3" style={{ gap: '10px', marginBottom: '0' }}>
      <div className="form-group" style={{ marginBottom: '0' }}>
        <label>Estado</label>
        <div className="zona-select-wrap">
          <select
            className="form-select"
            value={estado}
            disabled={disabled}
            onChange={(e) => onChange({ estado: e.target.value, municipio: '', ciudad: '' })}
          >
            <option value="">Seleccione...</option>
            {ESTADOS_VENEZUELA.map((e) => (
              <option key={e.estado} value={e.estado}>{e.estado}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '0' }}>
        <label>Municipio</label>
        <select
          className="form-select"
          value={municipio}
          disabled={disabled || !estado}
          onChange={(e) => onChange({ estado, municipio: e.target.value, ciudad: '' })}
        >
          <option value="">{estado ? 'Seleccione...' : 'Primero el Estado'}</option>
          {municipios.map((m) => (
            <option key={m.municipio} value={m.municipio}>{m.municipio}</option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: '0' }}>
        <label>Ciudad</label>
        <select
          className="form-select"
          value={ciudad}
          disabled={disabled || !municipio}
          onChange={(e) => onChange({ estado, municipio, ciudad: e.target.value })}
        >
          <option value="">{municipio ? 'Seleccione...' : 'Primero el Municipio'}</option>
          {ciudades.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  )
}