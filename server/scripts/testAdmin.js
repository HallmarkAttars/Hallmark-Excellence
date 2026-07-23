require('dotenv').config();
const http = require('http');

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
    email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
    password: process.env.ADMIN_PASSWORD || 'admin321',
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
