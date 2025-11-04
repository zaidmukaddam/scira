import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(connectionString);
try {
  const users = await sql`select id, email, created_at from "user" order by created_at desc limit 10`;
  console.log(users);
} finally {
  await sql.end({ timeout: 5 });
}
