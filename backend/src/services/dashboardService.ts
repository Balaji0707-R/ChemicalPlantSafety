import { pool } from "../config/database.js";

export const getDashboardStats = async () => {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM chemicals) AS chemicals,
      (SELECT COUNT(*) FROM inspections) AS inspections,
      (SELECT COUNT(*) FROM incidents) AS incidents,
      (SELECT COUNT(*) FROM compliance_records) AS compliance,
      (SELECT COUNT(*) FROM emergency_contacts) AS emergency_contacts
  `);

  return result.rows[0];
};