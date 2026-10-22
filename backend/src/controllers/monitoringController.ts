import type { Request, Response } from "express";
import { createReading, getAlerts, getReadings, acknowledgeAlert } from "../services/monitoringService.js";
import { parsePositiveInteger, requiredText } from "../utils/validation.js";

export const listReadings = async (req: Request, res: Response): Promise<void> => {
  const requested = Number(req.query.limit ?? 100);
  const limit = Number.isInteger(requested) && requested > 0 && requested <= 500 ? requested : 100;
  try {
    res.json(await getReadings(limit));
  } catch (error) {
    console.error("Get process readings error:", error);
    res.status(500).json({ message: "Failed to fetch process readings" });
  }
};

export const addReading = async (req: Request, res: Response): Promise<void> => {
  const metricName = requiredText(req.body?.metric_name);
  const unit = requiredText(req.body?.unit);
  const source = requiredText(req.body?.source);
  const value = req.body?.value;
  if (!metricName || !unit || !source || typeof value !== "number" || !Number.isFinite(value)) {
    res.status(400).json({ message: "Metric name, numeric value, unit, and source are required" });
    return;
  }
  try {
    res.status(201).json(await createReading({
      metric_name: metricName,
      value,
      unit,
      source,
      recorded_at: req.body?.recorded_at,
    }));
  } catch (error) {
    console.error("Create process reading error:", error);
    res.status(500).json({ message: "Failed to record process reading" });
  }
};

export const listAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json(await getAlerts());
  } catch (error) {
    console.error("Get safety alerts error:", error);
    res.status(500).json({ message: "Failed to fetch safety alerts" });
  }
};

export const acknowledge = async (req: Request, res: Response): Promise<void> => {
  const id = parsePositiveInteger(req.params.id);
  if (id === null) {
    res.status(400).json({ message: "Invalid alert ID" });
    return;
  }
  try {
    const alert = await acknowledgeAlert(id);
    if (!alert) {
      res.status(404).json({ message: "Alert not found" });
      return;
    }
    res.json(alert);
  } catch (error) {
    console.error("Acknowledge safety alert error:", error);
    res.status(500).json({ message: "Failed to acknowledge safety alert" });
  }
};
