import { Request, Response } from "express";

import {
  getAllComplianceRecords,
  getComplianceRecordById,
  createComplianceRecord,
  updateComplianceRecord,
  deleteComplianceRecord,
} from "../services/complianceService.js";

const getId = (
  value: string | string[] | undefined
): number => {
  if (typeof value !== "string") {
    return 0;
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : 0;
};

// GET /api/compliance
export const getComplianceRecords = async (
  _req: Request,
  res: Response
) => {
  try {
    const records = await getAllComplianceRecords();
    res.status(200).json(records);
  } catch (error) {
    console.error("Get compliance records error:", error);
    res.status(500).json({
      message: "Failed to retrieve compliance records",
    });
  }
};

// GET /api/compliance/:id
export const getComplianceRecord = async (
  req: Request,
  res: Response
) => {
  try {
    const id = getId(req.params.id);

    if (!id) {
      res.status(400).json({ message: "Invalid compliance ID" });
      return;
    }

    const record = await getComplianceRecordById(id);

    if (!record) {
      res.status(404).json({
        message: "Compliance record not found",
      });
      return;
    }

    res.status(200).json(record);
  } catch (error) {
    console.error("Get compliance record error:", error);
    res.status(500).json({
      message: "Failed to retrieve compliance record",
    });
  }
};

// POST /api/compliance
export const addComplianceRecord = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      requirement_name,
      regulatory_authority,
      description,
      issue_date,
      expiry_date,
      status,
      responsible_user,
    } = req.body;

    if (
      typeof requirement_name !== "string" ||
      !requirement_name.trim()
    ) {
      res.status(400).json({
        message: "Requirement name is required",
      });
      return;
    }

    if (
      responsible_user !== undefined &&
      responsible_user !== null &&
      (!Number.isInteger(Number(responsible_user)) ||
        Number(responsible_user) <= 0)
    ) {
      res.status(400).json({
        message: "Invalid responsible user ID",
      });
      return;
    }

    const record = await createComplianceRecord({
      requirement_name: requirement_name.trim(),
      regulatory_authority,
      description,
      issue_date: issue_date || null,
      expiry_date: expiry_date || null,
      status,
      responsible_user:
        responsible_user === "" || responsible_user == null
          ? null
          : Number(responsible_user),
    });

    res.status(201).json(record);
  } catch (error) {
    console.error("Create compliance record error:", error);
    res.status(500).json({
      message: "Failed to create compliance record",
    });
  }
};

// PUT /api/compliance/:id
export const editComplianceRecord = async (
  req: Request,
  res: Response
) => {
  try {
    const id = getId(req.params.id);

    if (!id) {
      res.status(400).json({ message: "Invalid compliance ID" });
      return;
    }

    const {
      requirement_name,
      regulatory_authority,
      description,
      issue_date,
      expiry_date,
      status,
      responsible_user,
    } = req.body;

    if (
      typeof requirement_name !== "string" ||
      !requirement_name.trim()
    ) {
      res.status(400).json({
        message: "Requirement name is required",
      });
      return;
    }

    if (
      responsible_user !== undefined &&
      responsible_user !== null &&
      responsible_user !== "" &&
      (!Number.isInteger(Number(responsible_user)) ||
        Number(responsible_user) <= 0)
    ) {
      res.status(400).json({
        message: "Invalid responsible user ID",
      });
      return;
    }

    const record = await updateComplianceRecord(id, {
      requirement_name: requirement_name.trim(),
      regulatory_authority,
      description,
      issue_date: issue_date || null,
      expiry_date: expiry_date || null,
      status,
      responsible_user:
        responsible_user === "" || responsible_user == null
          ? null
          : Number(responsible_user),
    });

    if (!record) {
      res.status(404).json({
        message: "Compliance record not found",
      });
      return;
    }

    res.status(200).json(record);
  } catch (error) {
    console.error("Update compliance record error:", error);
    res.status(500).json({
      message: "Failed to update compliance record",
    });
  }
};

// DELETE /api/compliance/:id
export const removeComplianceRecord = async (
  req: Request,
  res: Response
) => {
  try {
    const id = getId(req.params.id);

    if (!id) {
      res.status(400).json({ message: "Invalid compliance ID" });
      return;
    }

    const record = await deleteComplianceRecord(id);

    if (!record) {
      res.status(404).json({
        message: "Compliance record not found",
      });
      return;
    }

    res.status(200).json({
      message: "Compliance record deleted successfully",
      record,
    });
  } catch (error) {
    console.error("Delete compliance record error:", error);
    res.status(500).json({
      message: "Failed to delete compliance record",
    });
  }
};