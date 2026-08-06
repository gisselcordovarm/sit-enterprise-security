import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, DEMO_MODE } from '../lib/supabase'
import { checkPasswordStrength, PASSWORD_RULES } from '../lib/roles'
import { checkActivation, activateAccount } from '../lib/data'

const STRENGTH_COLORS = ['var(--error)', 'var(--error)', 'var(--secondary)', 'var(--success)']
const STRENGTH_META = { 0: 'Muy débil', 1: 'Débil', 2: 'Aceptable', 3: 'Segura' }

// Página pública de activación de cuenta (enlace de invitación del admin).
// Dos tipos de enlace:
//   - ?token=<uuid>&email=..  : token propio generado por /api/invite.
//     La contraseña se fija a través de /api/activar (service role).
//   - ?token_hash=..&email=.. : enlace nativo de Supabase (correo enviado).
//     Se valida con verifyOtp y la contraseña se fija con updateUser.
export default function Activacion() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState(null) // 'token' | 'native'
  const [phase, setPhase] = useState('loading') // loading | form | done | error
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    const rawToken = params.get('token')
    const emailParam = params.get('email')
    const tokenHash = params.get('token_hash')
    const type = params.get('type') || 'invite'

    if (!rawToken && !tokenHash) {
      if (active) { setPhase('error'); setError('El enlace de activación es inválido o está incompleto.') }
      return
    }
    if (DEMO_MODE || !supabase) {
      if (active) { setPhase('error'); setError('La activación requiere Supabase Auth configurado.') }
      return
    }
    ;(async () => {
      // Token propio (generado por el admin vía /api/invite).
      if (rawToken && emailParam) {
        try {
          await checkActivation({ token: rawToken, email: emailParam })
          if (!active) return
          setMode('token')
          setPhase('form')
        } catch (err) {
          if (!active) return
          setMode('token')
          setPhase('error')
          setError(err.message || 'El enlace de activación es inválido o ya fue utilizado.')
        }
        return
      }
      // Enlace nativo de Supabase (token_hash del correo).
      if (tokenHash) {
        const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        if (!active) return
        if (otpError) {
          setMode('native')
          setPhase('error')
          setError(/expired|invalid|expirado|inv[aá]lido/i.test(String(otpError.message))
            ? 'El enlace venció o ya fue utilizado. Pedile al administrador que regenere la invitación.'
            : otpError.message)
          return
        }
        setMode('native')
        setPhase('form')
      }
    })()
    return () => { active = false }
  }, [params])

  const strength = checkPasswordStrength(password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!strength.allPass) { setError('La contraseña no cumple todos los requisitos de seguridad.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    setSubmitting(true)
    try {
      if (mode === 'token') {
        await activateAccount({
          token: params.get('token'),
          email: params.get('email'),
          password,
        })
      } else {
        // Flujo nativo: sesión ya validada con verifyOtp; fijar contraseña.
        const { error: passError } = await supabase.auth.updateUser({ password })
        if (passError) throw new Error(passError.message)
        const { data: current } = await supabase.auth.getUser()
        const userId = current?.user?.id
        if (userId) {
          await supabase
            .from('profiles')
            .update({ estado: 'activo', activo: true, updated_at: new Date().toISOString() })
            .eq('id', userId)
        }
      }
      setSubmitting(false)
      setPhase('done')
    } catch (err) {
      setSubmitting(false)
      setError(err.message || 'No se pudo activar la cuenta. Prueba nuevamente.')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card glass-panel">
        <div className="auth-brand">
          <img src="/tecnoinnova-logo.png" alt="TecnoInnova" />
          <span className="headline-md text-on-surface" style={{ fontWeight: 700 }}>TecnoInnova</span>
          <span className="label-caps text-on-surface-variant">SIT · Seguridad Electrónica</span>
        </div>

        {phase === 'loading' && (
          <>
            <h1 className="headline-md text-on-surface" style={{ fontWeight: 700, textAlign: 'center' }}>Verificando invitación</h1>
            <p className="body-md text-on-surface-variant" style={{ marginTop: '12px', textAlign: 'center' }}>
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
            <h1 className="headline-md text-on-surface" style={{ fontWeight: 700 }}>Activa tu cuenta</h1>
            <p className="body-md text-on-surface-variant" style={{ marginTop: '4px', marginBottom: '20px' }}>
              Define tu contraseña de acceso al SIT.
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
              Tu contraseña quedó configurada. Ya puedes ingresar al sistema.
            </p>
            <Link to="/" className="btn btn-primary auth-submit" style={{ marginTop: '20px' }}>Ir al panel de control</Link>
          </>
        )}
      </div>
    </div>
  )
}
