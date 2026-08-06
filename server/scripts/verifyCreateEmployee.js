// Focused verification for the "Failed to create employee" issue.
// Reproduces the create flow, shows the EXACT error, and proves the full
// success path (create → login → verify role → delete) for a permitted role.
//   PORT=5002 node scripts/verifyCreateEmployee.js
require('dotenv').config()
const http = require('http')

const PORT = Number(process.env.PORT || 5000)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin321'
const UNIQ = Date.now()

function req(path, { method = 'GET', token, body } = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null
    const r = http.request(
      {
        hostname: 'localhost', port: PORT, path, method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = ''
        res.on('data', (c) => (raw += c))
        res.on('end', () => {
          let json = null
          try { json = JSON.parse(raw) } catch {}
          resolve({ status: res.statusCode, json })
        })
      }
    )
    r.on('error', (e) => resolve({ status: 0, error: e.message }))
    if (data) r.write(data)
    r.end()
  })
}

async function main() {
  console.log(`\n=== Create Employee — root-cause verification (port ${PORT}) ===\n`)

  const loginRes = await req('/api/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  const token = loginRes.json?.token
  console.log(`1. Admin login: ${token ? 'OK' : 'FAILED ' + JSON.stringify(loginRes.json)}`)
  if (!token) process.exit(1)

  // --- Reproduce the reported failure: role = staff ----------------------
  const staffAttempt = await req('/api/admin/employees', {
    method: 'POST',
    token,
    body: {
      first_name: 'Fail', last_name: 'Probe', email: `failprobe-${UNIQ}@example.com`,
      phone: '', role: 'staff', password: 'tempPass123',
    },
  })
  console.log(`2. Create employee (role=staff): HTTP ${staffAttempt.status}`)
  console.log(`   → UI will now show: "${staffAttempt.json?.error || '(no message)'}"`)
  console.log('   (Before this fix it showed the generic "Failed to create employee.")')
  const isUseful = /migration/i.test(staffAttempt.json?.error || '')
  console.log(`   Useful-message check: ${isUseful ? 'PASS' : 'FAIL'}`)

  // --- Prove the full success flow with a permitted role (admin) ---------
  const created = await req('/api/admin/employees', {
    method: 'POST',
    token,
    body: {
      first_name: 'Verify', last_name: 'User', email: `verify-${UNIQ}@example.com`,
      phone: '9876540000', role: 'admin', password: 'tempPass123',
    },
  })
  const empId = created.json?.employee?.id
  console.log(`3. Create employee (role=admin): HTTP ${created.status} — ${created.status === 201 ? 'SUCCESS' : 'FAILED'}`)

  if (created.status === 201 && empId) {
    const list = await req('/api/admin/employees', { token })
    console.log(`4. Employee appears in list: ${list.json?.employees?.some((e) => e.id === empId) ? 'PASS' : 'FAIL'}`)

    const empLogin = await req('/api/auth/login', {
      method: 'POST', body: { email: `verify-${UNIQ}@example.com`, password: 'tempPass123' },
    })
    console.log(`5. New employee can log in: ${Boolean(empLogin.json?.token) ? 'PASS' : 'FAIL'}`)

    if (empLogin.json?.token) {
      const verify = await req('/api/auth/verify', { token: empLogin.json.token })
      console.log(`6. Role loaded: ${verify.json?.admin?.role === 'admin' ? 'PASS (' + verify.json.admin.role + ')' : 'FAIL'} — status active: ${verify.json?.admin?.is_active === true ? 'PASS' : 'FAIL'}`)
      // Deactivated login block check
      await req(`/api/admin/employees/${empId}`, { method: 'PATCH', token, body: { is_active: false } })
      const blockedLogin = await req('/api/auth/login', {
        method: 'POST', body: { email: `verify-${UNIQ}@example.com`, password: 'tempPass123' },
      })
      console.log(`7. Deactivated employee CANNOT log in: ${!blockedLogin.json?.token ? 'PASS' : 'FAIL'}`)
    }

    // Cleanup
    const del = await req(`/api/admin/employees/${empId}`, { method: 'DELETE', token })
    console.log(`8. Test employee deleted (cleanup): HTTP ${del.status}`)
  }

  // No plaintext password check — verify the row never exposes password_hash.
  const listAll = await req('/api/admin/employees', { token })
  const noHash = listAll.json?.employees?.every((e) => e.password_hash === undefined)
  console.log(`9. No password_hash exposed in list API: ${noHash ? 'PASS' : 'FAIL'}`)

  console.log('\nDone. (Root cause: users_role_check DB constraint blocks roles other than admin.)')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
