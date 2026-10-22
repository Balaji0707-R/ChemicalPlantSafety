import mongoose, { Schema } from "mongoose";
import { legacyModelOptions } from "./modelOptions.js";

export interface EmergencyProcedureDocument {
  procedure_id: number;
  procedure_name: string;
  emergency_type: string;
  instructions: string;
  evacuation_area: string | null;
  created_at: Date;
}

const emergencyProcedureSchema = new Schema<EmergencyProcedureDocument>(
  {
    procedure_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      unique: true,
    },
    procedure_name: { type: String, required: true, maxlength: 150 },
    emergency_type: { type: String, required: true, maxlength: 100 },
    instructions: { type: String, required: true },
    evacuation_area: { type: String, default: null, maxlength: 150 },
    created_at: { type: Date, required: true, default: Date.now },
  },
  legacyModelOptions("emergency_procedures")
);

const EmergencyProcedure =
  mongoose.models.EmergencyProcedure ??
  mongoose.model<EmergencyProcedureDocument>("EmergencyProcedure", emergencyProcedureSchema);

export default EmergencyProcedure;
