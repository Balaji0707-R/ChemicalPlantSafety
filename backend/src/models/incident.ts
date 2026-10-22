import mongoose, { Schema } from "mongoose";
import { legacyModelOptions } from "./modelOptions.js";

export interface IncidentDocument {
  incident_id: number;
  reported_by: number;
  incident_type: string;
  severity: string;
  location: string;
  incident_date: Date;
  description: string;
  status: string;
  created_at: Date;
}

const incidentSchema = new Schema<IncidentDocument>(
  {
    incident_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      unique: true,
    },
    reported_by: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      index: true,
    },
    incident_type: { type: String, required: true, maxlength: 100 },
    severity: { type: String, required: true, maxlength: 30 },
    location: { type: String, required: true, maxlength: 150 },
    incident_date: { type: Date, required: true },
    description: { type: String, required: true },
    status: { type: String, required: true, default: "OPEN", maxlength: 30 },
    created_at: { type: Date, required: true, default: Date.now },
  },
  legacyModelOptions("incidents")
);

incidentSchema.index(
  { incident_date: -1 },
  { name: "incidents_incident_date_desc_idx" }
);

const Incident =
  mongoose.models.Incident ?? mongoose.model<IncidentDocument>("Incident", incidentSchema);

export default Incident;
