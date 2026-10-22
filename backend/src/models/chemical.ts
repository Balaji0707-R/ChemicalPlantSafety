import mongoose, { Schema } from "mongoose";

import { legacyModelOptions } from "./modelOptions.js";

export interface ChemicalDocument {
  chemical_id: number;
  chemical_name: string;
  cas_number: string | null;
  hazard_class: string | null;
  physical_state: string | null;
  description: string | null;
  created_at: Date;
}

const chemicalSchema = new Schema<ChemicalDocument>(
  {
    chemical_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      unique: true,
    },
    chemical_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    cas_number: { type: String, default: null, maxlength: 50 },
    hazard_class: { type: String, default: null, maxlength: 100 },
    physical_state: { type: String, default: null, maxlength: 30 },
    description: { type: String, default: null },
    created_at: { type: Date, required: true, default: Date.now },
  },
  legacyModelOptions("chemicals")
);

const Chemical =
  mongoose.models.Chemical ??
  mongoose.model<ChemicalDocument>("Chemical", chemicalSchema);

export default Chemical;
