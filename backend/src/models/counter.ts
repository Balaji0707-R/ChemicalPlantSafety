import mongoose, { Schema } from "mongoose";

interface CounterDocument {
  _id: string;
  sequence: number;
}

const counterSchema = new Schema<CounterDocument>({
  _id: { type: String, required: true },
  sequence: { type: Number, required: true, default: 0 },
});

const Counter =
  mongoose.models.Counter ??
  mongoose.model<CounterDocument>("Counter", counterSchema, "id_counters");

const idSources = {
  roles: { collection: "roles", field: "role_id" },
  users: { collection: "users", field: "user_id" },
  chemicals: { collection: "chemicals", field: "chemical_id" },
  chemical_storage: { collection: "chemical_storage", field: "storage_id" },
  inspections: { collection: "inspections", field: "inspection_id" },
  inspection_findings: { collection: "inspection_findings", field: "finding_id" },
  incidents: { collection: "incidents", field: "incident_id" },
  incident_actions: { collection: "incident_actions", field: "action_id" },
  emergency_contacts: { collection: "emergency_contacts", field: "contact_id" },
  emergency_procedures: {
    collection: "emergency_procedures",
    field: "procedure_id",
  },
  compliance_records: { collection: "compliance_records", field: "compliance_id" },
  compliance_documents: { collection: "compliance_documents", field: "document_id" },
  process_readings: { collection: "process_readings", field: "reading_id" },
  safety_alerts: { collection: "safety_alerts", field: "alert_id" },
} as const;

const MAX_SERIAL_ID = 2_147_483_647;

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === 11000;

export const getNextId = async (name: string): Promise<number> => {
  if (!Object.hasOwn(idSources, name)) {
    throw new Error(`Unsupported ID counter: ${name}`);
  }

  const source = idSources[name as keyof typeof idSources];

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB must be connected before allocating IDs");
  }

  const highestDocument = await db.collection(source.collection).findOne(
    {},
    {
      projection: { [source.field]: 1 },
      sort: { [source.field]: -1 },
    }
  );
  const highestId = Number(highestDocument?.[source.field] ?? 0);
  if (!Number.isSafeInteger(highestId) || highestId < 0 || highestId > MAX_SERIAL_ID) {
    throw new Error(`Invalid existing ID in ${source.collection}`);
  }

  try {
    // $max only raises a stale counter; it leaves verified current values intact.
    await Counter.updateOne(
      { _id: name },
      { $max: { sequence: highestId } },
      { upsert: true }
    );
  } catch (error) {
    // Concurrent first allocations can race to upsert the same counter document.
    if (!isDuplicateKeyError(error)) throw error;
    await Counter.updateOne(
      { _id: name },
      { $max: { sequence: highestId } }
    );
  }

  const result = await Counter.findOneAndUpdate(
    { _id: name, sequence: { $lt: MAX_SERIAL_ID } },
    { $inc: { sequence: 1 } },
    { returnDocument: "after" }
  ).lean();

  if (!result) {
    throw new Error(`Failed to allocate ID for ${name}; its sequence is exhausted`);
  }

  return result.sequence;
};
