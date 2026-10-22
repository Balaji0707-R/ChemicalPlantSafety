import type { Request, Response } from "express";
import {
  createStorage,
  deleteStorage,
  getStorageByChemical,
  updateStorage,
} from "../services/chemicalStorageService.js";
import { parsePositiveInteger, requiredText } from "../utils/validation.js";

const numberValue = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

export const getChemicalStorage = async (req: Request, res: Response): Promise<void> => {
  const chemicalId = parsePositiveInteger(req.params.chemicalId);
  if (chemicalId === null) {
    res.status(400).json({ message: "Invalid chemical ID" });
    return;
  }
  try {
    res.json(await getStorageByChemical(chemicalId));
  } catch (error) {
    console.error("Get chemical storage error:", error);
    res.status(500).json({ message: "Failed to fetch chemical storage" });
  }
};

export const addChemicalStorage = async (req: Request, res: Response): Promise<void> => {
  const chemicalId = parsePositiveInteger(req.params.chemicalId);
  const storageLocation = requiredText(req.body?.storage_location);
  const unit = requiredText(req.body?.unit);
  const quantity = numberValue(req.body?.quantity);
  const maximumCapacity = req.body?.maximum_capacity === null || req.body?.maximum_capacity === undefined
    ? null
    : numberValue(req.body.maximum_capacity);

  if (chemicalId === null || !storageLocation || !unit || quantity === null || (req.body?.maximum_capacity !== null && req.body?.maximum_capacity !== undefined && maximumCapacity === null)) {
    res.status(400).json({ message: "Valid storage location, quantity, and unit are required" });
    return;
  }
  if (maximumCapacity !== null && maximumCapacity < quantity) {
    res.status(400).json({ message: "Maximum capacity cannot be less than quantity" });
    return;
  }
  try {
    res.status(201).json(await createStorage({
      chemical_id: chemicalId,
      storage_location: storageLocation,
      quantity,
      unit,
      maximum_capacity: maximumCapacity,
    }));
  } catch (error) {
    console.error("Create chemical storage error:", error);
    res.status(500).json({ message: "Failed to create chemical storage" });
  }
};

export const editChemicalStorage = async (req: Request, res: Response): Promise<void> => {
  const id = parsePositiveInteger(req.params.storageId);
  const storageLocation = requiredText(req.body?.storage_location);
  const unit = requiredText(req.body?.unit);
  const quantity = numberValue(req.body?.quantity);
  const maximumCapacity = req.body?.maximum_capacity === null || req.body?.maximum_capacity === undefined
    ? null
    : numberValue(req.body.maximum_capacity);

  if (id === null || !storageLocation || !unit || quantity === null || (req.body?.maximum_capacity !== null && req.body?.maximum_capacity !== undefined && maximumCapacity === null)) {
    res.status(400).json({ message: "Valid storage location, quantity, and unit are required" });
    return;
  }
  if (maximumCapacity !== null && maximumCapacity < quantity) {
    res.status(400).json({ message: "Maximum capacity cannot be less than quantity" });
    return;
  }
  try {
    const storage = await updateStorage(id, { storage_location: storageLocation, quantity, unit, maximum_capacity: maximumCapacity });
    if (!storage) {
      res.status(404).json({ message: "Storage record not found" });
      return;
    }
    res.json(storage);
  } catch (error) {
    console.error("Update chemical storage error:", error);
    res.status(500).json({ message: "Failed to update chemical storage" });
  }
};

export const removeChemicalStorage = async (req: Request, res: Response): Promise<void> => {
  const id = parsePositiveInteger(req.params.storageId);
  if (id === null) {
    res.status(400).json({ message: "Invalid storage ID" });
    return;
  }
  try {
    const storage = await deleteStorage(id);
    if (!storage) {
      res.status(404).json({ message: "Storage record not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error("Delete chemical storage error:", error);
    res.status(500).json({ message: "Failed to delete chemical storage" });
  }
};
