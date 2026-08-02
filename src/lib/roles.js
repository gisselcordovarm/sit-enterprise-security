// =============================================================================
// MODELO DE ROLES Y PERMISOS DEL SISTEMA (SIT Enterprise Security)
// Dos niveles de acceso segÃ£n el documento de especificaciÃ³n:
//   - ADMIN  (Usuario Administrador): acceso total a todos los mÃ³dulos.
//   - BASICO (Usuario BÃ¡sico)       : acceso sÃ³ector a Pedidos y Operaciones.
// =============================================================================

export const ROLES = {
  ADMIN: 'admin',
  BASICO: 'basico',
}

export const ROL_LABELS = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.BASICO]: 'Usuario Básico',
}

export const ADMIN_EMAIL = 'admin@tecnoinnova.com'

// Catálogo de módulos y qué roles pueden acceder.
// La clave del módulo coincide con `path` para simplificar las guardias de ruta.
export const MODULES = [
  { key: 'dashboard',   path: '/',            label: 'Dashboard',   icon: 'dashboard',       roles: [ROLES.ADMIN, ROLES.BASICO] },
  { key: 'pedidos',     path: '/pedidos',     label: 'Pedidos',     icon: 'shopping_cart',    roles: [ROLES.ADMIN, ROLES.BASICO] },
  { key: 'operaciones', path: '/operaciones', label: 'Operaciones', icon: 'build',           roles: [ROLES.ADMIN, ROLES.BASICO] },
  { key: 'instalacion', path: '/instalacion', label: 'Instalación', icon: 'settings',         roles: [ROLES.ADMIN] },
  { key: 'finanzas',    path: '/finanzas',    label: 'Finanzas',    icon: 'payments',         roles: [ROLES.ADMIN] },
  { key: 'postventa',   path: '/postventa',   label: 'Postventa',   icon: 'support_agent',    roles: [ROLES.ADMIN] },
  { key: 'reportes',    path: '/reportes',    label: 'Reportes',    icon: 'summarize',         roles: [ROLES.ADMIN, ROLES.BASICO] },
  { key: 'usuarios',    path: '/usuarios',    label: 'Usuarios',    icon: 'manage_accounts', roles: [ROLES.ADMIN] },
]

export function canAccess(rol, moduleKey) {
  const mod = MODULES.find((m) => m.key === moduleKey)
  return mod ? mod.roles.includes(rol) : false
}

export function modulesFor(rol) {
  return MODULES.filter((m) => m.roles.includes(rol))
}

export function isAdmin(rol) {
  return rol === ROLES.ADMIN
}

// =============================================================================
// VALIDACIÓN DE EMAIL Y SEGURIDAD DE CONTRASEÑA
// =============================================================================

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export function validateEmail(email) {
  const value = (email || '').trim()
  if (!value) return { ok: false, error: 'El correo es obligatorio.' }
  if (!EMAIL_REGEX.test(value)) return { ok: false, error: 'Ingresá un correo válido, p. ej. usuario@dominio.com' }
  return { ok: true, error: '' }
}

// Criterios de seguridad obligatorios para la contraseña.
export const PASSWORD_RULES = [
  { key: 'length', test: (p) => p.length >= 8, label: 'Mínimo 8 caracteres' },
  { key: 'upper', test: (p) => /[A-Z]/.test(p), label: 'Una mayúscula (A-Z)' },
  { key: 'lower', test: (p) => /[a-z]/.test(p), label: 'Una minúscula (a-z)' },
  { key: 'number', test: (p) => /[0-9]/.test(p), label: 'Un número (0-9)' },
  { key: 'symbol', test: (p) => /[^A-Za-z0-9]/.test(p), label: 'Un símbolo (ej: !@#$)' },
]

export function checkPasswordStrength(password) {
  const tests = PASSWORD_RULES.map((rule) => ({ ...rule, pass: rule.test(password || '') }))
  const passed = tests.filter((t) => t.pass).length
  const allPass = passed === PASSWORD_RULES.length
  let score = 0
  if (passed >= 3) score = 1
  if (passed >= 4) score = 2
  if (allPass) score = 3
  return {
    score, // 0..3
    allPass,
    tests,
    label: ['Muy débil', 'Débil', 'Aceptable', 'Segura'][score],
  }
}

export function validatePassword(password) {
  if (!password) return { ok: false, message: 'La contraseña es obligatoria.' }
  if (password.length < 8) return { ok: false, message: 'Debe tener al menos 8 caracteres.' }
  return { ok: true, value: password }
}