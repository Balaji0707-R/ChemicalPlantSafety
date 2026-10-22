import mongoose, { Schema } from "mongoose";
import { legacyModelOptions } from "./modelOptions.js";

export interface ProcessReadingDocument {
  reading_id: number;
  metric_name: string;
  value: number;
  unit: string;
  source: string;
  recorded_at: Date;
}

const processReadingSchema = new Schema<ProcessReadingDocument>(
  {
    reading_id: {
      type: Number,
      required: true,
      min: 1,
      max: 2_147_483_647,
      validate: Number.isSafeInteger,
      unique: true,
    },
    metric_name: { type: String, required: true, maxlength: 100 },
    value: { type: Number, required: true },
    unit: { type: String, required: true, maxlength: 30 },
    source: { type: String, required: true, maxlength: 100 },
    recorded_at: { type: Date, required: true, default: Date.now },
  },
  legacyModelOptions("process_readings")
);

processReadingSchema.index(
  { metric_name: 1, recorded_at: -1 },
  { name: "process_readings_metric_time_idx" }
);

const ProcessReading =
  mongoose.models.ProcessReading ??
  mongoose.model<ProcessReadingDocument>("ProcessReading", processReadingSchema);

export default ProcessReading;
