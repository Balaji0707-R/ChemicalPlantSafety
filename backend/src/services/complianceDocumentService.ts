import { pool } from "../config/database.js";

export interface ComplianceDocumentInput {
  compliance_id: number;
  document_name: string;
  document_path: string;
  uploaded_by?: number | null;
}

export const getAllComplianceDocuments = async () => {
  const result = await pool.query(`
    SELECT
      d.document_id,
      d.compliance_id,
      d.document_name,
      d.document_path,
      d.uploaded_by,
      d.uploaded_at,
      c.requirement_name,
      u.full_name AS uploaded_by_name
    FROM compliance_documents d
    INNER JOIN compliance_records c
      ON d.compliance_id = c.compliance_id
    LEFT JOIN users u
      ON d.uploaded_by = u.user_id
    ORDER BY d.uploaded_at DESC
  `);

  return result.rows;
};

export const getComplianceDocumentsByRequirement = async (
  complianceId: number
) => {
  const result = await pool.query(
    `
    SELECT
      d.document_id,
      d.compliance_id,
      d.document_name,
      d.document_path,
      d.uploaded_by,
      d.uploaded_at,
      c.requirement_name,
      u.full_name AS uploaded_by_name
    FROM compliance_documents d
    INNER JOIN compliance_records c
      ON d.compliance_id = c.compliance_id
    LEFT JOIN users u
      ON d.uploaded_by = u.user_id
    WHERE d.compliance_id = $1
    ORDER BY d.uploaded_at DESC
    `,
    [complianceId]
  );

  return result.rows;
};

export const getComplianceDocumentById = async (
  documentId: number
) => {
  const result = await pool.query(
    `
    SELECT *
    FROM compliance_documents
    WHERE document_id = $1
    `,
    [documentId]
  );

  return result.rows[0];
};

export const createComplianceDocument = async (
  data: ComplianceDocumentInput
) => {
  const result = await pool.query(
    `
    INSERT INTO compliance_documents (
      compliance_id,
      document_name,
      document_path,
      uploaded_by
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [
      data.compliance_id,
      data.document_name,
      data.document_path,
      data.uploaded_by ?? null,
    ]
  );

  return result.rows[0];
};

export const deleteComplianceDocument = async (
  documentId: number
) => {
  const result = await pool.query(
    `
    DELETE FROM compliance_documents
    WHERE document_id = $1
    RETURNING *
    `,
    [documentId]
  );

  return result.rows[0];
};