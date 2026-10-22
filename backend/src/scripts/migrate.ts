import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "../config/database.js";

const migrationPath = path.resolve(
  process.cwd(),
  "database",
  "migrations",
  "001_process_monitoring.sql"
);

const main = async (): Promise<void> => {
  const sql = await fs.readFile(migrationPath, "utf8");
  await pool.query(sql);
  console.log("Database migrations applied");
  await pool.end();
};

void main().catch(async (error: unknown) => {
  console.error("Database migration failed:", error);
  await pool.end();
  process.exitCode = 1;
});
