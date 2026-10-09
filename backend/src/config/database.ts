import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export const testDatabaseConnection = async (): Promise<void> => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("PostgreSQL connected successfully");
    console.log("Database time:", result.rows[0].now);
  } catch (error) {
    console.error("PostgreSQL connection failed:", error);
  }
};