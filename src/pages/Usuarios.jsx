import { useEffect, useState } from 'react'
import DataStatus from '../components/common/DataStatus'
import { fetchProfiles, updateProfileRole, updateProfileState, inviteUser, resendInvite } from '../lib/data'
import { ROL_LABELS, ROL_DESC, ROL_ORDER, validateEmail } from '../lib/roles'
import { useAuth } from '../context/authContext'

const ESTADO_BADGE = {
  pendiente: { cls: 'badge-pending', label: 'Pendiente' },
  activo: { cls: 'badge-success', label: 'Activo' },
  inactivo: { cls: 'badge-soft', label: 'Inactivo' },
}

export default function Usuarios() {
  const { profile } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [liveError, setLiveError] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [msg, setMsg] = useState('')
  const [msgError, setMsgError] = useState('')

  // Modal "Nuevo usuario"
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ email: '', nombre: '', rol: 'vendedor' })
  const [formError, setFormError] = useState('')
  const [inviting, setInviting] = useState(false)

  // Modal "Enlace de invitación" (reenvío)
  const [showLink, setShowLink] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [linkError, setLinkError] = useState('')
  const [copied, setCopied] = useState(false)
  const [emailSent, setEmailSent] = useState(true)

  useEffect(() => {
    let active = true
    fetchProfiles()
      .then((data) => { if (active) { setProfiles(data); setLiveError(null) } })
      .catch(() => { if (active) setLiveError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const refresh = async () => {
    const data = await fetchProfiles()
    setProfiles(data)
  }

  const changeRole = async (id, rol) => {
    if (savingId) return
    if (id === profile?.id) {
      setMsg(''); setMsgError('No puedes cambiar tu propio rol. Además debe haber al menos otro administrador.')
      return
    }
    if (!window.confirm(`¿Deseas cambiar el rol de este usuario a "${ROL_LABELS[rol] || rol}"?`)) return
    setSavingId(id); setMsg(''); setMsgError('')
    try {
      await updateProfileRole(id, rol)
      await refresh()
      setMsg('Rol actualizado correctamente.')
    } catch (err) {
      console.error(err)
      setMsgError('No se pudo actualizar el rol. Intente de nuevo.')
    } finally {
      setSavingId(null)
    }
  }

  const toggleState = async (p) => {
    if (savingId) return
    if (p.id === profile?.id) {
      setMsg(''); setMsgError('No puedes desactivar tu propia cuenta.')
      return
    }
    const next = p.estado === 'activo' ? 'inactivo' : 'activo'
    const action = next === 'inactivo' ? 'desactivar' : 'activar'
    if (!window.confirm(`¿Deseas ${action} a ${p.nombre || p.email}?`)) return
    setSavingId(p.id); setMsg(''); setMsgError('')
    try {
      await updateProfileState(p.id, next)
      await refresh()
      setMsg(`Usuario ${action} correctamente.`)
    } catch (err) {
      console.error(err)
      setMsgError('No se pudo cambiar el estado. Intente de nuevo.')
    } finally {
      setSavingId(null)
    }
  }

  const openLinkModal = async (p) => {
    setMsg(''); setMsgError(''); setLinkError(''); setCopied(false)
    setInviteEmail(p.email)
    setEmailSent(false)
    setShowLink(true)
    setInviteLink('')
    try {
      const { link } = await resendInvite(p.email)
      if (!link) throw new Error('Sin enlace')
      setInviteLink(link)
    } catch (err) {
      console.error(err)
      setLinkError(err.message || 'No se pudo generar el enlace.')
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
    } catch { setCopied(false) }
  }

  const submitInvite = async (e) => {
    e.preventDefault()
    setFormError('')
    const mailCheck = validateEmail(form.email)
    if (!mailCheck.ok) { setFormError(mailCheck.error); return }
    if (!form.nombre.trim()) { setFormError('El nombre es obligatorio.'); return }
    setInviting(true)
    try {
      const res = await inviteUser({ email: form.email.trim(), nombre: form.nombre.trim(), rol: form.rol })
      const invitedEmail = form.email.trim()
      setShowNew(false)
      setForm({ email: '', nombre: '', rol: 'vendedor' })
      if (res.link) {
        setInviteEmail(invitedEmail)
        setInviteLink(res.link)
        setLinkError('')
        setCopied(false)
        setEmailSent(res.emailSent !== false)
        setMsg(res.message || 'Invitación creada.')
        setShowLink(true)
      } else {
        setMsg(`Invitación enviada a ${invitedEmail}. El correo llegó con el enlace de activación (válido 24 h).`)
      }
      await refresh()
    } catch (err) {
      console.error(err)
      setFormError(err.message || 'No se pudo enviar la invitación.')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--stack-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="display-lg text-on-surface">Gestión de Usuarios</h1>
          <p className="body-sm text-on-surface-variant">El administrador registra los usuarios del sistema.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormError(''); setShowNew(true) }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span> Nuevo usuario
        </button>
      </div>

      <DataStatus loading={loading} liveError={liveError} />

      {msg && (
        <div className="m3-banner" style={{ background: 'var(--tint-success)', borderColor: 'rgba(14, 159, 110, 0.3)' }}>
          <span className="label-caps text-success">{msg}</span>
        </div>
      )}
      {msgError && (
        <div className="m3-banner" style={{ background: 'var(--error-container, rgba(179, 38, 30, 0.12))', borderColor: 'rgba(179, 38, 30, 0.3)' }}>
          <span className="label-caps" style={{ color: 'var(--error)' }}>{msgError}</span>
        </div>
      )}

      <section className="card glass-panel" style={{ background: 'var(--glass-bg)' }}>
        <div className="card-header-border" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="headline-md text-on-surface">Usuarios del sistema</h2>
            <span className="body-sm text-on-surface-variant">{profiles.length} perfil(es) registrado(s)</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="m3-table">
            <thead>
              <tr>
                <th>Usuario (correo)</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length > 0 ? profiles.map((p) => {
                const badge = ESTADO_BADGE[p.estado] || (p.activo === false ? ESTADO_BADGE.inactivo : ESTADO_BADGE.activo)
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="body-sm text-on-surface" style={{ fontWeight: 600 }}>{p.nombre || p.email}</div>
                      <div className="body-sm text-on-surface-variant">{p.email}</div>
                    </td>
                    <td>
                      <select
                        className="form-select"
                        value={p.rol}
                        disabled={savingId === p.id || p.id === profile?.id}
                        style={{ padding: '6px 10px', fontSize: '13px', cursor: p.id === profile?.id ? 'not-allowed' : 'default' }}
                        onChange={(e) => changeRole(p.id, e.target.value)}
                      >
                        <option value="admin">{ROL_LABELS.admin}</option>
                        {ROL_ORDER.map((r) => (
                          <option key={r} value={r}>{ROL_LABELS[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {p.estado === 'pendiente' && (
                          <button
                            className="btn btn-secondary"
                            disabled={savingId === p.id}
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                            onClick={() => openLinkModal(p)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>link</span> Obtener enlace
                          </button>
                        )}
                        {p.estado !== 'pendiente' && (
                          <button
                            className="btn btn-secondary"
                            disabled={savingId === p.id || p.id === profile?.id}
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                            onClick={() => toggleState(p)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{p.estado === 'activo' ? 'block' : 'check_circle'}</span>
                            {p.estado === 'activo' ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: '24px' }}>No se encontraron perfiles.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: Nuevo usuario */}
      {showNew && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="new-user-modal-title" onClick={() => !inviting && setShowNew(false)}>
          <div className="modal-content glass-panel" style={{ background: 'var(--glass-bg-strong)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="new-user-modal-title" className="headline-md text-on-surface">Invitar nuevo usuario</h3>
              <button className="icon-btn" aria-label="Cerrar" disabled={inviting} onClick={() => setShowNew(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={submitInvite} noValidate>
              <div className="modal-body">
                <p className="body-sm text-on-surface-variant" style={{ marginBottom: '16px' }}>
                  Se enviará un correo de activación (válido 24 h). La cuenta queda <b>pendiente</b> hasta definir la contraseña.
                </p>
                <label className="auth-label" htmlFor="nu-email">Correo electrónico</label>
                <input
                  id="nu-email"
                  type="email"
                  className="auth-input"
                  placeholder="usuario@dominio.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="off"
                  disabled={inviting}
                />
                <label className="auth-label" htmlFor="nu-nombre" style={{ marginTop: '16px' }}>Nombre completo</label>
                <input
                  id="nu-nombre"
                  type="text"
                  className="auth-input"
                  placeholder="Nombre y apellido"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  autoComplete="off"
                  disabled={inviting}
                />
                <label className="auth-label" htmlFor="nu-rol" style={{ marginTop: '16px' }}>Rol de acceso</label>
                <select
                  id="nu-rol"
                  className="form-select"
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  disabled={inviting}
                  style={{ width: '100%', padding: '12px 14px', fontSize: '14px' }}
                >
                  {ROL_ORDER.map((r) => (
                    <option key={r} value={r}>{ROL_LABELS[r]} — {ROL_DESC[r]}</option>
                  ))}
                </select>
                {formError && (
                  <div className="auth-error-banner" style={{ marginTop: '16px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span> {formError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" disabled={inviting} onClick={() => setShowNew(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={inviting}>
                  {inviting ? 'Enviando...' : 'Enviar invitación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enlace de invitación (reenvío manual) */}
      {showLink && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="link-modal-title" onClick={() => setShowLink(false)}>
          <div className="modal-content glass-panel" style={{ background: 'var(--glass-bg-strong)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="link-modal-title" className="headline-md text-on-surface">Enlace de invitación</h3>
              <button className="icon-btn" aria-label="Cerrar" onClick={() => setShowLink(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p className="body-sm text-on-surface-variant" style={{ marginBottom: '12px' }}>
                Invitación para <b>{inviteEmail}</b>. {emailSent ? 'Correo de activación enviado.' : 'El correo no pudo enviarse.'}{' '}
                Copia el enlace y reenvíalo (expira en 24 h).
              </p>
              {linkError ? (
                <div className="auth-error-banner"><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span> {linkError}</div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    className="auth-input"
                    readOnly
                    value={inviteLink || 'Generando enlace...'}
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                    onFocus={(e) => e.target.select()}
                  />
                  <button className="btn btn-primary" disabled={!inviteLink} onClick={copyLink}>
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLink(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
