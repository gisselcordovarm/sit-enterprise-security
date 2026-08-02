import { DEMO_MODE } from '../../lib/data';

export default function DataStatus({ loading, liveError }) {
  if (loading) {
    return (
      <div className="alert-item alert-item--info" style={{ marginBottom: '16px' }}>
        <span className="material-symbols-outlined">sync</span>
        <div className="alert-content">
          <p className="body-sm text-on-surface">Cargando datos desde la base de datos...</p>
        </div>
      </div>
    );
  }
  if (liveError) {
    return (
      <div className="alert-item alert-item--warning" style={{ marginBottom: '16px' }}>
        <span className="material-symbols-outlined">cloud_off</span>
        <div className="alert-content">
          <p className="body-sm text-on-surface">
            No se pudo conectar a la base de datos. Mostrando datos de demostración.
          </p>
        </div>
      </div>
    );
  }
  if (DEMO_MODE) {
    return (
      <div className="alert-item alert-item--info" style={{ marginBottom: '16px' }}>
        <span className="material-symbols-outlined">science</span>
        <div className="alert-content">
          <p className="body-sm text-on-surface">
            <strong>Modo demostración:</strong> configure{' '}
            <code style={{ fontFamily: 'var(--font-mono)' }}>VITE_SUPABASE_URL</code> y{' '}
            <code style={{ fontFamily: 'var(--font-mono)' }}>VITE_SUPABASE_ANON_KEY</code> para
            conectar a Supabase.
          </p>
        </div>
      </div>
    );
  }
  return null;
}
