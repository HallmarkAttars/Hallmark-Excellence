require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });
const http = require('http');
const { getEnvAdminConfig } = require('../src/config/envAdmin');

// Credentials come ONLY from server-side env (server/.env.local) — never
// hardcoded in this script.
const envAdmin = getEnvAdminConfig();
if (!envAdmin.configured) {
  console.error('ADMIN_USERNAME / ADMIN_PASSWORD must be set in server/.env.local');
  process.exit(1);
}

async function main() {
  // Login
  const loginData = JSON.stringify({
    email: envAdmin.username,
    password: envAdmin.password,
  });
  const token = await new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
    };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve(JSON.parse(body).token));
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  // Test GET verify
  const result = await new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 5000, path: '/api/auth/verify', method: 'GET',
      headers: { Authorization: 'Bearer ' + token }
    };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });

  console.log('GET /api/auth/verify [' + result.status + ']:', result.body);
}

main().catch(e => console.error(e.message));
