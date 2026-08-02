import { formatVzPhone } from '../../lib/format'

// Input reutilizable para teléfono de Venezuela (+58).
// Maqueta en vivo el número a "+58 412 123-4567".
// `value` y `onChange` guardan la cadena cruda (solo dígitos) que ingresa el usuario.
export default function PhoneVe({ value, onChange, label, disabled, placeholder = '+58 412 123-4567' }) {
  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <input
        type="tel"
        inputMode="tel"
        className="form-input"
        value={value ? formatVzPhone(value) : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={16}
        disabled={disabled}
      />
    </div>
  )
}