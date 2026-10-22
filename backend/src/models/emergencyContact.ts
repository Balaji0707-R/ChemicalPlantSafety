import mongoose, { Schema } from "mongoose";
import { legacyModelOptions } from "./modelOptions.js";

export interface EmergencyContactDocument {
  contact_id: number;
  contact_name: string;
  organization: string | null;
  contact_type: string | null;
  phone: string;
  email: string | null;
  is_active: boolean;
}

const emergencyContactSchema = new Schema<EmergencyContactDocument>(
  {
    contact_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      unique: true,
    },
    contact_name: { type: String, required: true, maxlength: 100 },
    organization: { type: String, default: null, maxlength: 150 },
    contact_type: { type: String, default: null, maxlength: 50 },
    phone: { type: String, required: true, maxlength: 30 },
    email: { type: String, default: null, maxlength: 150 },
    is_active: { type: Boolean, required: true, default: true },
  },
  legacyModelOptions("emergency_contacts")
);

const EmergencyContact =
  mongoose.models.EmergencyContact ??
  mongoose.model<EmergencyContactDocument>("EmergencyContact", emergencyContactSchema);

export default EmergencyContact;
