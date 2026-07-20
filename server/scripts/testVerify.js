require('dotenv').config();
const http = require('http');

async function main() {
  // Login
  const loginData = JSON.stringify({ email: 'admin@gmail.com', password: 'admin321' });
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

