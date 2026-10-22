import mongoose, { Schema } from "mongoose";
import { legacyModelOptions } from "./modelOptions.js";

export interface InspectionFindingDocument {
  finding_id: number;
  inspection_id: number;
  finding_description: string;
  severity: string;
  corrective_action: string | null;
  due_date: Date | null;
  status: string;
  created_at: Date;
}

const findingSchema = new Schema<InspectionFindingDocument>(
  {
    finding_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      unique: true,
    },
    inspection_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      index: true,
    },
    finding_description: { type: String, required: true },
    severity: { type: String, required: true, maxlength: 30 },
    corrective_action: { type: String, default: null },
    due_date: { type: Date, default: null },
    status: { type: String, required: true, default: "OPEN", maxlength: 30 },
    created_at: { type: Date, required: true, default: Date.now },
  },
  legacyModelOptions("inspection_findings")
);

findingSchema.index(
  { inspection_id: 1, finding_id: -1 },
  { name: "inspection_findings_inspection_id_finding_id_idx" }
);
findingSchema.index(
  { status: 1, due_date: 1 },
  { name: "inspection_findings_status_due_date_idx" }
);

const InspectionFinding =
  mongoose.models.InspectionFinding ??
  mongoose.model<InspectionFindingDocument>("InspectionFinding", findingSchema);

export default InspectionFinding;
