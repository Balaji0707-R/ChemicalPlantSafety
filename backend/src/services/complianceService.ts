import { pool } from "../config/database.js";
import ComplianceRecord from "../models/complianceRecord.js";
import { getNextId } from "../models/counter.js";
import { parseSqlDate } from "../models/dateOnly.js";
import { serializeDateOnlyFields } from "../models/serializers.js";
import User from "../models/user.js";

export interface ComplianceInput {
  requirement_name: string;
  regulatory_authority?: string | null;
  description?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  status?: string;
  responsible_user?: number | null;
}

export interface ComplianceRecordApi {
  compliance_id: number;
  requirement_name: string;
  regulatory_authority: string | null;
  description: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
  responsible_user: number | null;
  created_at: Date;
  responsible_user_name?: string | null;
}

type ComplianceValues = {
  requirement_name: string;
  regulatory_authority: string | null;
  description: string | null;
  issue_date: Date | null;
  expiry_date: Date | null;
  status: string;
  responsible_user: number | null;
};

const toComplianceValues = (data: ComplianceInput): ComplianceValues => ({
  requirement_name: data.requirement_name,
  regulatory_authority: data.regulatory_authority ?? null,
  description: data.description ?? null,
  issue_date: data.issue_date == null ? null : parseSqlDate(data.issue_date),
  expiry_date: data.expiry_date == null ? null : parseSqlDate(data.expiry_date),
  status: data.status ?? "ACTIVE",
  responsible_user: data.responsible_user ?? null,
});

const ensureResponsibleUserExists = async (userId: number | null): Promise<void> => {
  if (userId === null) return;

  const user = await User.exists({ user_id: userId });
  if (!user) {
    // The PostgreSQL service relied on the users foreign key for this check.
    throw new Error("Responsible user does not exist");
  }
};

const serializeComplianceRecord = (record: unknown): ComplianceRecordApi =>
  serializeDateOnlyFields(record) as unknown as ComplianceRecordApi;

const serializeJoinedRecords = async (
  records: unknown[]
): Promise<Array<ComplianceRecordApi & { responsible_user_name: string | null }>> => {
  const serialized = records.map(serializeComplianceRecord);
  const userIds = [...new Set(
    serialized.flatMap((record) =>
      typeof record.responsible_user === "number" ? [record.responsible_user] : []
    )
  )];

  const users = userIds.length
    ? await User.find({ user_id: { $in: userIds } })
      .select({ user_id: 1, full_name: 1, _id: 0 })
      .lean()
    : [];
  const namesById = new Map(users.map((user) => [user.user_id, user.full_name]));

  return serialized.map((record) => ({
    ...record,
    responsible_user_name:
      typeof record.responsible_user === "number"
        ? namesById.get(record.responsible_user) ?? null
        : null,
  }));
};

export const getAllComplianceRecordsMongo = async () => {
  const records = await ComplianceRecord.find({})
    .sort({ compliance_id: -1 })
    .lean();

  return serializeJoinedRecords(records);
};

export const getComplianceRecordByIdMongo = async (id: number) => {
  const record = await ComplianceRecord.findOne({ compliance_id: id }).lean();
  if (!record) return undefined;

  const [serialized] = await serializeJoinedRecords([record]);
  return serialized;
};

export const createComplianceRecordMongo = async (data: ComplianceInput) => {
  const values = toComplianceValues(data);
  await ensureResponsibleUserExists(values.responsible_user);

  const record = await ComplianceRecord.create({
    compliance_id: await getNextId("compliance_records"),
    ...values,
  });

  // PostgreSQL INSERT ... RETURNING * did not include the user join alias.
  return serializeComplianceRecord(record);
};

export const updateComplianceRecordMongo = async (
  id: number,
  data: ComplianceInput
) => {
  const existing = await ComplianceRecord.exists({ compliance_id: id });
  if (!existing) return undefined;

  const values = toComplianceValues(data);
  await ensureResponsibleUserExists(values.responsible_user);

  const updated = await ComplianceRecord.findOneAndUpdate(
    { compliance_id: id },
    { $set: values },
    { returnDocument: "after", runValidators: true }
  ).lean();

  return updated ? serializeComplianceRecord(updated) : undefined;
};

export const deleteComplianceRecordMongo = async (id: number) => {
  const deleted = await ComplianceRecord.findOneAndDelete({ compliance_id: id }).lean();
  return deleted ? serializeComplianceRecord(deleted) : undefined;
};

// The existing controller remains on these PostgreSQL exports until the
// compliance-record/document relationship can be cut over as one stage.
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

export const getComplianceRecordById = async (id: number) => {
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

export const createComplianceRecord = async (data: ComplianceInput) => {
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

export const deleteComplianceRecord = async (id: number) => {
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
