import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, DEMO_MODE } from '../lib/supabase'
import { checkPasswordStrength, PASSWORD_RULES } from '../lib/roles'

const STRENGTH_COLORS = ['var(--error)', 'var(--error)', 'var(--secondary)', 'var(--success)']
const STRENGTH_META = { 0: 'Muy débil', 1: 'Débil', 2: 'Aceptable', 3: 'Segura' }

// Página pública de activación de cuenta (enlace de invitación del admin).
// Verifica el token de invitación, deja definir la contraseña y activa el perfil.
export default function Activacion() {
  const [params] = useSearchParams()
  const [phase, setPhase] = useState('loading') // loading | form | done | error
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    const token = params.get('token_hash')
    const type = params.get('type') || 'invite'
    if (!token) {
      if (active) { setPhase('error'); setError('El enlace de activación es inválido o está incompleto.') }
      return
    }
    if (DEMO_MODE || !supabase) {
      if (active) { setPhase('error'); setError('La activación requiere Supabase Auth configurado.') }
      return
    }
    ;(async () => {
      const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: token, type })
      if (!active) return
      if (otpError) {
        const msg = /expired|invalid|expirado|inv[aá]lido/i.test(String(otpError.message))
          ? 'El enlace venció o ya fue utilizado. Pedile al administrador que regenere la invitación.'
          : otpError.message
        setPhase('error')
        setError(msg)
        return
      }
      setPhase('form')
    })()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const strength = checkPasswordStrength(password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!strength.allPass) { setError('La contraseña no cumple todos los requisitos de seguridad.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    setSubmitting(true)
    const { error: passError } = await supabase.auth.updateUser({ password })
    if (passError) {
      setSubmitting(false)
      setError(passError.message)
      return
    }
    // Activa el perfil (fila propia, permitido por RLS de perfiles).
    const { data: current } = await supabase.auth.getUser()
    const userId = current?.user?.id
    if (userId) {
      await supabase
        .from('profiles')
        .update({ estado: 'activo', activo: true, updated_at: new Date().toISOString() })
        .eq('id', userId)
    }
    setSubmitting(false)
    setPhase('done')
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card glass-panel">
        <div className="auth-logo">
          <img src="/tecnoinnova-logo.png" alt="TecnoInnova" style={{ objectFit: 'contain' }} />
          <div>
            <span className="headline-md text-on-surface" style={{ fontWeight: 700 }}>TecnoInnova</span>
            <span className="label-caps text-on-surface-variant">SIT · Seguridad Electrónica</span>
          </div>
        </div>

        {phase === 'loading' && (
          <>
            <h1 className="headline-md text-on-surface" style={{ fontWeight: 700 }}>Verificando invitación</h1>
            <p className="body-md text-on-surface-variant" style={{ marginTop: '12px' }}>
              Validando tu enlace de activación...
            </p>
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
            </div>
          </>
        )}

        {phase === 'error' && (
          <>
            <h1 className="headline-md text-on-surface" style={{ fontWeight: 700 }}>No se pudo activar la cuenta</h1>
            <div className="auth-error-banner" style={{ marginTop: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span> {error}
            </div>
            <p className="body-md text-on-surface-variant" style={{ marginTop: '16px' }}>
              El administrador puede regenerar el enlace de invitación desde el módulo de Usuarios.
            </p>
            <Link to="/login" className="btn btn-primary auth-submit" style={{ marginTop: '20px' }}>Ir a iniciar sesión</Link>
          </>
        )}

        {phase === 'form' && (
          <>
            <h1 className="headline-md text-on-surface" style={{ fontWeight: 700 }}>Activá tu cuenta</h1>
            <p className="body-md text-on-surface-variant" style={{ marginTop: '4px', marginBottom: '20px' }}>
              Definí tu contraseña de acceso al SIT. Debe cumplir los requisitos de seguridad.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <label className="auth-label" htmlFor="act-pass">Contraseña nueva</label>
              <input
                id="act-pass"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={submitting}
              />

              {password.length > 0 && (
                <div className="auth-strength">
                  <div className="auth-strength-track">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="auth-strength-seg"
                        style={{ background: i < strength.score ? STRENGTH_COLORS[strength.score] : 'var(--outline-variant)' }}
                      />
                    ))}
                  </div>
                  <span className="label-caps" style={{ color: STRENGTH_COLORS[strength.score] }}>{STRENGTH_META[strength.score]}</span>
                  <ul className="auth-rules">
                    {PASSWORD_RULES.map((rule) => {
                      const hit = strength.tests.find((t) => t.key === rule.key)?.pass
                      return (
                        <li key={rule.key} className={hit ? 'ok' : ''}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{hit ? 'check_circle' : 'radio_button_unchecked'}</span>
                          {rule.label}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              <label className="auth-label" htmlFor="act-confirm">Confirmar contraseña</label>
              <input
                id="act-confirm"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={submitting}
              />

              {error && <div className="auth-error-banner"><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span> {error}</div>}

              <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
                {submitting ? 'Activando...' : 'Activar cuenta'}
              </button>
            </form>
          </>
        )}

        {phase === 'done' && (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '56px', color: 'var(--success)' }}>verified</span>
            <h1 className="headline-md text-on-surface" style={{ fontWeight: 700, marginTop: '8px' }}>¡Cuenta activada!</h1>
            <p className="body-md text-on-surface-variant" style={{ marginTop: '8px' }}>
              Tu contraseña quedó configurada. Ya podés ingresar al sistema.
            </p>
            <Link to="/" className="btn btn-primary auth-submit" style={{ marginTop: '20px' }}>Ir al panel de control</Link>
          </>
        )}
      </div>
    </div>
  )
}
