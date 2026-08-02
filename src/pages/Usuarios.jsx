import { useEffect, useState } from 'react'
import DataStatus from '../components/common/DataStatus'
import { fetchProfiles, updateProfileRole } from '../lib/data'
import { ROL_LABELS } from '../lib/roles'

export default function Usuarios() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [liveError, setLiveError] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    fetchProfiles()
      .then((data) => { if (active) { setProfiles(data); setLiveError(null) } })
      .catch(() => { if (active) setLiveError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const changeRole = async (id, rol) => {
    setSavingId(id)
    setNotice('')
    try {
      await updateProfileRole(id, rol)
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, rol } : p)))
      setNotice('Rol actualizado correctamente.')
    } catch {
      setNotice('No se pudo actualizar el rol.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--stack-lg)' }}>
        <h1 className="display-lg text-on-surface">Gestión de Usuarios</h1>
        <p className="body-md text-on-surface-variant">Perfiles y roles de acceso al sistema. Solo el administrador puede modificar permisos.</p>
      </div>

      <DataStatus loading={loading} liveError={liveError} />

      {notice && (
        <div className="m3-banner" style={{ background: 'var(--tint-success)', borderColor: 'rgba(14, 159, 110, 0.3)' }}>
          <span className="label-caps text-success">{notice}</span>
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
                <th>Rol actual</th>
                <th>Estado</th>
                <th>Cambiar rol</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length > 0 ? profiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="body-sm text-on-surface" style={{ fontWeight: 600 }}>{p.nombre || p.email}</div>
                    <div className="body-sm text-on-surface-variant">{p.email}</div>
                  </td>
                  <td>
                    <span className={`badge ${p.rol === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>
                      {ROL_LABELS[p.rol] || p.rol}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${p.activo === false ? 'badge-soft' : 'badge-success'}`}>{p.activo === false ? 'Inactivo' : 'Activo'}</span>
                  </td>
                  <td>
                    <select
                      className="form-select"
                      value={p.rol}
                      disabled={savingId === p.id}
                      style={{ padding: '6px 10px', fontSize: '13px' }}
                      onChange={(e) => changeRole(p.id, e.target.value)}
                    >
                      <option value="admin">{ROL_LABELS.admin}</option>
                      <option value="basico">{ROL_LABELS.basico}</option>
                    </select>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: '24px' }}>No se encontraron perfiles.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}