import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Parse DATABASE_URL manually to avoid URL-parsing issues with special chars in password
function parseDbUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parseInt(parsed.port) || 5432,
      database: parsed.pathname.slice(1) || 'postgres',
    };
  } catch {
    // Fallback: use connection string directly
    return { connectionString: url };
  }
}

const dbConfig = parseDbUrl(process.env.DATABASE_URL);

export const pool = new Pool({
  ...dbConfig,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
