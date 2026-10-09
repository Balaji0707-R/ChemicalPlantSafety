import { pool } from "../config/database.js";

// =====================================================
// TYPES
// =====================================================

export interface EmergencyContactInput {
  contact_name: string;
  organization?: string;
  contact_type?: string;
  phone: string;
  email?: string;
  is_active?: boolean;
}

export interface EmergencyProcedureInput {
  procedure_name: string;
  emergency_type: string;
  instructions: string;
  evacuation_area?: string;
}

// =====================================================
// EMERGENCY CONTACTS
// =====================================================

// GET ALL CONTACTS
export const getAllEmergencyContacts = async () => {
  const result = await pool.query(
    `
    SELECT
      contact_id,
      contact_name,
      organization,
      contact_type,
      phone,
      email,
      is_active
    FROM emergency_contacts
    ORDER BY contact_id ASC
    `
  );

  return result.rows;
};

// GET ONE CONTACT
export const getEmergencyContactById = async (
  id: number
) => {
  const result = await pool.query(
    `
    SELECT
      contact_id,
      contact_name,
      organization,
      contact_type,
      phone,
      email,
      is_active
    FROM emergency_contacts
    WHERE contact_id = $1
    `,
    [id]
  );

  return result.rows[0];
};

// CREATE CONTACT
export const createEmergencyContact = async (
  data: EmergencyContactInput
) => {
  const result = await pool.query(
    `
    INSERT INTO emergency_contacts (
      contact_name,
      organization,
      contact_type,
      phone,
      email,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      data.contact_name,
      data.organization ?? null,
      data.contact_type ?? null,
      data.phone,
      data.email ?? null,
      data.is_active ?? true,
    ]
  );

  return result.rows[0];
};

// UPDATE CONTACT
export const updateEmergencyContact = async (
  id: number,
  data: EmergencyContactInput
) => {
  const result = await pool.query(
    `
    UPDATE emergency_contacts
    SET
      contact_name = $1,
      organization = $2,
      contact_type = $3,
      phone = $4,
      email = $5,
      is_active = $6
    WHERE contact_id = $7
    RETURNING *
    `,
    [
      data.contact_name,
      data.organization ?? null,
      data.contact_type ?? null,
      data.phone,
      data.email ?? null,
      data.is_active ?? true,
      id,
    ]
  );

  return result.rows[0];
};

// DELETE CONTACT
export const deleteEmergencyContact = async (
  id: number
) => {
  const result = await pool.query(
    `
    DELETE FROM emergency_contacts
    WHERE contact_id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
};

// =====================================================
// EMERGENCY PROCEDURES
// =====================================================

// GET ALL PROCEDURES
export const getAllEmergencyProcedures = async () => {
  const result = await pool.query(
    `
    SELECT
      procedure_id,
      procedure_name,
      emergency_type,
      instructions,
      evacuation_area,
      created_at
    FROM emergency_procedures
    ORDER BY procedure_id ASC
    `
  );

  return result.rows;
};

// GET ONE PROCEDURE
export const getEmergencyProcedureById = async (
  id: number
) => {
  const result = await pool.query(
    `
    SELECT
      procedure_id,
      procedure_name,
      emergency_type,
      instructions,
      evacuation_area,
      created_at
    FROM emergency_procedures
    WHERE procedure_id = $1
    `,
    [id]
  );

  return result.rows[0];
};

// CREATE PROCEDURE
export const createEmergencyProcedure = async (
  data: EmergencyProcedureInput
) => {
  const result = await pool.query(
    `
    INSERT INTO emergency_procedures (
      procedure_name,
      emergency_type,
      instructions,
      evacuation_area
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [
      data.procedure_name,
      data.emergency_type,
      data.instructions,
      data.evacuation_area ?? null,
    ]
  );

  return result.rows[0];
};

// UPDATE PROCEDURE
export const updateEmergencyProcedure = async (
  id: number,
  data: EmergencyProcedureInput
) => {
  const result = await pool.query(
    `
    UPDATE emergency_procedures
    SET
      procedure_name = $1,
      emergency_type = $2,
      instructions = $3,
      evacuation_area = $4
    WHERE procedure_id = $5
    RETURNING *
    `,
    [
      data.procedure_name,
      data.emergency_type,
      data.instructions,
      data.evacuation_area ?? null,
      id,
    ]
  );

  return result.rows[0];
};

// DELETE PROCEDURE
export const deleteEmergencyProcedure = async (
  id: number
) => {
  const result = await pool.query(
    `
    DELETE FROM emergency_procedures
    WHERE procedure_id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
};