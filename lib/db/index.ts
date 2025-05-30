import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@/lib/db/schema";
import { serverEnv } from "@/env/server";

const sql = neon(serverEnv.DATABASE_URL);
export const db = drizzle(sql, { schema });