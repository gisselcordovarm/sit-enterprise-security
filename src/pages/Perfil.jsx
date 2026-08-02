import { useRef, useState } from 'react'
import { useAuth } from '../context/authContext'
import { ROL_LABELS } from '../lib/roles'
import { checkPasswordStrength } from '../lib/roles'
import { formatDate } from '../lib/data'
import { formatVzPhone, normalizeVzPhone } from '../lib/format'

// Reduce cualquier imagen a un dataURL pequeño (256px) para guardarla en el perfil.
function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('El archivo debe ser una imagen.'))
        return
      }
      const img = new Image()
      img.onload = () => {
        const max = 256
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const out = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85)
        resolve(out)
      }
      img.onerror = () => reject(new Error('No se pudo procesar la imagen.'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(file)
  })
}

export default function Perfil() {
  const { profile, rol, updateProfile, changePassword } = useAuth()
  const fileRef = useRef(null)

  const [nombre, setNombre] = useState(profile?.nombre || '')
  const [cargo, setCargo] = useState(profile?.cargo || '')
  const [telefono, setTelefono] = useState(profile?.telefono || '')
  const [foto, setFoto] = useState(profile?.foto || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busyFile, setBusyFile] = useState(false)

  const [cur, setCur] = useState('')
  const [nuevo, setNuevo] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [savingPass, setSavingPass] = useState(false)
  const [passMsg, setPassMsg] = useState('')
  const [passErr, setPassErr] = useState('')

  const strength = checkPasswordStrength(nuevo)

  const initials = (profile?.nombre || profile?.email || '?').slice(0, 2).toUpperCase()

  async function onPickFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusyFile(true)
    setErr('')
    try {
      const dataUrl = await readAsDataUrl(file)
      setFoto(dataUrl)
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusyFile(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function guardarDatos() {
    setSaving(true)
    setMsg('')
    setErr('')

    // Teléfono: si se ingresó algo, debe ser un teléfono venezolano válido (+58).
    let phoneFinal = telefono
    if (telefono && telefono.trim() !== '') {
      const check = normalizeVzPhone(telefono)
      if (!check.ok) {
        setSaving(false)
        setErr(check.error)
        return
      }
      phoneFinal = check.value
    } else {
      phoneFinal = ''
    }

    const error = await updateProfile({ nombre, cargo, telefono: phoneFinal, foto })
    setSaving(false)
    if (error) setErr(error)
    else {
      setTelefono(phoneFinal)
      setMsg('Datos actualizados correctamente.')
    }
  }

  async function guardarPassword() {
    setPassErr('')
    setPassMsg('')
    if (!cur) {
      setPassErr('Ingresar la contraseña actual.')
      return
    }
    if (nuevo !== confirmar) {
      setPassErr('La confirmación no coincide con la nueva contraseña.')
      return
    }
    if (!strength.allPass) {
      setPassErr('La nueva contraseña no cumple todos los requisitos de seguridad.')
      return
    }
    setSavingPass(true)
    const error = await changePassword(cur, nuevo)
    setSavingPass(false)
    if (error) setPassErr(error)
    else {
      setPassMsg('Contraseña actualizada.')
      setCur('')
      setNuevo('')
      setConfirmar('')
    }
  }

  const campos = [
    { label: 'Correo electrónico', value: profile?.email || '—', copy: true },
    { label: 'Rol de acceso', value: profile ? (ROL_LABELS[rol] || rol) : '—', badge: true },
    { label: 'Estado', value: profile?.activo === false ? 'Inactivo' : 'Activo', badge: true },
    { label: 'Cuenta creada', value: profile?.created_at ? formatDate(profile.created_at) : '—' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 'var(--stack-lg)' }}>
        <h1 className="display-lg text-on-surface">Mi Perfil</h1>
        <p className="body-md text-on-surface-variant">Consultá y actualizá tus datos personales, foto de perfil y contraseña.</p>
      </div>

      <section className="grid-2" style={{ alignItems: 'start' }}>
        {/* Columna izquierda: avatar + datos generales */}
        <div className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
          <div className="card-header-border">
            <div>
              <h2 className="headline-md text-on-surface">Información general</h2>
              <span className="body-sm text-on-surface-variant">Foto, nombres y datos de contacto</span>
            </div>
          </div>

          {/* Avatar y foto */}
          <div className="avatar-zone">
            <button className="avatar-photo" onClick={() => fileRef.current?.click()} disabled={busyFile} type="button">
              {foto ? (
                <img src={foto} alt="Foto de perfil" />
              ) : (
                <span className="avatar-initials">{initials}</span>
              )}
            </button>
            <div className="avatar-actions">
              <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={busyFile} type="button">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>photo_camera</span>
                {busyFile ? 'Procesando...' : 'Cambiar foto'}
              </button>
              {foto && (
                <button className="btn btn-ghost" onClick={() => setFoto('')} type="button">Quitar</button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
            <span className="body-sm text-on-surface-variant avatar-hint">PNG o JPG · se guarda comprimido (256px)</span>
          </div>

          <div className="form-column">
            <div className="form-group">
              <label>Nombre completo</label>
              <input className="form-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Cargo / puesto</label>
                <input className="form-input" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ej. Administrador de sistemas" />
              </div>
              <div className="form-group">
                <label>Teléfono (Venezuela +58)</label>
                <input
                  className="form-input"
                  value={telefono ? formatVzPhone(telefono) : ''}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+58 412 123-4567"
                  inputMode="tel"
                  maxLength={16}
                />
                <span style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: 'var(--on-surface-variant)' }}>Formato venezolano: +58 código de área + 7 dígitos.</span>
              </div>
            </div>
          </div>

          {msg && <div className="m3-banner" style={{ background: 'var(--tint-success)', borderColor: 'rgba(14, 159, 110, 0.3)' }}>
            <span className="label-caps text-success">{msg}</span>
          </div>}
          {err && <div className="m3-banner" style={{ background: 'var(--tint-error)', borderColor: 'rgba(186, 26, 26, 0.35)' }}>
            <span className="label-caps text-error">{err}</span>
          </div>}

          <button className="btn btn-primary" onClick={guardarDatos} disabled={saving} style={{ marginTop: 'var(--stack-md)' }} type="button">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        {/* Columna derecha: datos de valor + contraseña */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-lg)' }}>
          <div className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
            <div className="card-header-in">
              <div>
                <h2 className="headline-md text-on-surface">Datos de la cuenta</h2>
                <span className="body-sm text-on-surface-variant">Información registrada del usuario</span>
              </div>
            </div>
            <dl className="kv-list">
              {campos.map((c) => (
                <div className="kv-row" key={c.label}>
                  <dt className="body-sm text-on-surface-variant">{c.label}</dt>
                  <dd className="body-sm text-on-surface">
                    {c.badge ? <span className={`badge ${c.value === 'Inactivo' ? 'badge-pending' : c.value === 'Activo' ? 'badge-success' : 'badge-info'}`}>{c.value}</span> : c.value}
                    {c.copy && <span className="text-on-surface-variant" style={{ marginLeft: 8, fontSize: 12 }}>· confidencial</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
            <div className="card-header-in">
              <div>
                <h2 className="headline-md text-on-surface">Cambiar contraseña</h2>
                <span className="body-sm text-on-surface-variant">Requerirá reingresar la próxima sesión</span>
              </div>
            </div>

            <div className="form-group">
              <label>Contraseña actual</label>
              <input className="form-input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </div>
            <div className="form-group">
              <label>Nueva contraseña</label>
              <input className="form-input" type="password" value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label>Confirmar nueva contraseña</label>
              <input className="form-input" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder="Repetí la nueva contraseña" autoComplete="new-password" />
            </div>

            {nuevo && (
              <div className="auth-strength">
                <div className="auth-strength-track">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="auth-strength-seg"
                      style={{
                        background: i < strength.score
                          ? ['', 'var(--error)', 'var(--secondary)', 'var(--success)'][strength.score]
                          : 'var(--surface-container-highest)',
                      }}
                    />
                  ))}
                </div>
                <span className="label-caps" style={{ color: ['var(--on-surface-variant)', 'var(--error)', 'var(--secondary)', 'var(--success)'][strength.score] }}>
                  Contraseña {strength.label}
                </span>
              </div>
            )}

            {passMsg && <div className="m3-banner" style={{ background: 'var(--tint-success)', borderColor: 'rgba(14, 159, 110, 0.3)' }}>
              <span className="label-caps text-success">{passMsg}</span>
            </div>}
            {passErr && <div className="m3-banner" style={{ background: 'var(--tint-error)', borderColor: 'rgba(186, 26, 26, 0.35)' }}>
              <span className="label-caps text-error">{passErr}</span>
            </div>}

            <button className="btn btn-secondary" onClick={guardarPassword} disabled={savingPass} style={{ marginTop: 'var(--stack-md)' }} type="button">
              {savingPass ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}