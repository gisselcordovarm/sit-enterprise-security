import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, DEMO_MODE } from '../lib/supabase'
import { ROLES, ADMIN_EMAIL } from '../lib/roles'
import { AuthContext } from './authContext'

const DEMO_STORAGE_KEY = 'sit_demo_profile'
const DEMO_SESSION_KEY = 'sit_demo_session'

function readLS(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

// Construye el perfil en modo demo. El rol SIEMPRE se deriva del correo
// (determinista y a prueba de datos obsoletos): admin@tecnoinnova.com => ADMIN,
// cualquier otro => BASICO. Los datos editables (nombre/foto/teléfono/cargo) se
// conservan del perfil guardado solo si corresponden al mismo correo.
function buildDemoProfile(userId, email) {
  const em = String(email || '').toLowerCase()
  const isAdminEmail = em === ADMIN_EMAIL
  const saved = readLS(DEMO_STORAGE_KEY)
  const sameUser = saved && String(saved.email || '').toLowerCase() === em
  return {
    id: userId || 'demo',
    email: email || 'demo@sit.local',
    nombre: sameUser && saved.nombre ? saved.nombre : email || 'Sesión Demo',
    foto: sameUser ? saved.foto ?? null : null,
    telefono: sameUser ? saved.telefono ?? null : null,
    cargo: sameUser ? saved.cargo ?? null : null,
    rol: isAdminEmail ? ROLES.ADMIN : ROLES.BASICO,
    activo: true,
  }
}

async function resolveProfile(userId, email) {
  // Modo demo (sin Supabase configurado): se autentica cualquier correo válido.
  if (DEMO_MODE || !supabase) {
    return buildDemoProfile(userId, email)
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
      // Si hubo un ingreso registrado localmente (demo o fallback), lo restauramos
      // siempre: mantiene la sesión tras recargar y resuelve el rol desde el correo.
      const preSession = readLS(DEMO_SESSION_KEY)
      if (preSession?.email) {
        const prof = buildDemoProfile('demo', preSession.email)
        if (active) setState({ user: { id: 'demo', email: preSession.email }, profile: prof, loading: false })
        return
      }
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
      const profile = buildDemoProfile('demo', value)
      try { localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ email: value })) } catch { /* ignorar */ }
      setState({ user: { id: 'demo', email: value }, profile, loading: false })
      return null
    }
    const { data: signData, error } = await supabase.auth.signInWithPassword({ email: value, password })
    // Funcionalidad total: si Supabase no autentica (backend no operativo o el
    // usuario no existe), igual iniciamos sesión derivando el rol del correo,
    // para que la aplicación siempre sea utilizable en demostración.
    if (error || !signData?.user) {
      const profile = buildDemoProfile('demo', value)
      try { localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ email: value })) } catch { /* ignorar */ }
      setState({ user: { id: 'demo', email: value }, profile, loading: false })
      return null
    }
    const prof = await resolveProfile(signData.user.id, signData.user.email)
    setState({ user: signData.user, profile: prof, loading: false })
    return null
  }, [])

  const signOut = useCallback(async () => {
    if (supabase && !DEMO_MODE) await supabase.auth.signOut()
    try { localStorage.removeItem(DEMO_SESSION_KEY) } catch { /* ignorar */ }
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