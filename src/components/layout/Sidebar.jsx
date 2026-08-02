import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { modulesFor, ROL_LABELS } from '../../lib/roles';

export default function Sidebar() {
  const { profile, rol, signOut } = useAuth();
  const menuItems = modulesFor(rol);

  const displayName = profile?.nombre || profile?.email || 'Usuario';
  const roleLabel = ROL_LABELS[rol] || rol;

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-logo">
        <img src="/tecnoinnova-logo.svg" alt="TecnoInnova" style={{ width: '32px', height: '32px' }} />
        <div>
          <span className="headline-md text-on-surface" style={{ display: 'block', fontSize: '18px', fontWeight: 'bold' }}>TecnoInnova</span>
          <span className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>Security Platform</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        {menuItems.length > 0 ? menuItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="body-md">{item.label}</span>
          </NavLink>
        )) : (
          <div className="body-sm text-on-surface-variant" style={{ padding: '8px 16px' }}>Sin módulos disponibles</div>
        )}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/perfil" className="sidebar-link" style={{ justifyContent: 'flex-start' }}>
          <span className="material-symbols-outlined">account_circle</span>
          <span className="body-sm">Mi Perfil</span>
        </NavLink>
        <div className="user-profile">
          {profile?.foto ? (
            <img src={profile.foto} alt="Foto de perfil" className="avatar-img" />
          ) : (
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100" alt="Usuario" className="avatar-img" />
          )}
          <div className="user-info">
            <span className="body-sm text-on-surface" style={{ fontWeight: '600' }}>{displayName}</span>
            <span className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>{roleLabel}</span>
          </div>
        </div>
        <button className="btn btn-ghost sidebar-logout" onClick={signOut}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
          <span className="body-sm">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}