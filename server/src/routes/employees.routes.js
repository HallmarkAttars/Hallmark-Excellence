const express = require('express')
const { requireAuth, requirePermission } = require('../middleware/auth.middleware')
const {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employees.controller')

const router = express.Router()

// --- Admin (protected + permission-checked) ---
// Employee management is restricted to Admin role — the matrix in
// config/roles.js decides, not the frontend.
router.get('/admin/employees', requireAuth, requirePermission('employees.view'), listEmployees)
router.post('/admin/employees', requireAuth, requirePermission('employees.create'), createEmployee)
router.patch('/admin/employees/:id', requireAuth, requirePermission('employees.edit'), updateEmployee)
router.delete('/admin/employees/:id', requireAuth, requirePermission('employees.delete'), deleteEmployee)

module.exports = router
