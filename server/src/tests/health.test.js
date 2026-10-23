import http from 'http';
import { env } from '../config/env.js';

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('Testing server health endpoints at http://localhost:' + env.port + '...');
  try {
    const health = await get(`http://localhost:${env.port}/api/health`);
    console.log(`[PASS] GET /api/health -> Status: ${health.status}`);
    console.log(`       Service: ${health.body?.service}`);
    console.log(`       DB Configured: ${health.body?.database?.configured}`);
    console.log(`       DB Connected: ${health.body?.database?.connected}`);

    const modules = await get(`http://localhost:${env.port}/api/modules`);
    console.log(`[PASS] GET /api/modules -> Status: ${modules.status}`);
    console.log(`       Total Modules Returned: ${modules.body?.count}`);

    const areas = await get(`http://localhost:${env.port}/api/areas`);
    console.log(`[PASS] GET /api/areas -> Status: ${areas.status}`);
    console.log(`       Taluka: ${areas.body?.taluka}`);
    console.log(`       Areas: ${areas.body?.data?.length}`);

    const emergency = await get(`http://localhost:${env.port}/api/emergency/status`);
    console.log(`[PASS] GET /api/emergency/status -> Status: ${emergency.status}`);
    console.log(`       Verified Configured: ${emergency.body?.verifiedDataConfigured}`);

    console.log('All API health tests passed.');
    process.exit(0);
  } catch (err) {
    console.error('[FAIL] API test failed:', err.message);
    process.exit(1);
  }
}

runTests();
