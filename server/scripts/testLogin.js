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

const data = JSON.stringify({
  email: envAdmin.username,
  password: envAdmin.password,
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
    try {
      const parsed = JSON.parse(body);
      console.log('Parsed:', JSON.stringify(parsed, null, 2));
      if (parsed.token) {
        console.log('\nTEST TOKEN:', parsed.token.substring(0, 50) + '...');
      }
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
