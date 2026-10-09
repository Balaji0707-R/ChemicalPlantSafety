import { pool } from "../config/database.js";

export interface ComplianceInput {
  requirement_name: string;
  regulatory_authority?: string | null;
  description?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  status?: string;
  responsible_user?: number | null;
}

export const getAllComplianceRecords = async () => {
  const result = await pool.query(`
    SELECT
      c.*,
      u.full_name AS responsible_user_name
    FROM compliance_records c
    LEFT JOIN users u
      ON c.responsible_user = u.user_id
    ORDER BY c.compliance_id DESC
  `);

  return result.rows;
};

export const getComplianceRecordById = async (
  id: number
) => {
  const result = await pool.query(
    `
    SELECT
      c.*,
      u.full_name AS responsible_user_name
    FROM compliance_records c
    LEFT JOIN users u
      ON c.responsible_user = u.user_id
    WHERE c.compliance_id = $1
    `,
    [id]
  );

  return result.rows[0];
};

export const createComplianceRecord = async (
  data: ComplianceInput
) => {
  const result = await pool.query(
    `
    INSERT INTO compliance_records (
      requirement_name,
      regulatory_authority,
      description,
      issue_date,
      expiry_date,
      status,
      responsible_user
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [
      data.requirement_name,
      data.regulatory_authority ?? null,
      data.description ?? null,
      data.issue_date ?? null,
      data.expiry_date ?? null,
      data.status ?? "ACTIVE",
      data.responsible_user ?? null,
    ]
  );

  return result.rows[0];
};

export const updateComplianceRecord = async (
  id: number,
  data: ComplianceInput
) => {
  const result = await pool.query(
    `
    UPDATE compliance_records
    SET
      requirement_name = $1,
      regulatory_authority = $2,
      description = $3,
      issue_date = $4,
      expiry_date = $5,
      status = $6,
      responsible_user = $7
    WHERE compliance_id = $8
    RETURNING *
    `,
    [
      data.requirement_name,
      data.regulatory_authority ?? null,
      data.description ?? null,
      data.issue_date ?? null,
      data.expiry_date ?? null,
      data.status ?? "ACTIVE",
      data.responsible_user ?? null,
      id,
    ]
  );

  return result.rows[0];
};

export const deleteComplianceRecord = async (
  id: number
) => {
  const result = await pool.query(
    `
    DELETE FROM compliance_records
    WHERE compliance_id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
};