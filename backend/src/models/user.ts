import mongoose, { Schema } from "mongoose";
import { legacyModelOptions, stripMongoMetadata } from "./modelOptions.js";

export interface UserDocument {
  user_id: number;
  role_id: number;
  full_name: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  created_at: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    user_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      unique: true,
    },
    role_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      index: true,
    },
    full_name: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, maxlength: 150, unique: true },
    // Queries must explicitly opt in with .select("+password_hash") when login verification needs it.
    password_hash: { type: String, required: true, select: false },
    is_active: { type: Boolean, required: true, default: true },
    created_at: { type: Date, required: true, default: Date.now },
  },
  legacyModelOptions("users")
);

const redactPasswordHash = (_document: unknown, result: any) => {
  delete result.password_hash;
  return stripMongoMetadata(result);
};

userSchema.set("toJSON", { transform: redactPasswordHash });
userSchema.set("toObject", { transform: redactPasswordHash });

const User =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", userSchema);

export default User;
