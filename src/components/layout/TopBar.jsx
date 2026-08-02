export default function TopBar({ onToggleMobileMenu }) {
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
        {/* System Health Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(62, 241, 181, 0.1)', border: '1px solid rgba(62, 241, 181, 0.2)' }}>
          <span className="notification-dot" style={{ position: 'static', display: 'inline-block', background: 'var(--success)', width: '6px', height: '6px' }}></span>
          <span className="label-caps text-success" style={{ fontSize: '10px' }}>Sistemas OK</span>
        </div>

        {/* Notifications Button */}
        <button className="icon-btn" style={{ position: 'relative' }}>
          <span className="material-symbols-outlined">notifications</span>
          <span className="notification-dot"></span>
        </button>

        {/* Settings Button */}
        <button className="icon-btn">
          <span className="material-symbols-outlined">settings_suggest</span>
        </button>
      </div>
    </header>
  );
}
