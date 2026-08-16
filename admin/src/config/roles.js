// ==========================================================================
// ROLES & PERMISSIONS (frontend mirror)
// --------------------------------------------------------------------------
// Used ONLY for UI gating (hiding sidebar links, route guards, disabling
// buttons). Real authorization is enforced server-side by the same matrix in
// server/src/config/roles.js — never trust this file for security.
// ==========================================================================

export const ROLES = ['admin', 'manager', 'staff']

export const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
}

const PERMISSION_MATRIX = {
  'dashboard.view': ['admin', 'manager', 'staff'],

  'products.view': ['admin', 'manager', 'staff'],
  'products.create': ['admin', 'manager'],
  'products.edit': ['admin', 'manager'],
  'products.delete': ['admin'],

  'orders.view': ['admin', 'manager', 'staff'],
  'orders.update_status': ['admin', 'manager', 'staff'],
  'orders.update_payment': ['admin', 'manager', 'staff'],
  'orders.delete': ['admin'],

  'categories.view': ['admin', 'manager'],
  'categories.create': ['admin', 'manager'],
  'categories.edit': ['admin', 'manager'],
  'categories.delete': ['admin'],

  'brands.view': ['admin', 'manager', 'staff'],
  'brands.edit': ['admin', 'manager'],
}

export function can(role, permission) {
  const allowed = PERMISSION_MATRIX[permission]
  return Array.isArray(allowed) && allowed.includes(role)
}
