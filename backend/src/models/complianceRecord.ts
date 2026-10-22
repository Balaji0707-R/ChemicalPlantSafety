import mongoose, { Schema } from "mongoose";
import { legacyModelOptions } from "./modelOptions.js";

export interface ComplianceRecordDocument {
  compliance_id: number;
  requirement_name: string;
  regulatory_authority: string | null;
  description: string | null;
  issue_date: Date | null;
  expiry_date: Date | null;
  status: string;
  responsible_user: number | null;
  created_at: Date;
}

const complianceRecordSchema = new Schema<ComplianceRecordDocument>(
  {
    compliance_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      unique: true,
    },
    requirement_name: { type: String, required: true, maxlength: 200 },
    regulatory_authority: { type: String, default: null, maxlength: 150 },
    description: { type: String, default: null },
    issue_date: { type: Date, default: null },
    expiry_date: { type: Date, default: null },
    status: { type: String, required: true, default: "ACTIVE", maxlength: 30 },
    responsible_user: {
      type: Number,
      default: null,
      min: 1,
      max: 2_147_483_647,
      validate: (value: number | null) => value === null || Number.isSafeInteger(value),
      index: true,
    },
    created_at: { type: Date, required: true, default: Date.now },
  },
  legacyModelOptions("compliance_records")
);

complianceRecordSchema.index(
  { expiry_date: 1 },
  { name: "compliance_records_expiry_date_idx" }
);

const ComplianceRecord =
  mongoose.models.ComplianceRecord ??
  mongoose.model<ComplianceRecordDocument>("ComplianceRecord", complianceRecordSchema);

export default ComplianceRecord;
