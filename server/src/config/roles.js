// ==========================================================================
// ROLES & PERMISSIONS
// --------------------------------------------------------------------------
// Central authorization map for the admin panel. Every privileged operation
// is checked against this matrix SERVER-SIDE via requirePermission() — the
// frontend only uses a mirror for hiding UI, never for enforcement.
//
// Permission keys: "<module>.<action>" → roles allowed to perform it.
// ==========================================================================

const ROLES = ['admin', 'manager', 'staff']

const PERMISSION_MATRIX = {
  // Dashboard
  'dashboard.view': ['admin', 'manager', 'staff'],

  // Products
  'products.view': ['admin', 'manager', 'staff'],
  'products.create': ['admin', 'manager'],
  'products.edit': ['admin', 'manager'],
  'products.delete': ['admin'],

  // Orders
  'orders.view': ['admin', 'manager', 'staff'],
  'orders.update_status': ['admin', 'manager', 'staff'],
  // Payment confirmation — staff can mark an order Paid after manually
  // receiving the payment (no payment gateway exists).
  'orders.update_payment': ['admin', 'manager', 'staff'],
  'orders.delete': ['admin'],

  // Categories
  'categories.view': ['admin', 'manager'],
  'categories.create': ['admin', 'manager'],
  'categories.edit': ['admin', 'manager'],
  'categories.delete': ['admin'],

  // Brands
  'brands.view': ['admin', 'manager', 'staff'],
  'brands.edit': ['admin', 'manager'],
}

// True when `role` is allowed to perform `permission` (e.g. 'products.create').
function can(role, permission) {
  const allowed = PERMISSION_MATRIX[permission]
  return Array.isArray(allowed) && allowed.includes(role)
}

module.exports = { ROLES, PERMISSION_MATRIX, can }
