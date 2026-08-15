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

async function apiGet(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // First login
  const loginData = JSON.stringify({
    email: envAdmin.username,
    password: envAdmin.password,
  });
  const token = await new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body).token); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
  
  console.log('Token obtained\n');
  
  // Test admin endpoints
  const endpoints = [
    '/api/admin/products',
    '/api/admin/categories',
    '/api/admin/orders',
    '/api/admin/stats',
    '/api/auth/verify'
  ];
  
  for (const ep of endpoints) {
    const result = await apiGet(ep, token);
    console.log(ep + ' [' + result.status + ']: ' + 
      (result.status === 200 ? 'OK' : JSON.stringify(result.body)));
  }
}

main().catch(e => console.error('Error:', e.message));
