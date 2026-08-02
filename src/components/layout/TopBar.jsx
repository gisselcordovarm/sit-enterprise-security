import { Link } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { ROL_LABELS } from '../../lib/roles';

export default function TopBar({ onToggleMobileMenu }) {
  const { profile, rol, signOut } = useAuth();
  const roleLabel = ROL_LABELS[rol] || rol;

  return (
    <header className="topbar glass-panel" style={{ 
      background: 'rgba(23, 31, 51, 0.7)', 
      backdropFilter: 'blur(12px)',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center'
    }}>
      {/* Mobile Toggle Button */}
      <button 
        className="icon-btn" 
        onClick={onToggleMobileMenu}
        style={{ display: 'flex' }}
        className="icon-btn md-hidden"
      >
        <span className="material-symbols-outlined" style={{ color: 'var(--on-surface)' }}>menu</span>
      </button>

      {/* Breadcrumb / Section Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="label-caps text-secondary">SIT SISTEMA CONTROL</span>
        <span className="text-on-surface-variant">/</span>
        <span className="body-sm text-on-surface" style={{ fontWeight: '600' }}>Panel Central de Seguridad</span>
      </div>

      {/* Search Container in Center */}
      <div className="search-container" style={{ justifySelf: 'center' }}>
        <span className="material-symbols-outlined search-icon">search</span>
        <input type="text" placeholder="Buscar pedido, cliente, orden..." className="search-input" />
      </div>

      {/* Actions on Right */}
      <div className="topbar-actions" style={{ justifySelf: 'end' }}>

        {/* Usuario actual */}
        <Link to="/perfil" className="topbar-user" title={`${profile?.email || ''}`} style={{ textDecoration: 'none' }}>
          {profile?.foto ? (
            <img src={profile.foto} alt="Foto de perfil" className="avatar-img avatar-img-sm" style={{ width: 30, height: 30, borderRadius: '50%' }} />
          ) : (
            <span className="material-symbols-outlined">account_circle</span>
          )}
          <div style={{ lineHeight: 1.1 }}>
            <span className="body-sm text-on-surface" style={{ fontWeight: 600 }}>{profile?.nombre || profile?.email || 'Usuario'}</span>
            <span className="label-caps text-on-surface-variant" style={{ fontSize: '9px' }}>{roleLabel}</span>
          </div>
        </Link>

        {/* System Health Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(62, 241, 181, 0.1)', border: '1px solid rgba(62, 241, 181, 0.2)' }}>
          <span className="notification-dot" style={{ position: 'static', display: 'inline-block', background: 'var(--success)', width: '6px', height: '6px' }}></span>
          <span className="label-caps text-success" style={{ fontSize: '10px' }}>Sistemas OK</span>
        </div>

        {/* Cerrar sesión */}
        <button className="icon-btn" onClick={signOut} title="Cerrar sesión">
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>
    </header>
  );
}
