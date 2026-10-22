import mongoose, { Schema } from "mongoose";
import { legacyModelOptions } from "./modelOptions.js";

export interface IncidentActionDocument {
  action_id: number;
  incident_id: number;
  action_description: string;
  assigned_to: number | null;
  due_date: Date | null;
  status: string;
  completed_at: Date | null;
}

const incidentActionSchema = new Schema<IncidentActionDocument>(
  {
    action_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      unique: true,
    },
    incident_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      index: true,
    },
    action_description: { type: String, required: true },
    assigned_to: {
      type: Number,
      default: null,
      min: 1,
      max: 2_147_483_647,
      validate: (value: number | null) => value === null || Number.isSafeInteger(value),
      index: true,
    },
    due_date: { type: Date, default: null },
    status: { type: String, required: true, default: "PENDING", maxlength: 30 },
    completed_at: { type: Date, default: null },
  },
  legacyModelOptions("incident_actions")
);

incidentActionSchema.index(
  { incident_id: 1, action_id: -1 },
  { name: "incident_actions_incident_id_action_id_idx" }
);

const IncidentAction =
  mongoose.models.IncidentAction ??
  mongoose.model<IncidentActionDocument>("IncidentAction", incidentActionSchema);

export default IncidentAction;
