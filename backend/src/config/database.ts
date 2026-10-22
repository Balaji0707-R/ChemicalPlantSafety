import { Pool } from "pg";
import { env } from "./env.js";

export const pool = new Pool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("PostgreSQL connected successfully");
    console.log("Database time:", result.rows[0].now);
    return true;
  } catch (error) {
    console.error("PostgreSQL connection failed:", error instanceof Error ? error.message : error);
    return false;
  }
};