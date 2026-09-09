require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '../.env.local', override: true });
const http = require('http');

const app = require('../src/app');

async function makeRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      if (token) options.headers['Authorization'] = `Bearer ${token}`;
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          server.close();
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      
      req.on('error', (err) => {
        server.close();
        reject(err);
      });
      
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

async function run() {
  console.log('=== Step 1: Login ===');
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    email: 'admin@test.com',
    password: 'test123'
  });
  console.log('Login status:', loginRes.status);
  console.log('Login body:', JSON.stringify(loginRes.body).substring(0, 200));
  
  const token = loginRes.body?.token;
  if (!token) {
    console.log('NO TOKEN - cannot proceed');
    return;
  }
  console.log('Token obtained: yes');
  
  console.log('\n=== Step 2: Create product via API ===');
  const createRes = await makeRequest('POST', '/api/admin/products', {
    name: 'API Test Product ' + Date.now(),
    description: 'Testing product creation via API',
    category_id: null,
    brand_id: null,
    image: null,
    is_active: true,
    is_featured: false,
    variants: [
      {
        quantity_value: 100,
        quantity_unit: 'ML',
        display_label: '100 ML',
        total_price: 1000,
        price_per_unit: 10,
        is_default: true
      }
    ]
  }, token);
  
  console.log('Create status:', createRes.status);
  console.log('Create body:', JSON.stringify(createRes.body, null, 2).substring(0, 1000));
  
  if (createRes.body?.product?.id) {
    console.log('\n=== Step 3: Cleanup ===');
    const delRes = await makeRequest('DELETE', `/api/admin/products/${createRes.body.product.id}`, null, token);
    console.log('Delete status:', delRes.status);
  }
}

run().catch(e => console.error('FATAL:', e.message));
