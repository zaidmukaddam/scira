require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function checkDefaults() {
  try {
    // Check user table column defaults
    console.log('=== USER TABLE COLUMNS ===');
    const userResult = await sql`
      SELECT column_name, column_default
      FROM information_schema.columns
      WHERE table_name = 'user'
        AND table_schema = 'public'
        AND column_name IN ('email_verified', 'created_at', 'updated_at')
      ORDER BY column_name;
    `;
    console.log(JSON.stringify(userResult, null, 2));

    // Check account table column defaults
    console.log('\n=== ACCOUNT TABLE COLUMNS ===');
    const accountResult = await sql`
      SELECT column_name, column_default
      FROM information_schema.columns
      WHERE table_name = 'account'
        AND table_schema = 'public'
        AND column_name IN ('created_at', 'updated_at')
      ORDER BY column_name;
    `;
    console.log(JSON.stringify(accountResult, null, 2));

    // Check session table column defaults
    console.log('\n=== SESSION TABLE COLUMNS ===');
    const sessionResult = await sql`
      SELECT column_name, column_default
      FROM information_schema.columns
      WHERE table_name = 'session'
        AND table_schema = 'public'
        AND column_name IN ('created_at', 'updated_at')
      ORDER BY column_name;
    `;
    console.log(JSON.stringify(sessionResult, null, 2));

    // Check drizzle_migrations table
    console.log('\n=== DRIZZLE MIGRATIONS ===');
    const migrationResult = await sql`
      SELECT version, hash, applied_at
      FROM drizzle_migrations
      ORDER BY version;
    `;
    console.log(JSON.stringify(migrationResult, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
  }
}

checkDefaults();
