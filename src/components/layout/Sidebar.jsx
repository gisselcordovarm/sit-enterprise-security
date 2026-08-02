import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: 'dashboard' },
    { name: 'Pedidos', path: '/pedidos', icon: 'shopping_cart' },
    { name: 'Operaciones', path: '/operaciones', icon: 'build' },
    { name: 'Instalación', path: '/instalacion', icon: 'settings' },
    { name: 'Finanzas', path: '/finanzas', icon: 'payments' },
    { name: 'Postventa', path: '/postventa', icon: 'support_agent' },
  ];

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
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="body-md">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="user-profile">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100" alt="Usuario" />
          <div className="user-info">
            <span className="body-sm text-on-surface" style={{ fontWeight: '600' }}>Gissel Cordova</span>
            <span className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>Admin Operaciones</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
