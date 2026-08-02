import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const sidebarStyle = isMobile
    ? {
        transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out',
        boxShadow: mobileMenuOpen ? '0 0 24px rgba(0,0,0,0.5)' : 'none',
      }
    : {};

  return (
    <div className="dashboard-layout">
      {/* Mobile Header */}
      <div className="mobile-header glass-panel" style={{ background: 'rgba(11, 19, 38, 0.9)', backdropFilter: 'blur(12px)' }}>
        <button className="icon-btn" onClick={toggleMobileMenu}>
          <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>security</span>
          <span className="headline-md text-on-surface" style={{ fontSize: '16px', fontWeight: 'bold' }}>SIT Security</span>
        </div>
        <button className="icon-btn" style={{ position: 'relative' }}>
          <span className="material-symbols-outlined">notifications</span>
          <span className="notification-dot"></span>
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div style={sidebarStyle} onClick={() => isMobile && setMobileMenuOpen(false)}>
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="main-content mobile-top-offset">
        <TopBar onToggleMobileMenu={toggleMobileMenu} />
        
        {/* Backdrop overlay for mobile sidebar */}
        {isMobile && mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)} 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.5)',
              zIndex: 35,
              backdropFilter: 'blur(4px)'
            }}
          />
        )}

        <div className="content-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
