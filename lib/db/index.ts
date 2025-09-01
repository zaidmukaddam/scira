import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/lib/db/schema';
import { serverEnv } from '@/env/server';
import { neon } from '@neondatabase/serverless';

// Mock database for development/demo when no real DB is available
const createMockDb = () => {
  return {
    select: () => ({ from: () => ({ where: () => [] }) }),
    insert: () => ({ values: () => ({ returning: () => [] }) }),
    update: () => ({ set: () => ({ where: () => [] }) }),
    delete: () => ({ where: () => [] }),
    query: {
      user: { findFirst: () => null, findMany: () => [] },
      chat: { findFirst: () => null, findMany: () => [] },
      message: { findFirst: () => null, findMany: () => [] },
      subscription: { findFirst: () => null, findMany: () => [] },
    }
  };
};

let db: any;
let maindb: any;

try {
  // Try to connect to real database
  const sql = neon(serverEnv.DATABASE_URL);
  db = drizzle(sql, { schema });
  maindb = db;
} catch (error) {
  // Fallback to mock database for demo
  console.warn('Using mock database for demo - database operations will not persist');
  db = createMockDb();
  maindb = db;
}

export { db, maindb };
