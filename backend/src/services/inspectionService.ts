import { pool } from "../config/database.js";

export interface InspectionInput {
  inspector_id: number;
  inspection_date: string;
  area: string;
  status?: string;
  remarks?: string;
}

export const getAllInspections = async () => {
  const result = await pool.query(`
    SELECT
      i.inspection_id,
      i.inspector_id,
      u.full_name AS inspector_name,
      i.inspection_date,
      i.area,
      i.status,
      i.remarks,
      i.created_at
    FROM inspections i
    INNER JOIN users u
      ON i.inspector_id = u.user_id
    ORDER BY i.inspection_id DESC
  `);

  return result.rows;
};

export const getInspectionById = async (id: number) => {
  const result = await pool.query(
    `
    SELECT
      i.inspection_id,
      i.inspector_id,
      u.full_name AS inspector_name,
      i.inspection_date,
      i.area,
      i.status,
      i.remarks,
      i.created_at
    FROM inspections i
    INNER JOIN users u
      ON i.inspector_id = u.user_id
    WHERE i.inspection_id = $1
    `,
    [id]
  );

  return result.rows[0];
};

export const createInspection = async (
  data: InspectionInput
) => {
  const result = await pool.query(
    `
    INSERT INTO inspections
      (
        inspector_id,
        inspection_date,
        area,
        status,
        remarks
      )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      data.inspector_id,
      data.inspection_date,
      data.area,
      data.status ?? "SCHEDULED",
      data.remarks ?? null,
    ]
  );

  return result.rows[0];
};

export const updateInspection = async (
  id: number,
  data: InspectionInput
) => {
  const result = await pool.query(
    `
    UPDATE inspections
    SET
      inspector_id = $1,
      inspection_date = $2,
      area = $3,
      status = $4,
      remarks = $5
    WHERE inspection_id = $6
    RETURNING *
    `,
    [
      data.inspector_id,
      data.inspection_date,
      data.area,
      data.status ?? "SCHEDULED",
      data.remarks ?? null,
      id,
    ]
  );

  return result.rows[0];
};

export const deleteInspection = async (id: number) => {
  const result = await pool.query(
    `
    DELETE FROM inspections
    WHERE inspection_id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
};