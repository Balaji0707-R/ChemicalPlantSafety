import { pool } from "../config/database.js";
import redisClient from "../config/redis.js";

export const invalidateDashboardCache = async (): Promise<void> => {
  if (!redisClient.isReady) return;
  try {
    await redisClient.del("dashboard:stats");
  } catch (error) {
    console.error("Dashboard cache invalidation failed:", error);
  }
};

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

export interface DashboardActivity {
  activity_type: "INSPECTION" | "INCIDENT" | "COMPLIANCE";
  activity_id: number;
  title: string;
  detail: string;
  status: string;
  occurred_at: string;
}

export const getRecentDashboardActivity = async (): Promise<DashboardActivity[]> => {
  const result = await pool.query<DashboardActivity>(`
    SELECT activity_type, activity_id, title, detail, status, occurred_at
    FROM (
      SELECT
        'INSPECTION'::text AS activity_type,
        i.inspection_id AS activity_id,
        'Safety inspection' AS title,
        i.area AS detail,
        i.status,
        i.created_at AS occurred_at
      FROM inspections i
      UNION ALL
      SELECT
        'INCIDENT'::text AS activity_type,
        i.incident_id AS activity_id,
        i.incident_type AS title,
        i.location AS detail,
        i.status,
        i.created_at AS occurred_at
      FROM incidents i
      UNION ALL
      SELECT
        'COMPLIANCE'::text AS activity_type,
        c.compliance_id AS activity_id,
        c.requirement_name AS title,
        COALESCE(c.regulatory_authority, 'Compliance record') AS detail,
        c.status,
        c.created_at AS occurred_at
      FROM compliance_records c
    ) activity
    ORDER BY occurred_at DESC
    LIMIT 10
  `);

  return result.rows;
};