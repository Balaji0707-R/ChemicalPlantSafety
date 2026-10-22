import mongoose, { Schema } from "mongoose";
import { legacyModelOptions } from "./modelOptions.js";

export interface SafetyAlertDocument {
  alert_id: number;
  reading_id: number | null;
  alert_type: string;
  severity: string;
  message: string;
  status: string;
  created_at: Date;
  acknowledged_at: Date | null;
}

const safetyAlertSchema = new Schema<SafetyAlertDocument>(
  {
    alert_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      unique: true,
    },
    reading_id: {
      type: Number,
      default: null,
      min: 1,
      max: 2_147_483_647,
      validate: (value: number | null) => value === null || Number.isSafeInteger(value),
      index: true,
    },
    alert_type: { type: String, required: true, maxlength: 50 },
    severity: { type: String, required: true, default: "HIGH", maxlength: 30 },
    message: { type: String, required: true },
    status: { type: String, required: true, default: "OPEN", maxlength: 30 },
    created_at: { type: Date, required: true, default: Date.now },
    acknowledged_at: { type: Date, default: null },
  },
  legacyModelOptions("safety_alerts")
);

safetyAlertSchema.index(
  { status: 1, created_at: -1 },
  { name: "safety_alerts_status_created_at_idx" }
);

const SafetyAlert =
  mongoose.models.SafetyAlert ??
  mongoose.model<SafetyAlertDocument>("SafetyAlert", safetyAlertSchema);

export default SafetyAlert;
