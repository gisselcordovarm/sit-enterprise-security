import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { ROL_LABELS } from '../../lib/roles';
import { buscarGlobal } from '../../lib/data';

const TIPO_ICON = {
  pedido: 'receipt_long',
  inventario: 'inventory_2',
  tecnico: 'engineering',
  factura: 'request_quote',
};

export default function TopBar({ onToggleMobileMenu }) {
  const { profile, rol, signOut } = useAuth();
  const roleLabel = ROL_LABELS[rol] || rol;
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const click = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      timer.current = setTimeout(() => { setResults([]); setOpen(false); }, 300);
      return () => clearTimeout(timer.current);
    }
    timer.current = setTimeout(async () => {
      setBusy(true);
      const data = await buscarGlobal(q);
      setResults(data);
      setOpen(true);
      setBusy(false);
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);

  const ir = (href) => {
    setQuery('');
    setOpen(false);
    navigate(href);
  };

  const irTodos = (href) => {
    setQuery('');
    setOpen(false);
    navigate(href);
  };

  return (
    <header className="topbar glass-panel">
      {/* Mobile toggle */}
      <button className="icon-btn topbar-menu-btn" onClick={onToggleMobileMenu} aria-label="Abrir menú">
        <span className="material-symbols-outlined" style={{ color: 'var(--on-surface)' }}>menu</span>
      </button>

      {/* Breadcrumb */}
      <div className="topbar-crumb">
        <span className="label-caps text-secondary">SIT SISTEMA CONTROL</span>
        <span className="text-on-surface-variant">/</span>
        <span className="body-sm text-on-surface" style={{ fontWeight: '600' }}>Panel Central de Seguridad</span>
      </div>

      {/* Búsqueda funcional */}
      <div className="search-wrap" ref={boxRef}>
        <div className="search-container">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            placeholder="Buscar pedido, cliente, técnico, inventario..."
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (results.length) setOpen(true); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results.length) irTodos(results[0].href);
              if (e.key === 'Escape') setOpen(false);
            }}
          />
          {busy && <span className="material-symbols-outlined search-spinner">hourglass_top</span>}
          {query && (
            <button className="search-clear" type="button" onClick={() => { setQuery(''); setOpen(false); }} aria-label="Limpiar">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {open && (
          <div className="search-dropdown">
            {results.length > 0 ? (
              <>
                <div className="search-dropdown-head">Resultados ({results.length})</div>
                {results.slice(0, 12).map((r, i) => (
                  <button key={i} type="button" className="search-item" onClick={() => ir(r.href)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{TIPO_ICON[r.tipo] || 'search'}</span>
                    <span className="search-item-body">
                      <span className="body-sm text-on-surface">{r.titulo}</span>
                      <span className="label-caps text-on-surface-variant">{r.sub}</span>
                    </span>
                    <span className="badge badge-info" style={{ fontSize: '9px', textTransform: 'none' }}>{r.tipo}</span>
                  </button>
                ))}
              </>
            ) : !busy ? (
              <div className="search-dropdown-empty">Sin coincidencias para “{query}”.</div>
            ) : null}
          </div>
        )}
      </div>

      {/* Acciones derecha */}
      <div className="topbar-actions">
        <div className="status-pill" title="Estado del sistema">
          <span className="notification-dot" style={{ position: 'static', display: 'inline-block', background: 'var(--success)', width: '6px', height: '6px' }}></span>
          <span className="label-caps text-success">Sistemas OK</span>
        </div>

        <Link to="/perfil" className="topbar-user" title={`${profile?.email || ''}`}>
          {profile?.foto ? (
            <img src={profile.foto} alt="Foto de perfil" className="avatar-img" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <span className="material-symbols-outlined">account_circle</span>
          )}
          <div className="topbar-user-text">
            <span className="body-sm text-on-surface" style={{ fontWeight: 600 }}>{profile?.nombre || profile?.email || 'Usuario'}</span>
            <span className="label-caps text-on-surface-variant">{roleLabel}</span>
          </div>
        </Link>

        <button className="icon-btn" onClick={signOut} title="Cerrar sesión">
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>
    </header>
  );
}