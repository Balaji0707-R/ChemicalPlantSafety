import mongoose, { Schema } from "mongoose";
import { legacyModelOptions } from "./modelOptions.js";

export interface ComplianceDocumentDocument {
  document_id: number;
  compliance_id: number;
  document_name: string;
  document_path: string | null;
  uploaded_by: number | null;
  uploaded_at: Date;
}

const complianceDocumentSchema = new Schema<ComplianceDocumentDocument>(
  {
    document_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      unique: true,
    },
    compliance_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      index: true,
    },
    document_name: { type: String, required: true, maxlength: 200 },
    document_path: { type: String, default: null },
    uploaded_by: {
      type: Number,
      default: null,
      min: 1,
      max: 2_147_483_647,
      validate: (value: number | null) => value === null || Number.isSafeInteger(value),
      index: true,
    },
    uploaded_at: { type: Date, required: true, default: Date.now },
  },
  legacyModelOptions("compliance_documents")
);

complianceDocumentSchema.index(
  { compliance_id: 1, uploaded_at: -1 },
  { name: "compliance_documents_compliance_id_uploaded_at_idx" }
);

const ComplianceDocument =
  mongoose.models.ComplianceDocument ??
  mongoose.model<ComplianceDocumentDocument>("ComplianceDocument", complianceDocumentSchema);

export default ComplianceDocument;
