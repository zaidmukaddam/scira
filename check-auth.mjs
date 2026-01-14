import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_BN0py3JvohHU@ep-cool-glade-ag6slke0-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true',
  ssl: true
});

async function checkAuth() {
  try {
    // Check table structure first
    const columns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user' LIMIT 20");
    console.log('📋 User table columns:', columns.rows.map(r => r.column_name));
    
    const users = await pool.query('SELECT * FROM "user" ORDER BY created_at DESC LIMIT 5');
    console.log('\n✅ Total users:', users.rowCount);
    console.log('📋 Recent users:', users.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  pool.end();
}

checkAuth();
