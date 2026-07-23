require('dotenv').config();
const http = require('http');

const data = JSON.stringify({
  email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
  password: process.env.ADMIN_PASSWORD || 'admin321',
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
