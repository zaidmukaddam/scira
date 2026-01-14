const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_BN0py3JvohHU@ep-cool-glade-ag6slke0-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true',
  ssl: true
});

async function checkAuth() {
  try {
    // Check users table
    const users = await pool.query('SELECT id, name, email, \"createdAt\" FROM \"user\" ORDER BY \"createdAt\" DESC LIMIT 5');
    console.log('✅ Total users:', users.rowCount);
    console.log('📋 Recent users:', users.rows);
    
    // Check accounts table (OAuth + Email)
    const accounts = await pool.query('SELECT id, \"providerId\", \"userId\", \"createdAt\" FROM account ORDER BY \"createdAt\" DESC LIMIT 5');
    console.log('\n✅ Total accounts:', accounts.rowCount);
    console.log('📋 Recent accounts:', accounts.rows);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  pool.end();
}

checkAuth();
