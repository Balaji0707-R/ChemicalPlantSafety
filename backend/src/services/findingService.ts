import { pool } from "../config/database.js";

export interface FindingInput {
  inspection_id: number;
  finding_description: string;
  severity: string;
  corrective_action?: string;
  due_date?: string;
  status?: string;
}


// =====================================================
// GET ALL FINDINGS
// =====================================================

export const getAllFindings = async () => {
  const result = await pool.query(`
    SELECT
      f.finding_id,
      f.inspection_id,
      i.area AS inspection_area,
      i.inspection_date,
      f.finding_description,
      f.severity,
      f.corrective_action,
      f.due_date,
      f.status,
      f.created_at
    FROM inspection_findings f
    INNER JOIN inspections i
      ON f.inspection_id = i.inspection_id
    ORDER BY f.finding_id DESC
  `);

  return result.rows;
};


// =====================================================
// GET FINDINGS FOR ONE INSPECTION
// =====================================================

export const getFindingsByInspectionId = async (
  inspectionId: number
) => {
  const result = await pool.query(
    `
    SELECT
      finding_id,
      inspection_id,
      finding_description,
      severity,
      corrective_action,
      due_date,
      status,
      created_at
    FROM inspection_findings
    WHERE inspection_id = $1
    ORDER BY finding_id DESC
    `,
    [inspectionId]
  );

  return result.rows;
};


// =====================================================
// GET FINDING BY ID
// =====================================================

export const getFindingById = async (id: number) => {
  const result = await pool.query(
    `
    SELECT
      f.finding_id,
      f.inspection_id,
      i.area AS inspection_area,
      i.inspection_date,
      f.finding_description,
      f.severity,
      f.corrective_action,
      f.due_date,
      f.status,
      f.created_at
    FROM inspection_findings f
    INNER JOIN inspections i
      ON f.inspection_id = i.inspection_id
    WHERE f.finding_id = $1
    `,
    [id]
  );

  return result.rows[0];
};


// =====================================================
// CREATE FINDING
// =====================================================

export const createFinding = async (
  data: FindingInput
) => {
  const result = await pool.query(
    `
    INSERT INTO inspection_findings
      (
        inspection_id,
        finding_description,
        severity,
        corrective_action,
        due_date,
        status
      )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      data.inspection_id,
      data.finding_description,
      data.severity,
      data.corrective_action ?? null,
      data.due_date ?? null,
      data.status ?? "OPEN",
    ]
  );

  return result.rows[0];
};


// =====================================================
// UPDATE FINDING
// =====================================================

export const updateFinding = async (
  id: number,
  data: FindingInput
) => {
  const result = await pool.query(
    `
    UPDATE inspection_findings
    SET
      inspection_id = $1,
      finding_description = $2,
      severity = $3,
      corrective_action = $4,
      due_date = $5,
      status = $6
    WHERE finding_id = $7
    RETURNING *
    `,
    [
      data.inspection_id,
      data.finding_description,
      data.severity,
      data.corrective_action ?? null,
      data.due_date ?? null,
      data.status ?? "OPEN",
      id,
    ]
  );

  return result.rows[0];
};


// =====================================================
// DELETE FINDING
// =====================================================

export const deleteFinding = async (
  id: number
) => {
  const result = await pool.query(
    `
    DELETE FROM inspection_findings
    WHERE finding_id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
};