import type { Request, Response } from "express";

import {
  getAllFindings,
  getFindingsByInspectionId,
  getFindingById,
  createFinding,
  updateFinding,
  deleteFinding,
} from "../services/findingService.js";


// =====================================================
// ID VALIDATION
// =====================================================

const getId = (
  value: string | string[]
): number => {

  const idValue = Array.isArray(value)
    ? value[0]
    : value;

  const id = Number(idValue);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid finding ID");
  }

  return id;
};


// =====================================================
// GET ALL FINDINGS
// =====================================================

export const getFindings = async (
  _req: Request,
  res: Response
): Promise<void> => {

  try {

    const findings = await getAllFindings();

    res.status(200).json(findings);

  } catch (error) {

    console.error(
      "Get findings error:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch findings",
    });

  }
};


// =====================================================
// GET FINDINGS BY INSPECTION
// =====================================================

export const getInspectionFindings = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const inspectionId = getId(
      req.params.inspectionId
    );

    const findings =
      await getFindingsByInspectionId(
        inspectionId
      );

    res.status(200).json(findings);

  } catch (error) {

    console.error(
      "Get inspection findings error:",
      error
    );

    res.status(400).json({
      message: "Invalid inspection ID",
    });

  }
};


// =====================================================
// GET ONE FINDING
// =====================================================

export const getFinding = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const id = getId(
      req.params.id
    );

    const finding =
      await getFindingById(id);

    if (!finding) {

      res.status(404).json({
        message: "Finding not found",
      });

      return;
    }

    res.status(200).json(finding);

  } catch (error) {

    console.error(
      "Get finding error:",
      error
    );

    res.status(400).json({
      message: "Invalid finding ID",
    });

  }
};


// =====================================================
// CREATE FINDING
// =====================================================

export const addFinding = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const {
      inspection_id,
      finding_description,
      severity,
      corrective_action,
      due_date,
      status,
    } = req.body;


    // Inspection validation

    if (!Number.isInteger(inspection_id)) {

      res.status(400).json({
        message:
          "Valid inspection_id is required",
      });

      return;
    }


    // Description validation

    if (
      !finding_description ||
      typeof finding_description !== "string"
    ) {

      res.status(400).json({
        message:
          "Finding description is required",
      });

      return;
    }


    // Severity validation

    if (
      !severity ||
      typeof severity !== "string"
    ) {

      res.status(400).json({
        message:
          "Severity is required",
      });

      return;
    }


    const finding =
      await createFinding({
        inspection_id,
        finding_description,
        severity,
        corrective_action,
        due_date,
        status,
      });


    res.status(201).json(finding);

  } catch (error) {

    console.error(
      "Create finding error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to create finding",
    });

  }
};


// =====================================================
// UPDATE FINDING
// =====================================================

export const editFinding = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const id = getId(
      req.params.id
    );

    const {
      inspection_id,
      finding_description,
      severity,
      corrective_action,
      due_date,
      status,
    } = req.body;


    if (!Number.isInteger(inspection_id)) {

      res.status(400).json({
        message:
          "Valid inspection_id is required",
      });

      return;
    }


    if (
      !finding_description ||
      typeof finding_description !== "string"
    ) {

      res.status(400).json({
        message:
          "Finding description is required",
      });

      return;
    }


    if (
      !severity ||
      typeof severity !== "string"
    ) {

      res.status(400).json({
        message:
          "Severity is required",
      });

      return;
    }


    const finding =
      await updateFinding(id, {
        inspection_id,
        finding_description,
        severity,
        corrective_action,
        due_date,
        status,
      });


    if (!finding) {

      res.status(404).json({
        message:
          "Finding not found",
      });

      return;
    }


    res.status(200).json(finding);

  } catch (error) {

    console.error(
      "Update finding error:",
      error
    );

    res.status(400).json({
      message:
        "Invalid finding ID",
    });

  }
};


// =====================================================
// DELETE FINDING
// =====================================================

export const removeFinding = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const id = getId(
      req.params.id
    );

    const finding =
      await deleteFinding(id);


    if (!finding) {

      res.status(404).json({
        message:
          "Finding not found",
      });

      return;
    }


    res.status(200).json({
      message:
        "Finding deleted successfully",
      finding,
    });

  } catch (error) {

    console.error(
      "Delete finding error:",
      error
    );

    res.status(400).json({
      message:
        "Invalid finding ID",
    });

  }
};