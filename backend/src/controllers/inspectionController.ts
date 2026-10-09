import type { Request, Response } from "express";

import {
  getAllInspections,
  getInspectionById,
  createInspection,
  updateInspection,
  deleteInspection,
} from "../services/inspectionService.js";

const getId = (value: string | string[]): number => {
  const idValue = Array.isArray(value) ? value[0] : value;

  const id = Number(idValue);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid inspection ID");
  }

  return id;
};

// =========================
// GET ALL INSPECTIONS
// =========================

export const getInspections = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const inspections = await getAllInspections();

    res.status(200).json(inspections);
  } catch (error) {
    console.error("Get inspections error:", error);

    res.status(500).json({
      message: "Failed to fetch inspections",
    });
  }
};

// =========================
// GET INSPECTION BY ID
// =========================

export const getInspection = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getId(req.params.id);

    const inspection = await getInspectionById(id);

    if (!inspection) {
      res.status(404).json({
        message: "Inspection not found",
      });

      return;
    }

    res.status(200).json(inspection);
  } catch (error) {
    console.error("Get inspection error:", error);

    res.status(400).json({
      message: "Invalid inspection ID",
    });
  }
};

// =========================
// CREATE INSPECTION
// =========================

export const addInspection = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      inspector_id,
      inspection_date,
      area,
      status,
      remarks,
    } = req.body;

    if (!Number.isInteger(inspector_id)) {
      res.status(400).json({
        message: "Valid inspector_id is required",
      });

      return;
    }

    if (!inspection_date) {
      res.status(400).json({
        message: "Inspection date is required",
      });

      return;
    }

    if (!area || typeof area !== "string") {
      res.status(400).json({
        message: "Inspection area is required",
      });

      return;
    }

    const inspection = await createInspection({
      inspector_id,
      inspection_date,
      area,
      status,
      remarks,
    });

    res.status(201).json(inspection);
  } catch (error) {
    console.error("Create inspection error:", error);

    res.status(500).json({
      message: "Failed to create inspection",
    });
  }
};

// =========================
// UPDATE INSPECTION
// =========================

export const editInspection = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getId(req.params.id);

    const {
      inspector_id,
      inspection_date,
      area,
      status,
      remarks,
    } = req.body;

    if (!Number.isInteger(inspector_id)) {
      res.status(400).json({
        message: "Valid inspector_id is required",
      });

      return;
    }

    if (!inspection_date) {
      res.status(400).json({
        message: "Inspection date is required",
      });

      return;
    }

    if (!area || typeof area !== "string") {
      res.status(400).json({
        message: "Inspection area is required",
      });

      return;
    }

    const inspection = await updateInspection(id, {
      inspector_id,
      inspection_date,
      area,
      status,
      remarks,
    });

    if (!inspection) {
      res.status(404).json({
        message: "Inspection not found",
      });

      return;
    }

    res.status(200).json(inspection);
  } catch (error) {
    console.error("Update inspection error:", error);

    res.status(400).json({
      message: "Invalid inspection ID",
    });
  }
};

// =========================
// DELETE INSPECTION
// =========================

export const removeInspection = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getId(req.params.id);

    const inspection = await deleteInspection(id);

    if (!inspection) {
      res.status(404).json({
        message: "Inspection not found",
      });

      return;
    }

    res.status(200).json({
      message: "Inspection deleted successfully",
      inspection,
    });
  } catch (error) {
    console.error("Delete inspection error:", error);

    res.status(400).json({
      message: "Invalid inspection ID",
    });
  }
};