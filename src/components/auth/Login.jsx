import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import { validateEmail, validatePassword, checkPasswordStrength, PASSWORD_RULES } from '../../lib/roles'

const STRENGTH_COLORS = ['var(--error)', 'var(--error)', 'var(--secondary)', 'var(--success)']

export default function Login() {
  const { user, loading, signIn, notice, clearNotice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passError, setPassError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Aviso de bloqueo (cuenta desactivada / pendiente) emitido por AuthProvider.
  const displayError = formError || notice

  const strength = checkPasswordStrength(password)
  const strengthsMeta = { 0: 'Muy débil', 1: 'Débil', 2: 'Aceptable', 3: 'Segura' }

  if (!loading && user) return <Navigate to={from} replace />

  const handleEmailChange = (e) => {
    setEmail(e.target.value)
    if (emailError) setEmailError('')
    if (notice) clearNotice()
  }

  const handlePasswordChange = (e) => {
    const v = e.target.value
    setPassword(v)
    if (passError) setPassError('')
    if (notice) clearNotice()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (notice) clearNotice()

    const mailCheck = validateEmail(email)
    if (!mailCheck.ok) { setEmailError(mailCheck.error); return }

    const passCheck = validatePassword(password)
    if (!passCheck.ok) { setPassError(passCheck.message); return }

    setSubmitting(true)
    const err = await signIn(email, password)
    setSubmitting(false)
    if (err) {
      setFormError(err)
      return
    }
    navigate(from, { replace: true })
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

        <h1 className="headline-md text-on-surface" style={{ fontWeight: 700, textAlign: 'center' }}>Iniciar sesión</h1>
        <p className="body-md text-on-surface-variant" style={{ marginTop: '4px', marginBottom: '20px', textAlign: 'center' }}>
          Ingresa tus credenciales para acceder al panel de control.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <label className="auth-label" htmlFor="login-email">Correo electrónico</label>
          <input
            id="login-email"
            type="email"
            className={`auth-input ${emailError ? 'auth-input-invalid' : ''}`}
            placeholder="usuario@dominio.com"
            value={email}
            onChange={handleEmailChange}
            autoComplete="email"
            disabled={submitting}
          />
          {emailError && <p className="auth-field-error">{emailError}</p>}

          {/* Password */}
          <label className="auth-label" htmlFor="login-pass">Contraseña</label>
          <div className={`auth-pass-wrap ${passError ? 'auth-input-invalid' : ''}`}>
            <input
              id="login-pass"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              disabled={submitting}
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          {passError && <p className="auth-field-error">{passError}</p>}

          {/* Strength meter */}
          {password.length > 0 && !passError && (
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
              <span className="label-caps" style={{ color: STRENGTH_COLORS[strength.score] }}>
                {strengthsMeta[strength.score]}
              </span>
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

          {/* Server error */}
          {displayError && <div className="auth-error-banner"><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span> {displayError}</div>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
            {submitting ? 'Verificando...' : 'Ingresar al sistema'}
          </button>
        </form>
      </div>
    </div>
  )
}