import { Navigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import { canAccess } from '../../lib/roles'

export function FullPageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-color)' }}>
      <div style={{ textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
        <p className="body-md text-on-surface-variant" style={{ marginTop: '12px' }}>Verificando seguridad...</p>
      </div>
    </div>
  )
}

// Protege la ruta: redirige a /login si no hay sesión activa.
export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

// Limita el acceso según el rol del usuario y la clave del módulo.
export function RequireRole({ moduleKey, children }) {
  const { rol } = useAuth()
  if (!canAccess(rol, moduleKey)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
        <div className="glass-panel" style={{ padding: '40px', maxWidth: '460px', textAlign: 'center', background: 'rgba(23, 31, 51, 0.6)' }}>
          <span className="material-symbols-outlined text-secondary" style={{ fontSize: '56px' }}>lock</span>
          <h2 className="headline-md text-on-surface" style={{ margin: '12px 0' }}>Acceso restringido</h2>
          <p className="body-md text-on-surface-variant">
            Tu rol no tiene permiso para ver este módulo.
          </p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '20px' }}>Volver al Panel</Link>
        </div>
      </div>
    )
  }
  return children
}