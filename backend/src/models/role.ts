import mongoose, { Schema } from "mongoose";
import { legacyModelOptions } from "./modelOptions.js";

export interface RoleDocument {
  role_id: number;
  role_name: string;
  description: string | null;
}

const roleSchema = new Schema<RoleDocument>(
  {
    role_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      unique: true,
    },
    role_name: { type: String, required: true, maxlength: 50, unique: true },
    description: { type: String, default: null },
  },
  legacyModelOptions("roles")
);

const Role =
  mongoose.models.Role ?? mongoose.model<RoleDocument>("Role", roleSchema);

export default Role;
