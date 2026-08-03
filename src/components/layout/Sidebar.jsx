import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { modulesFor } from '../../lib/roles';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const { rol, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = modulesFor(rol);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isActivePath = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

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
          onClick={() => navigate('/pedidos')}
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span className="btn-text">Nueva solicitud</span>
        </button>
      </div>

      <nav className="sidebar-menu" role="navigation" aria-label="Navegación principal">
        {navItems.map((item) => (
          <button
            key={item.to}
            type="button"
            className={`sidebar-link ${isActivePath(item.to) ? 'active' : ''}`}
            onClick={() => navigate(item.to)}
            aria-current={isActivePath(item.to) ? 'page' : undefined}
          >
            <span className="material-symbols-outlined nav-icon" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
            <span className="nav-label body-md">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-nav">
          <NavLink to="/perfil" className="sidebar-link">
            <span className="material-symbols-outlined">person</span>
            <span className="nav-label body-md">Perfil</span>
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