import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAlertas } from '../../lib/data';

const STYLE_BY_TYPE = {
  error: { color: 'var(--error)', icon: 'error' },
  warning: { color: 'var(--secondary)', icon: 'warning' },
  success: { color: 'var(--success)', icon: 'check_circle' },
  info: { color: 'var(--primary)', icon: 'info' },
};

const READ_KEY = 'sit_notif_read_at';

export default function NotificationsMenu({ align = 'right' }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAlertas();
      setAlerts(data || []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const lastRead = Number(window.localStorage.getItem(READ_KEY) || 0);
  const unread = alerts.filter((a) => {
    const t = a.fecha ? new Date(a.fecha).getTime() : 0;
    return Number.isFinite(t) && t > lastRead;
  }).length;

  const toggle = () => setOpen((o) => !o);

  const markAllRead = () => {
    try { window.localStorage.setItem(READ_KEY, String(Date.now())); } catch { /* ignorar */ }
    setOpen(false);
  };

  return (
    <div ref={boxRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        className="icon-btn"
        title="Notificaciones"
        aria-label="Notificaciones"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={toggle}
        style={{ position: 'relative' }}
      >
        <span className="material-symbols-outlined">notifications</span>
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              minWidth: '16px',
              height: '16px',
              borderRadius: '9999px',
              background: 'var(--error)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              lineHeight: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: align === 'right' ? 0 : 'auto',
            left: align === 'left' ? 0 : 'auto',
            width: '360px',
            maxWidth: 'calc(100vw - 24px)',
            background: 'var(--surface-container-highest)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
            zIndex: 150,
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(199, 196, 214, 0.4)' }}>
            <span className="body-md text-on-surface" style={{ fontWeight: 700 }}>Notificaciones</span>
            {unread > 0 && (
              <button type="button" className="body-sm text-primary" onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Marcar leído ({unread})
              </button>
            )}
          </div>

          <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
            {loading && alerts.length === 0 ? (
              <div className="body-sm text-on-surface-variant" style={{ padding: '24px', textAlign: 'center' }}>Cargando…</div>
            ) : alerts.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>notifications_off</span>
                <span className="body-sm">No hay notificaciones.</span>
              </div>
            ) : (
              alerts.slice(0, 10).map((a) => {
                const st = STYLE_BY_TYPE[a.type] || STYLE_BY_TYPE.info;
                return (
                  <div
                    key={a.id}
                    style={{ display: 'flex', gap: '10px', padding: '10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onClick={() => setOpen(false)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(104, 98, 233, 0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="material-symbols-outlined" style={{ color: st.color, fontSize: '20px', marginTop: '1px' }}>{st.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="body-sm text-on-surface" style={{ fontWeight: 700 }}>{a.title}</p>
                      <p className="body-sm text-on-surface-variant" style={{ fontSize: '12px', marginTop: '2px', lineHeight: '1.4' }}>{a.description}</p>
                      <span className="label-caps text-on-surface-variant" style={{ fontSize: '10px', marginTop: '6px', display: 'block' }}>{a.time}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(199, 196, 214, 0.4)', textAlign: 'center' }}>
            <button type="button" className="body-sm text-primary" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }} onClick={() => { setOpen(false); navigate('/'); }}>
              Ver alertas del panel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
