import { pool } from "../config/database.js";

export interface IncidentInput {
  reported_by: number;
  incident_type: string;
  severity: string;
  location: string;
  incident_date: string;
  description: string;
  status?: string;
}

export interface IncidentActionInput {
  incident_id: number;
  action_description: string;
  assigned_to?: number;
  due_date?: string;
  status?: string;
}


// =====================================================
// GET ALL INCIDENTS
// =====================================================

export const getAllIncidents = async () => {
  const result = await pool.query(`
    SELECT
      i.incident_id,
      i.reported_by,
      u.full_name AS reporter_name,
      i.incident_type,
      i.severity,
      i.location,
      i.incident_date,
      i.description,
      i.status,
      i.created_at
    FROM incidents i
    INNER JOIN users u
      ON i.reported_by = u.user_id
    ORDER BY i.incident_id DESC
  `);

  return result.rows;
};


// =====================================================
// GET INCIDENT BY ID
// =====================================================

export const getIncidentById = async (
  id: number
) => {
  const result = await pool.query(
    `
    SELECT
      i.incident_id,
      i.reported_by,
      u.full_name AS reporter_name,
      i.incident_type,
      i.severity,
      i.location,
      i.incident_date,
      i.description,
      i.status,
      i.created_at
    FROM incidents i
    INNER JOIN users u
      ON i.reported_by = u.user_id
    WHERE i.incident_id = $1
    `,
    [id]
  );

  return result.rows[0];
};


// =====================================================
// CREATE INCIDENT
// =====================================================

export const createIncident = async (
  data: IncidentInput
) => {
  const result = await pool.query(
    `
    INSERT INTO incidents
      (
        reported_by,
        incident_type,
        severity,
        location,
        incident_date,
        description,
        status
      )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [
      data.reported_by,
      data.incident_type,
      data.severity,
      data.location,
      data.incident_date,
      data.description,
      data.status ?? "OPEN",
    ]
  );

  return result.rows[0];
};


// =====================================================
// UPDATE INCIDENT
// =====================================================

export const updateIncident = async (
  id: number,
  data: IncidentInput
) => {
  const result = await pool.query(
    `
    UPDATE incidents
    SET
      reported_by = $1,
      incident_type = $2,
      severity = $3,
      location = $4,
      incident_date = $5,
      description = $6,
      status = $7
    WHERE incident_id = $8
    RETURNING *
    `,
    [
      data.reported_by,
      data.incident_type,
      data.severity,
      data.location,
      data.incident_date,
      data.description,
      data.status ?? "OPEN",
      id,
    ]
  );

  return result.rows[0];
};


// =====================================================
// DELETE INCIDENT
// =====================================================

export const deleteIncident = async (
  id: number
) => {
  const result = await pool.query(
    `
    DELETE FROM incidents
    WHERE incident_id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
};


// =====================================================
// GET ALL ACTIONS FOR AN INCIDENT
// =====================================================

export const getActionsByIncidentId = async (
  incidentId: number
) => {
  const result = await pool.query(
    `
    SELECT
      a.action_id,
      a.incident_id,
      a.action_description,
      a.assigned_to,
      u.full_name AS assigned_to_name,
      a.due_date,
      a.status,
      a.completed_at
    FROM incident_actions a
    LEFT JOIN users u
      ON a.assigned_to = u.user_id
    WHERE a.incident_id = $1
    ORDER BY a.action_id DESC
    `,
    [incidentId]
  );

  return result.rows;
};


// =====================================================
// GET ACTION BY ID
// =====================================================

export const getActionById = async (
  id: number
) => {
  const result = await pool.query(
    `
    SELECT
      a.action_id,
      a.incident_id,
      a.action_description,
      a.assigned_to,
      u.full_name AS assigned_to_name,
      a.due_date,
      a.status,
      a.completed_at
    FROM incident_actions a
    LEFT JOIN users u
      ON a.assigned_to = u.user_id
    WHERE a.action_id = $1
    `,
    [id]
  );

  return result.rows[0];
};


// =====================================================
// CREATE INCIDENT ACTION
// =====================================================

export const createIncidentAction = async (
  data: IncidentActionInput
) => {
  const result = await pool.query(
    `
    INSERT INTO incident_actions
      (
        incident_id,
        action_description,
        assigned_to,
        due_date,
        status
      )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      data.incident_id,
      data.action_description,
      data.assigned_to ?? null,
      data.due_date ?? null,
      data.status ?? "PENDING",
    ]
  );

  return result.rows[0];
};


// =====================================================
// UPDATE INCIDENT ACTION
// =====================================================

export const updateIncidentAction = async (
  id: number,
  data: IncidentActionInput
) => {
  const result = await pool.query(
    `
    UPDATE incident_actions
    SET
      incident_id = $1,
      action_description = $2,
      assigned_to = $3,
      due_date = $4,
      status = $5::varchar,
      completed_at =
        CASE
          WHEN $5::varchar = 'COMPLETED'
            THEN COALESCE(completed_at, CURRENT_TIMESTAMP)
          ELSE NULL
        END
    WHERE action_id = $6
    RETURNING *
    `,
    [
      data.incident_id,
      data.action_description,
      data.assigned_to ?? null,
      data.due_date ?? null,
      data.status ?? "PENDING",
      id,
    ]
  );

  return result.rows[0];
};


// =====================================================
// DELETE INCIDENT ACTION
// =====================================================

export const deleteIncidentAction = async (
  id: number
) => {
  const result = await pool.query(
    `
    DELETE FROM incident_actions
    WHERE action_id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
};