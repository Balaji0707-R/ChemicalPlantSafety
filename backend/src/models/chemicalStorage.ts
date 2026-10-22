import mongoose, { Schema } from "mongoose";
import { legacyModelOptions } from "./modelOptions.js";

export interface ChemicalStorageDocument {
  storage_id: number;
  chemical_id: number;
  storage_location: string;
  quantity: number;
  unit: string;
  maximum_capacity: number | null;
  updated_at: Date;
}

const chemicalStorageSchema = new Schema<ChemicalStorageDocument>(
  {
    storage_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      unique: true,
    },
    chemical_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      index: true,
    },
    storage_location: { type: String, required: true, maxlength: 150 },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true, maxlength: 30 },
    maximum_capacity: { type: Number, default: null },
    updated_at: { type: Date, required: true, default: Date.now },
  },
  legacyModelOptions("chemical_storage")
);

chemicalStorageSchema.index(
  { chemical_id: 1, storage_id: -1 },
  { name: "chemical_storage_chemical_id_storage_id_idx" }
);

const ChemicalStorage =
  mongoose.models.ChemicalStorage ??
  mongoose.model<ChemicalStorageDocument>("ChemicalStorage", chemicalStorageSchema);

export default ChemicalStorage;
