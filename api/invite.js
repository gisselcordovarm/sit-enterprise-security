import { createClient } from '@supabase/supabase-js'

// Función serverless de Vercel (API). Usa la clave `service_role` SOLO en el
// servidor: nunca se expone al navegador. Valida que quien invoca sea un
// administrador autenticado antes de crear/regenerar invitaciones.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SITE_URL = process.env.SITE_URL || 'https://sit-enterprise-security.vercel.app'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Falta configuración de Supabase en el servidor.' })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'No autorizado' })

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1) Identifica al llamador con su JWT de sesión.
  const { data: caller, error: callerErr } = await admin.auth.getUser(token)
  if (callerErr || !caller?.user) {
    return res.status(401).json({ error: 'Sesión inválida. Volvé a iniciar sesión.' })
  }

  // 2) Exige rol administrador (enforcement a nivel de base de datos).
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('rol, estado, activo')
    .eq('id', caller.user.id)
    .maybeSingle()
  if (profileErr || !profile || profile.rol !== 'admin' || profile.activo === false) {
    return res.status(403).json({ error: 'Solo los administradores pueden invitar usuarios.' })
  }

  const { action = 'invite', email, nombre, rol } = req.body || {}
  const cleanEmail = String(email || '').trim().toLowerCase()

  if (!EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: 'Ingresá un correo válido.' })
  }
  if (action !== 'resend' && !String(nombre || '').trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio.' })
  }
  if (action !== 'resend' && !['admin', 'basico'].includes(rol)) {
    return res.status(400).json({ error: 'El rol debe ser "admin" o "basico".' })
  }

  const redirectTo = `${SITE_URL}/activar`

  try {
    if (action === 'resend') {
      // Regenera un token de invitación vigente para un usuario ya invitado
      // (no envía correo con SMTP nativo: se devuelve el enlace al admin para
      // que lo reenvíe; el token anterior queda invalidado).
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'invite',
        email: cleanEmail,
        options: { redirectTo },
      })
      if (error) throw error
      if (data?.user?.id) {
        await admin.from('profiles').update({ estado: 'pendiente' }).eq('id', data.user.id)
      }
      const link = `${redirectTo}?token_hash=${data?.token_hash}&type=invite`
      return res.status(200).json({ ok: true, link })
    }

    // Invitación inicial: crea el usuario sin contraseña y envía el correo de
    // activación con el enlace (token válido 24h, caducidad gestionada por Supabase).
    const { data, error } = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
      data: { nombre: String(nombre || '').trim(), rol },
      redirectTo,
    })
    if (error) throw error

    // Perfil: rol/nombre definitivos + estado 'pendiente' (autoridad del servidor).
    if (data?.user?.id) {
      await admin
        .from('profiles')
        .update({ nombre: String(nombre || '').trim(), rol, estado: 'pendiente', activo: false })
        .eq('id', data.user.id)
    }

    return res.status(200).json({ ok: true, message: 'Invitación enviada.' })
  } catch (err) {
    const message =
      String(err?.message || '').toLowerCase().includes('already registered')
        ? 'Ese correo ya tiene un usuario registrado.'
        : err?.message || 'No se pudo procesar la invitación.'
    return res.status(400).json({ error: message })
  }
}
