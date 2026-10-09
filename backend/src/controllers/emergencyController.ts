import type { Request, Response } from "express";

import {
  getAllEmergencyContacts,
  getEmergencyContactById,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  getAllEmergencyProcedures,
  getEmergencyProcedureById,
  createEmergencyProcedure,
  updateEmergencyProcedure,
  deleteEmergencyProcedure,
} from "../services/emergencyService.js";

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
    throw new Error("Invalid ID");
  }

  return id;
};

// =====================================================
// EMERGENCY CONTACTS
// =====================================================

// GET ALL CONTACTS
export const getEmergencyContacts = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const contacts =
      await getAllEmergencyContacts();

    res.status(200).json(contacts);
  } catch (error) {
    console.error(
      "Get emergency contacts error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch emergency contacts",
    });
  }
};

// GET ONE CONTACT
export const getEmergencyContact = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getId(req.params.id);

    const contact =
      await getEmergencyContactById(id);

    if (!contact) {
      res.status(404).json({
        message: "Emergency contact not found",
      });

      return;
    }

    res.status(200).json(contact);
  } catch (error) {
    console.error(
      "Get emergency contact error:",
      error
    );

    res.status(400).json({
      message: "Invalid contact ID",
    });
  }
};

// CREATE CONTACT
export const addEmergencyContact = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      contact_name,
      organization,
      contact_type,
      phone,
      email,
      is_active,
    } = req.body;

    if (
      !contact_name ||
      typeof contact_name !== "string"
    ) {
      res.status(400).json({
        message: "Contact name is required",
      });

      return;
    }

    if (
      !phone ||
      typeof phone !== "string"
    ) {
      res.status(400).json({
        message: "Phone number is required",
      });

      return;
    }

    const contact =
      await createEmergencyContact({
        contact_name,
        organization,
        contact_type,
        phone,
        email,
        is_active,
      });

    res.status(201).json(contact);
  } catch (error) {
    console.error(
      "Create emergency contact error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to create emergency contact",
    });
  }
};

// UPDATE CONTACT
export const editEmergencyContact = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getId(req.params.id);

    const {
      contact_name,
      organization,
      contact_type,
      phone,
      email,
      is_active,
    } = req.body;

    if (
      !contact_name ||
      typeof contact_name !== "string"
    ) {
      res.status(400).json({
        message: "Contact name is required",
      });

      return;
    }

    if (
      !phone ||
      typeof phone !== "string"
    ) {
      res.status(400).json({
        message: "Phone number is required",
      });

      return;
    }

    const contact =
      await updateEmergencyContact(id, {
        contact_name,
        organization,
        contact_type,
        phone,
        email,
        is_active,
      });

    if (!contact) {
      res.status(404).json({
        message: "Emergency contact not found",
      });

      return;
    }

    res.status(200).json(contact);
  } catch (error) {
    console.error(
      "Update emergency contact error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to update emergency contact",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

// DELETE CONTACT
export const removeEmergencyContact = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getId(req.params.id);

    const contact =
      await deleteEmergencyContact(id);

    if (!contact) {
      res.status(404).json({
        message: "Emergency contact not found",
      });

      return;
    }

    res.status(200).json({
      message:
        "Emergency contact deleted successfully",
      contact,
    });
  } catch (error) {
    console.error(
      "Delete emergency contact error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to delete emergency contact",
    });
  }
};

// =====================================================
// EMERGENCY PROCEDURES
// =====================================================

// GET ALL PROCEDURES
export const getEmergencyProcedures = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const procedures =
      await getAllEmergencyProcedures();

    res.status(200).json(procedures);
  } catch (error) {
    console.error(
      "Get emergency procedures error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch emergency procedures",
    });
  }
};

// GET ONE PROCEDURE
export const getEmergencyProcedure = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getId(req.params.id);

    const procedure =
      await getEmergencyProcedureById(id);

    if (!procedure) {
      res.status(404).json({
        message: "Emergency procedure not found",
      });

      return;
    }

    res.status(200).json(procedure);
  } catch (error) {
    console.error(
      "Get emergency procedure error:",
      error
    );

    res.status(400).json({
      message: "Invalid procedure ID",
    });
  }
};

// CREATE PROCEDURE
export const addEmergencyProcedure = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      procedure_name,
      emergency_type,
      instructions,
      evacuation_area,
    } = req.body;

    if (
      !procedure_name ||
      typeof procedure_name !== "string"
    ) {
      res.status(400).json({
        message: "Procedure name is required",
      });

      return;
    }

    if (
      !emergency_type ||
      typeof emergency_type !== "string"
    ) {
      res.status(400).json({
        message: "Emergency type is required",
      });

      return;
    }

    if (
      !instructions ||
      typeof instructions !== "string"
    ) {
      res.status(400).json({
        message: "Instructions are required",
      });

      return;
    }

    const procedure =
      await createEmergencyProcedure({
        procedure_name,
        emergency_type,
        instructions,
        evacuation_area,
      });

    res.status(201).json(procedure);
  } catch (error) {
    console.error(
      "Create emergency procedure error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to create emergency procedure",
    });
  }
};

// UPDATE PROCEDURE
export const editEmergencyProcedure = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getId(req.params.id);

    const {
      procedure_name,
      emergency_type,
      instructions,
      evacuation_area,
    } = req.body;

    if (
      !procedure_name ||
      typeof procedure_name !== "string"
    ) {
      res.status(400).json({
        message: "Procedure name is required",
      });

      return;
    }

    if (
      !emergency_type ||
      typeof emergency_type !== "string"
    ) {
      res.status(400).json({
        message: "Emergency type is required",
      });

      return;
    }

    if (
      !instructions ||
      typeof instructions !== "string"
    ) {
      res.status(400).json({
        message: "Instructions are required",
      });

      return;
    }

    const procedure =
      await updateEmergencyProcedure(id, {
        procedure_name,
        emergency_type,
        instructions,
        evacuation_area,
      });

    if (!procedure) {
      res.status(404).json({
        message: "Emergency procedure not found",
      });

      return;
    }

    res.status(200).json(procedure);
  } catch (error) {
    console.error(
      "Update emergency procedure error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to update emergency procedure",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

// DELETE PROCEDURE
export const removeEmergencyProcedure = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getId(req.params.id);

    const procedure =
      await deleteEmergencyProcedure(id);

    if (!procedure) {
      res.status(404).json({
        message: "Emergency procedure not found",
      });

      return;
    }

    res.status(200).json({
      message:
        "Emergency procedure deleted successfully",
      procedure,
    });
  } catch (error) {
    console.error(
      "Delete emergency procedure error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to delete emergency procedure",
    });
  }
};