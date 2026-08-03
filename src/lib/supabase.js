import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null

export const DEMO_MODE = !isSupabaseConfigured

// Permite el ingreso de respaldo (cualquier correo, rol derivado del email)
// SOLO si se habilita explícitamente. En producción sin esta variable, el
// fallback queda desactivado y se exige autenticación real contra Supabase.
export const DEMO_FALLBACK_ENABLED = import.meta.env.VITE_ENABLE_DEMO_FALLBACK === 'true'
