import { createClient } from '@supabase/supabase-js'

// Función serverless que completa la activación de un usuario invitado.
// La invita el admin; el usuario abre el enlace /activar?token=..&email=..
// y define su contraseña. Aquí se valida el token (guardado en user_metadata
// por /api/invite, expira a las 24 h) y, si es válido, la service_role key:
//   1) fija la contraseña en Supabase Auth, y
//   2) marca el perfil como 'activo' para habilitar el login.
// El token es de un solo uso (alto entropía, UUID): tras usarlo se borra.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Mismas reglas que la UI (src/lib/roles.js): 8+, mayúscula, minúscula, número, símbolo.
function passwordError(password) {
  if (typeof password !== 'string' || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (!/[A-Z]/.test(password)) return 'La contraseña debe incluir una mayúscula (A-Z).'
  if (!/[a-z]/.test(password)) return 'La contraseña debe incluir una minúscula (a-z).'
  if (!/[0-9]/.test(password)) return 'La contraseña debe incluir un número (0-9).'
  if (!/[^A-Za-z0-9]/.test(password)) return 'La contraseña debe incluir un símbolo (ej: !@#$).'
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Falta configuración de Supabase en el servidor.' })
  }

  const { action = 'activate', token, email, password } = req.body || {}
  const cleanEmail = String(email || '').trim().toLowerCase()

  if (!EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: 'El correo del enlace es inválido.' })
  }
  if (!token || typeof token !== 'string' || token.length < 16) {
    return res.status(400).json({ error: 'El enlace de activación es inválido o está incompleto.' })
  }
  if (action === 'activate' && !String(password || '')) {
    return res.status(400).json({ error: 'La contraseña es obligatoria.' })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const notFound = () => res.status(400).json({ error: 'El enlace de activación es inválido o ya fue utilizado.' })

  // 1) Perfil asociado al correo.
  const { data: profile } = await admin
    .from('profiles').select('id, estado, activo').eq('email', cleanEmail).maybeSingle()
  if (!profile?.id) return notFound()

  // 2) Metadatos del usuario: token y expiración.
  const { data: u, error: uErr } = await admin.auth.admin.getUserById(profile.id)
  if (uErr || !u?.user) return notFound()
  const meta = u.user.user_metadata || {}
  if (meta.inv_token !== token) return notFound()
  const invExp = new Date(meta.inv_exp || 0).getTime()
  if (Number.isNaN(invExp) || invExp < Date.now()) {
    return res.status(400).json({ error: 'El enlace venció. Pedile al administrador que regenere la invitación.' })
  }

  // 3) Acción de solo verificación (para la página de activación).
  if (action === 'check') {
    return res.status(200).json({ ok: true })
  }

  // 4) Activar: validar contraseña, fijarla y activar el perfil.
  const pwErr = passwordError(password)
  if (pwErr) return res.status(400).json({ error: pwErr })

  const { error: passErr } = await admin.auth.admin.updateUserById(profile.id, { password })
  if (passErr) {
    return res.status(400).json({ error: passErr.message || 'No se pudo establecer la contraseña.' })
  }

  // 5) Marcar perfil activo y borrar el token (un solo uso).
  const { error: profErr } = await admin
    .from('profiles')
    .update({ estado: 'activo', activo: true, updated_at: new Date().toISOString() })
    .eq('id', profile.id)
  if (profErr) {
    console.error('[activar] update perfil:', profErr?.message)
  }
  const metaLimpiado = { ...meta, inv_token: null, inv_exp: null }
  await admin.auth.admin.updateUserById(profile.id, { user_metadata: metaLimpiado })

  return res.status(200).json({ ok: true, message: 'Cuenta activada. Ya puedes iniciar sesión.' })
}
