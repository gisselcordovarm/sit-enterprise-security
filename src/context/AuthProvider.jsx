import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, DEMO_MODE } from '../lib/supabase'
import { ROLES, ADMIN_EMAIL } from '../lib/roles'
import { AuthContext } from './authContext'

async function resolveProfile(userId, email) {
  // Modo demo (sin Supabase configurado): se autentica cualquier correo válido.
  if (DEMO_MODE || !supabase) {
    const isAdminEmail = String(email || '').toLowerCase() === ADMIN_EMAIL
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

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!active) return
        if (session?.user) {
          const prof = await resolveProfile(session.user.id, session.user.email)
          setState({ user: session.user, profile: prof, loading: false })
        } else {
          setState({ user: null, profile: null, loading: false })
        }
      })

      return () => {
        active = false
        subscription?.unsubscribe()
      }
    }

    bootstrap()
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

  const value = useMemo(
    () => ({
      ...state,
      rol: state.profile?.rol || null,
      isAdminView: state.profile?.rol === ROLES.ADMIN,
      signIn,
      signOut,
    }),
    [state, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}