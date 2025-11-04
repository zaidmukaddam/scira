require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function checkAccounts() {
  try {
    console.log('=== CHECKING ACCOUNT TABLE STRUCTURE ===');
    const structure = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'account'
        AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    console.log('Account table structure:', JSON.stringify(structure, null, 2));

    console.log('\n=== CHECKING ALL COLUMNS ===');
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'account'
        AND table_schema = 'public'
      ORDER BY column_name;
    `;
    console.log('Columns:', columns.map(c => c.column_name));

    console.log('\n=== CHECKING ACCOUNTS (NO TYPE) ===');
    const accounts = await sql`
      SELECT *
      FROM public.account
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    console.log('Accounts found:', JSON.stringify(accounts, null, 2));

    console.log('\n=== VERIFICATION ATTEMPTS ===');
    const verifications = await sql`
      SELECT *
      FROM public.verification
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    console.log('Verifications found:', JSON.stringify(verifications, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
  }
}

checkAccounts();
