require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  // Query information_schema via a raw SQL approach
  // Since Supabase JS client doesn't support raw SQL directly,
  // we'll use the REST API to introspect
  const tables = ['products', 'categories', 'brands', 'orders', 'admin_users'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`${table}: error - ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`\n${table} columns:`);
      Object.keys(data[0]).forEach(col => console.log(`  - ${col}`));
    } else {
      console.log(`\n${table}: table exists but empty`);
    }
  }
}
run().catch(e => { console.error(e.message); process.exit(1); });
