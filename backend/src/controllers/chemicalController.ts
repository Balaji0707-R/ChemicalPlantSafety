import { Request, Response } from "express";
import {
  getAllChemicals,
  getChemicalById,
  createChemical,
  updateChemical,
  deleteChemical,
} from "../services/chemicalService.js";
import { parsePositiveInteger, requiredText } from "../utils/validation.js";
import { invalidateDashboardCache } from "../services/dashboardService.js";

export const getChemicals = async (
  _req: Request,
  res: Response
) => {
  try {
    const chemicals = await getAllChemicals();
    res.json(chemicals);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch chemicals",
    });
  }
};

export const getChemical = async (
  req: Request,
  res: Response
) => {
  try {
    const id = parsePositiveInteger(req.params.id);

    if (id === null) {
      res.status(400).json({
        message: "Invalid chemical ID",
      });
      return;
    }

    const chemical = await getChemicalById(id);

    if (!chemical) {
      res.status(404).json({
        message: "Chemical not found",
      });
      return;
    }

    res.json(chemical);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch chemical",
    });
  }
};

export const addChemical = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      chemical_name,
      cas_number,
      hazard_class,
      physical_state,
      description,
    } = req.body;

    const normalizedName = requiredText(chemical_name);

    if (!normalizedName) {
      res.status(400).json({
        message: "chemical_name is required",
      });
      return;
    }

    const chemical = await createChemical({
      chemical_name: normalizedName,
      cas_number,
      hazard_class,
      physical_state,
      description,
    });
    await invalidateDashboardCache();

    res.status(201).json(chemical);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to create chemical",
    });
  }
};

export const editChemical = async (
  req: Request,
  res: Response
) => {
  try {
    const id = parsePositiveInteger(req.params.id);

    if (id === null) {
      res.status(400).json({
        message: "Invalid chemical ID",
      });
      return;
    }

    const {
      chemical_name,
      cas_number,
      hazard_class,
      physical_state,
      description,
    } = req.body;

    const normalizedName = requiredText(chemical_name);

    if (!normalizedName) {
      res.status(400).json({
        message: "chemical_name is required",
      });
      return;
    }

    const chemical = await updateChemical(id, {
      chemical_name: normalizedName,
      cas_number,
      hazard_class,
      physical_state,
      description,
    });

    if (!chemical) {
      res.status(404).json({
        message: "Chemical not found",
      });
      return;
    }
    await invalidateDashboardCache();

    res.json(chemical);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update chemical",
    });
  }
};

export const removeChemical = async (
  req: Request,
  res: Response
) => {
  try {
    const id = parsePositiveInteger(req.params.id);

    if (id === null) {
      res.status(400).json({
        message: "Invalid chemical ID",
      });
      return;
    }

    const chemical = await deleteChemical(id);

    if (!chemical) {
      res.status(404).json({
        message: "Chemical not found",
      });
      return;
    }
    await invalidateDashboardCache();

    res.json({
      message: "Chemical deleted successfully",
      chemical,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to delete chemical",
    });
  }
};