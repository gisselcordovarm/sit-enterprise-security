import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { modulesFor, ROL_LABELS } from '../../lib/roles';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const { profile, rol, signOut } = useAuth();
  const menuItems = modulesFor(rol);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const displayName = profile?.nombre || profile?.email || 'Usuario';
  const roleLabel = ROL_LABELS[rol] || rol;

  const navItems = [
    { to: '/', icon: 'dashboard', label: 'Dashboard' },
    { to: '/pedidos', icon: 'shopping_cart', label: 'Pedidos' },
    { to: '/operaciones', icon: 'settings_suggest', label: 'Operaciones' },
    { to: '/instalacion', icon: 'view_stream', label: 'Instalación' },
    { to: '/finanzas', icon: 'payments', label: 'Finanzas' },
    { to: '/postventa', icon: 'verified', label: 'Postventa' },
    { to: '/reportes', icon: 'analytics', label: 'Reportes' },
    { to: '/usuarios', icon: 'group', label: 'Usuarios' },
  ];

  return (
    <aside className={`sidebar glass-panel ${isMobile ? 'mobile-hidden' : ''} ${!isExpanded && !isMobile ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/tecnoinnova-logo.png" alt="TecnoInnova" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <div className="logo-text">
            <span className="headline-lg text-on-surface">TecnoInnova</span>
            <span className="label-caps text-on-surface-variant">Enterprise SIT</span>
          </div>
        </div>
        <button
          className="sidebar-new-request"
          aria-label="Nueva solicitud"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span className="btn-text">Nueva solicitud</span>
        </button>
      </div>

      <nav className="sidebar-menu" role="navigation" aria-label="Navegación principal">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            end={item.to === '/'}
            aria-current={item.to === '/' ? 'page' : undefined}
          >
            <span className="material-symbols-outlined nav-icon" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
            <span className="nav-label body-md">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-nav">
          <NavLink to="/perfil" className="sidebar-link">
            <span className="material-symbols-outlined">person</span>
            <span className="nav-label body-md">Perfil</span>
          </NavLink>
          <NavLink to="/settings" className="sidebar-link">
            <span className="material-symbols-outlined">settings</span>
            <span className="nav-label body-md">Ajustes</span>
          </NavLink>
        </div>
        <button className="sidebar-logout btn btn-ghost" onClick={signOut}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
          <span className="nav-label body-sm">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}