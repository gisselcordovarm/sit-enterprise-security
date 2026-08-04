// Envío de correos de activación vía Mailtrap Sending API.
// Este archivo vive fuera de `api/` a propósito: así Vercel no lo expone como
// endpoint, solo lo empaqueta en las funciones serverless que lo importan.
//
// Variables de entorno (solo servidor, configurar en Vercel):
//   MAILTRAP_API_TOKEN  (obligatorio) – token de la API de Mailtrap Sending.
//   MAILTRAP_FROM_EMAIL (opcional) – remitente; por defecto no-reply@tecnoinnova.vercel.app
//   MAILTRAP_FROM_NAME  (opcional) – nombre visible del remitente.

const MAILTRAP_SEND_URL = 'https://send.api.mailtrap.io/api/send'

const DEFAULT_FROM_EMAIL = 'no-reply@tecnoinnova.vercel.app'
const DEFAULT_FROM_NAME = 'SIT · TecnoInnova'

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Arma el contenido del correo de activación de invitación.
export function activationEmail({ link, name }) {
  const userName = escapeHtml(name || 'usuario')
  const subject = 'Tu invitación al SIT · TecnoInnova'
  const text =
    `Hola ${name || 'usuario'}, te invitaron al sistema SIT (Seguridad Electrónica).\n\n` +
    `Activá tu cuenta definiendo tu contraseña con este enlace (válido por 24 horas):\n${link}\n\n` +
    `Si el botón no funciona, copiá y pegá el enlace en el navegador.\n\n` +
    `Saludos,\nEquipo TecnoInnova`
  const html =
    `<!doctype html><html><body style="margin:0;padding:0;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif">` +
    `<div style="max-width:520px;margin:0 auto;padding:24px">` +
    `<div style="background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e3e8f0">` +
    `<div style="font-size:18px;font-weight:700;color:#102a43">SIT · TecnoInnova</div>` +
    `<div style="font-size:12px;color:#5b7b9a;margin-bottom:20px">Seguridad Electrónica</div>` +
    `<p style="color:#102a43;font-size:15px;line-height:1.5">Hola <b>${userName}</b>, te invitaron a usar el sistema SIT (Seguridad Electrónica).</p>` +
    `<p style="color:#102a43;font-size:15px;line-height:1.5">Activá tu cuenta definiendo tu contraseña de acceso:</p>` +
    `<div style="text-align:center;margin:24px 0">` +
    `<a href="${link}" style="display:inline-block;background:#1565c0;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 24px;border-radius:8px">Activar mi cuenta</a>` +
    `</div>` +
    `<p style="color:#5b7b9a;font-size:12px;line-height:1.5">Este enlace es válido por 24 horas. Si el botón no funciona, copiá y pegá esta dirección en tu navegador:<br/><span style="word-break:break-all;color:#1565c0">${link}</span></p>` +
    `<p style="color:#5b7b9a;font-size:12px;margin-top:20px">Saludos,<br/>Equipo TecnoInnova</p>` +
    `</div></div></body></html>`
  return { subject, text, html }
}

// Envía el correo por Mailtrap. Nunca lanza: devuelve { ok, ... }.
export async function sendEmail({ to, subject, text, html }) {
  const apiToken = process.env.MAILTRAP_API_TOKEN
  if (!apiToken) {
    return { ok: false, skipped: true, error: 'MAILTRAP_API_TOKEN no configurado en el servidor.' }
  }
  const fromEmail = process.env.MAILTRAP_FROM_EMAIL || DEFAULT_FROM_EMAIL
  const fromName = process.env.MAILTRAP_FROM_NAME || DEFAULT_FROM_NAME

  try {
    const res = await fetch(MAILTRAP_SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        from: { email: fromEmail, name: fromName },
        to: [{ email: to }],
        subject,
        text,
        html,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const detail = Array.isArray(body?.errors)
        ? body.errors.map((e) => (typeof e === 'string' ? e : e?.message || JSON.stringify(e))).join('; ')
        : body?.message || res.statusText
      return { ok: false, status: res.status, error: detail }
    }
    return { ok: true, id: body?.message_ids?.[0] || null }
  } catch (e) {
    return { ok: false, error: e?.message || 'Error de red al enviar el correo.' }
  }
}

// Atajo para el correo de activación de invitación.
export async function sendActivationEmail({ to, link, name }) {
  const content = activationEmail({ link, name })
  return sendEmail({ to, ...content })
}
