import mongoose, { Schema } from "mongoose";
import { legacyModelOptions } from "./modelOptions.js";

export interface InspectionDocument {
  inspection_id: number;
  inspector_id: number;
  inspection_date: Date;
  area: string;
  status: string;
  remarks: string | null;
  created_at: Date;
}

const inspectionSchema = new Schema<InspectionDocument>(
  {
    inspection_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      unique: true,
    },
    inspector_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      index: true,
    },
    inspection_date: { type: Date, required: true },
    area: { type: String, required: true, maxlength: 150 },
    status: { type: String, required: true, default: "SCHEDULED", maxlength: 30 },
    remarks: { type: String, default: null },
    created_at: { type: Date, required: true, default: Date.now },
  },
  legacyModelOptions("inspections")
);

inspectionSchema.index(
  { inspector_id: 1, inspection_id: -1 },
  { name: "inspections_inspector_id_inspection_id_idx" }
);

const Inspection =
  mongoose.models.Inspection ??
  mongoose.model<InspectionDocument>("Inspection", inspectionSchema);

export default Inspection;
