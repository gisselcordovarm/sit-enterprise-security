import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, DEMO_MODE } from '../lib/supabase'
import { ROLES, ADMIN_EMAIL } from '../lib/roles'
import { AuthContext } from './authContext'

const DEMO_STORAGE_KEY = 'sit_demo_profile'

function readDemoProfile() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

async function resolveProfile(userId, email) {
  // Modo demo (sin Supabase configurado): se autentica cualquier correo válido.
  if (DEMO_MODE || !supabase) {
    const saved = readDemoProfile()
    const isAdminEmail = String(email || '').toLowerCase() === ADMIN_EMAIL
    // Si hay perfil guardado y coincide el email, úsalo; si no, deriva rol del email actual.
    if (saved?.email && String(saved.email).toLowerCase() === String(email || '').toLowerCase()) return saved
    return { id: userId || 'demo', email: email || 'demo@sit.local', nombre: 'Sesión Demo', rol: isAdminEmail ? ROLES.ADMIN : ROLES.BASICO, activo: true }
  }
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (data) return { ...data, rol: data.rol || ROLES.BASICO }
  // No existe el perfil (usuario dado de alta antes del trigger): se crea por defecto.
  const defaultRol = String(email || '').toLowerCase() === ADMIN_EMAIL ? ROLES.ADMIN : ROLES.BASICO
  const { data: created } = await supabase
    .from('profiles')
    .insert({ id: userId, email, nombre: email, rol: defaultRol })
    .select('*').single()
  return created || { userId: userId, email, rol: defaultRol, activo: true }
}

export default function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, profile: null, loading: true })

  useEffect(() => {
    let active = true
    let subscription = null

    async function bootstrap() {
      if (DEMO_MODE || !supabase) {
        if (active) setState({ user: null, profile: null, loading: false })
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return

      if (session?.user) {
        const prof = await resolveProfile(session.user.id, session.user.email)
        if (active) setState({ user: session.user, profile: prof, loading: false })
      } else {
        setState({ user: null, profile: null, loading: false })
      }

      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (_event, sessionData) => {
        if (!active) return
        if (sessionData?.user) {
          const prof = await resolveProfile(sessionData.user.id, sessionData.user.email)
          setState({ user: sessionData.user, profile: prof, loading: false })
        } else {
          setState({ user: null, profile: null, loading: false })
        }
      })
      subscription = sub
    }

    bootstrap()

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const value = String(email || '').trim()
    if (DEMO_MODE || !supabase) {
      const isAdmin = value.toLowerCase() === ADMIN_EMAIL
      setState({
        user: { id: 'demo', email: value },
        profile: { id: 'demo', email: value, nombre: value, rol: isAdmin ? ROLES.ADMIN : ROLES.BASICO, activo: true },
        loading: false,
      })
      return null
    }
    const { data: signData, error } = await supabase.auth.signInWithPassword({ email: value, password })
    if (error) return error.message
    const prof = await resolveProfile(signData.user.id, signData.user.email)
    setState({ user: signData.user, profile: prof, loading: false })
    return null
  }, [])

  const signOut = useCallback(async () => {
    if (supabase && !DEMO_MODE) await supabase.auth.signOut()
    setState({ user: null, profile: null, loading: false })
  }, [])

  // Actualiza datos básicos del perfil (nombre, foto, teléfono, cargo).
  const updateProfile = useCallback(async (updates) => {
    const patch = {
      nombre: updates.nombre,
      foto: updates.foto ?? null,
      telefono: updates.telefono ?? null,
      cargo: updates.cargo ?? null,
    }
    if (DEMO_MODE || !supabase) {
      setState((s) => {
        const next = { ...s, profile: { ...s.profile, ...patch } }
        try { localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next.profile)) } catch { /* ignorar */ }
        return next
      })
      return null
    }
    const { error } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', state.profile?.id)
    if (error) return error.message
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }))
    return null
  }, [state.profile?.id])

  // Cambia la contraseña de la sesión actual. Exige la contraseña vigente:
  // se re-autentica primero y recién después se actualiza la clave.
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    if (!supabase || DEMO_MODE) return 'Cambio de contraseña desactivado en modo demostración.'
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: state.user?.email,
      password: currentPassword,
    })
    if (signError) return 'La contraseña actual es incorrecta.'
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return error ? error.message : null
  }, [state.user?.email])

  const value = useMemo(
    () => ({
      ...state,
      rol: state.profile?.rol || null,
      isAdminView: state.profile?.rol === ROLES.ADMIN,
      signIn,
      signOut,
      updateProfile,
      changePassword,
    }),
    [state, signIn, signOut, updateProfile, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}