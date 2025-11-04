require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function checkUsers() {
  try {
    console.log('=== CHECKING USERS ===');
    const users = await sql`
      SELECT id, email, email_verified, created_at, updated_at
      FROM public.user
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    console.log('Users found:', JSON.stringify(users, null, 2));

    console.log('\n=== CHECKING ACCOUNTS ===');
    const accounts = await sql`
      SELECT id, user_id, type, provider, created_at, updated_at
      FROM public.account
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    console.log('Accounts found:', JSON.stringify(accounts, null, 2));

    console.log('\n=== CHECKING SESSIONS ===');
    const sessions = await sql`
      SELECT id, user_id, expires_at, created_at, updated_at
      FROM public.session
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    console.log('Sessions found:', JSON.stringify(sessions, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
  }
}

checkUsers();
