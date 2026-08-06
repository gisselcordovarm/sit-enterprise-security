import { createClient } from '@supabase/supabase-js'
import { sendActivationEmail } from '../mailer.js'

// Función serverless de Vercel (API). Usa la clave `service_role` SOLO en el
// servidor: nunca se expone al navegador. Valida que quien invoca sea un
// administrador autenticado antes de crear/regenerar invitaciones.
//
// El flujo NO depende del servicio de correo de Supabase (que en este proyecto
// responde timeout/504). En su lugar se crea el usuario sin contraseña, se
// genera un token de invitación propio (UUID, válido 24 h) que se guarda en
// `user_metadata`, y se devuelve al administrador el enlace de activación:
//   https://<site>/activar?token=<uuid>&email=<correo>
// El usuario usa ese enlace para fijar su contraseña (lo valida /api/activar).

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SITE_URL = process.env.SITE_URL || 'https://sit-enterprise-security.vercel.app'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const INVITE_TTL_MS = 24 * 60 * 60 * 1000 // 24 horas

function errBody(err) {
  return {
    error: err?.message || 'No se pudo procesar la invitación.',
    code: err?.code || null,
    status: err?.status || null,
    details: err?.details || null,
    hint: err?.hint || null,
  }
}

// Devuelve una copia de los metadatos con el token de invitación regenerado.
function buildMetadata(base, invToken, invExp) {
  return {
    ...(base || {}),
    inv_token: invToken,
    inv_exp: invExp,
  }
}

async function setInviteToken(admin, userId, baseMeta) {
  const invToken = crypto.randomUUID()
  const invExp = new Date(Date.now() + INVITE_TTL_MS).toISOString()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: buildMetadata(baseMeta, invToken, invExp),
  })
  if (error) throw error
  return invToken
}

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
    console.error('[invite] auth getUser error:', callerErr?.status, callerErr?.message, 'url:', SUPABASE_URL)
    return res.status(401).json({
      error: 'Sesión inválida. Vuelve a iniciar sesión.',
      authError: callerErr?.message || 'usuario no encontrado',
      authStatus: callerErr?.status || null,
    })
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
    return res.status(400).json({ error: 'Ingresa un correo válido.' })
  }
  if (action !== 'resend' && !String(nombre || '').trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio.' })
  }
  const VALID_ROLES = ['admin', 'basico', 'vendedor', 'logistica', 'tecnico', 'soporte']
  if (action !== 'resend' && !VALID_ROLES.includes(rol)) {
    return res.status(400).json({ error: 'El rol debe ser uno válido: vendedor, logistica, tecnico, soporte, basico o admin.' })
  }

  try {
    // ---- Regenera el token de invitación de un usuario ya existente ----
    if (action === 'resend') {
      const { data: prof } = await admin
        .from('profiles').select('id').eq('email', cleanEmail).maybeSingle()
      if (!prof?.id) {
        return res.status(404).json({ error: 'Ese correo no tiene un usuario invitado.' })
      }
      const { data: u, error: uErr } = await admin.auth.admin.getUserById(prof.id)
      if (uErr || !u?.user) throw uErr || new Error('No se encontró el usuario.')
      const invToken = await setInviteToken(admin, prof.id, u.user.user_metadata)
      try {
        await admin.from('profiles').update({ estado: 'pendiente', activo: false }).eq('id', prof.id)
      } catch (e) { console.error('[invite] update estado pendiente:', e?.message) }
      const link = `${SITE_URL}/activar?token=${encodeURIComponent(invToken)}&email=${encodeURIComponent(cleanEmail)}`
      const mail = await sendActivationEmail({ to: cleanEmail, link, name: u.user.user_metadata?.nombre })
      console.log('[invite] resend mail:', mail.ok ? 'enviado' : 'no enviado (' + mail.error + ')')
      return res.status(200).json({
        ok: true,
        link,
        emailSent: mail.ok,
        message: mail.ok
          ? 'Invitación regenerada. Se envió el correo de activación.'
          : 'Enlace de activación regenerado (válido 24 h). No se pudo enviar el correo: ' + (mail.error || 'revisa MAILTRAP_API_TOKEN'),
      })
    }

    // ---- Invitación inicial ----
    // Buscar si el usuario ya existe (por su perfil).
    const { data: prof } = await admin
      .from('profiles').select('id').eq('email', cleanEmail).maybeSingle()
    let userId = prof?.id || null

    if (!userId) {
      // Crear el usuario sin contraseña. El correo se marca como confirmado
      // (lo validó el admin al invitar); el perfil nace en estado 'pendiente'
      // y el acceso queda bloqueado hasta que fije su contraseña.
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: cleanEmail,
        password: null,
        email_confirm: true,
        user_metadata: { nombre: String(nombre || '').trim(), rol },
      })
      if (cErr) {
        if (String(cErr.message || '').toLowerCase().includes('already registered')) {
          return res.status(400).json({ error: 'Ese correo ya tiene un usuario registrado.' })
        }
        throw cErr
      }
      userId = created?.user?.id
      if (!userId) throw new Error('No se pudo crear el usuario.')
    }

    // Emitir el token de invitación (24 h) sobre los metadatos actuales.
    const { data: u, error: uErr } = await admin.auth.admin.getUserById(userId)
    if (uErr || !u?.user) throw uErr || new Error('No se encontró el usuario.')
    const invToken = await setInviteToken(admin, userId, u.user.user_metadata)

    // Perfil: rol/nombre definitivos + estado pendiente (no fatal).
    try {
      await admin
        .from('profiles')
        .update({ nombre: String(nombre || '').trim(), rol, estado: 'pendiente', activo: false })
        .eq('id', userId)
    } catch (e) { console.error('[invite] update perfil:', e?.message) }

    const link = `${SITE_URL}/activar?token=${encodeURIComponent(invToken)}&email=${encodeURIComponent(cleanEmail)}`
    const mail = await sendActivationEmail({ to: cleanEmail, link, name: String(nombre || '').trim() })
    console.log('[invite] invite mail:', mail.ok ? 'enviado' : 'no enviado (' + mail.error + ')')

    return res.status(200).json({
      ok: true,
      link,
      emailSent: mail.ok,
      message: mail.ok
        ? 'Invitación creada. Se envió el correo de activación.'
        : 'Invitación creada. No se pudo enviar el correo: ' + (mail.error || 'revisa MAILTRAP_API_TOKEN') + '. Usa el enlace generado.',
    })
  } catch (err) {
    return res.status(400).json(errBody(err))
  }
}
