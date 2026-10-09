import type { Request, Response } from "express";

import {
  getAllIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
  getActionsByIncidentId,
  getActionById,
  createIncidentAction,
  updateIncidentAction,
  deleteIncidentAction,
} from "../services/incidentService.js";


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
// GET ALL INCIDENTS
// =====================================================

export const getIncidents = async (
  _req: Request,
  res: Response
): Promise<void> => {

  try {

    const incidents = await getAllIncidents();

    res.status(200).json(incidents);

  } catch (error) {

    console.error(
      "Get incidents error:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch incidents",
    });
  }
};


// =====================================================
// GET ONE INCIDENT
// =====================================================

export const getIncident = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const id = getId(req.params.id);

    const incident =
      await getIncidentById(id);

    if (!incident) {

      res.status(404).json({
        message: "Incident not found",
      });

      return;
    }

    res.status(200).json(incident);

  } catch (error) {

    console.error(
      "Get incident error:",
      error
    );

    res.status(400).json({
      message: "Invalid incident ID",
    });
  }
};


// =====================================================
// CREATE INCIDENT
// =====================================================

export const addIncident = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const {
      reported_by,
      incident_type,
      severity,
      location,
      incident_date,
      description,
      status,
    } = req.body;


    if (!Number.isInteger(reported_by)) {

      res.status(400).json({
        message:
          "Valid reported_by is required",
      });

      return;
    }


    if (
      !incident_type ||
      typeof incident_type !== "string"
    ) {

      res.status(400).json({
        message:
          "Incident type is required",
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


    if (
      !location ||
      typeof location !== "string"
    ) {

      res.status(400).json({
        message:
          "Incident location is required",
      });

      return;
    }


    if (!incident_date) {

      res.status(400).json({
        message:
          "Incident date is required",
      });

      return;
    }


    if (
      !description ||
      typeof description !== "string"
    ) {

      res.status(400).json({
        message:
          "Incident description is required",
      });

      return;
    }


    const incident =
      await createIncident({
        reported_by,
        incident_type,
        severity,
        location,
        incident_date,
        description,
        status,
      });


    res.status(201).json(incident);

  } catch (error) {

    console.error(
      "Create incident error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to create incident",
    });
  }
};


// =====================================================
// UPDATE INCIDENT
// =====================================================

export const editIncident = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const id = getId(req.params.id);

    const {
      reported_by,
      incident_type,
      severity,
      location,
      incident_date,
      description,
      status,
    } = req.body;


    if (!Number.isInteger(reported_by)) {

      res.status(400).json({
        message:
          "Valid reported_by is required",
      });

      return;
    }


    if (
      !incident_type ||
      typeof incident_type !== "string"
    ) {

      res.status(400).json({
        message:
          "Incident type is required",
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


    if (
      !location ||
      typeof location !== "string"
    ) {

      res.status(400).json({
        message:
          "Incident location is required",
      });

      return;
    }


    if (!incident_date) {

      res.status(400).json({
        message:
          "Incident date is required",
      });

      return;
    }


    if (
      !description ||
      typeof description !== "string"
    ) {

      res.status(400).json({
        message:
          "Incident description is required",
      });

      return;
    }


    const incident =
      await updateIncident(id, {
        reported_by,
        incident_type,
        severity,
        location,
        incident_date,
        description,
        status,
      });


    if (!incident) {

      res.status(404).json({
        message:
          "Incident not found",
      });

      return;
    }


    res.status(200).json(incident);

  } catch (error) {

    console.error(
      "Update incident error:",
      error
    );

    res.status(400).json({
      message:
        "Invalid incident ID",
    });
  }
};


// =====================================================
// DELETE INCIDENT
// =====================================================

export const removeIncident = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const id = getId(req.params.id);

    const incident =
      await deleteIncident(id);


    if (!incident) {

      res.status(404).json({
        message:
          "Incident not found",
      });

      return;
    }


    res.status(200).json({
      message:
        "Incident deleted successfully",

      incident,
    });

  } catch (error) {

    console.error(
      "Delete incident error:",
      error
    );

    res.status(400).json({
      message:
        "Invalid incident ID",
    });
  }
};


// =====================================================
// GET ACTIONS FOR INCIDENT
// =====================================================

export const getIncidentActions = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const incidentId =
      getId(req.params.incidentId);

    const actions =
      await getActionsByIncidentId(
        incidentId
      );

    res.status(200).json(actions);

  } catch (error) {

    console.error(
      "Get incident actions error:",
      error
    );

    res.status(400).json({
      message:
        "Invalid incident ID",
    });
  }
};


// =====================================================
// GET ONE ACTION
// =====================================================

export const getIncidentAction = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const actionId =
      getId(req.params.actionId);

    const action =
      await getActionById(actionId);


    if (!action) {

      res.status(404).json({
        message:
          "Incident action not found",
      });

      return;
    }


    res.status(200).json(action);

  } catch (error) {

    console.error(
      "Get incident action error:",
      error
    );

    res.status(400).json({
      message:
        "Invalid action ID",
    });
  }
};


// =====================================================
// CREATE INCIDENT ACTION
// =====================================================

export const addIncidentAction = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const {
      incident_id,
      action_description,
      assigned_to,
      due_date,
      status,
    } = req.body;


    if (!Number.isInteger(incident_id)) {

      res.status(400).json({
        message:
          "Valid incident_id is required",
      });

      return;
    }


    if (
      !action_description ||
      typeof action_description !== "string"
    ) {

      res.status(400).json({
        message:
          "Action description is required",
      });

      return;
    }


    if (
      assigned_to !== undefined &&
      assigned_to !== null &&
      !Number.isInteger(assigned_to)
    ) {

      res.status(400).json({
        message:
          "Invalid assigned_to value",
      });

      return;
    }


    const action =
      await createIncidentAction({
        incident_id,
        action_description,
        assigned_to,
        due_date,
        status,
      });


    res.status(201).json(action);

  } catch (error) {

    console.error(
      "Create incident action error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to create incident action",
    });
  }
};


// =====================================================
// UPDATE INCIDENT ACTION
// =====================================================

export const editIncidentAction = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const actionId = getId(req.params.actionId);

    const {
      incident_id,
      action_description,
      assigned_to,
      due_date,
      status,
    } = req.body;

    if (!Number.isInteger(incident_id)) {
      res.status(400).json({
        message: "Valid incident_id is required",
      });
      return;
    }

    if (
      !action_description ||
      typeof action_description !== "string"
    ) {
      res.status(400).json({
        message: "Action description is required",
      });
      return;
    }

    if (
      assigned_to !== undefined &&
      assigned_to !== null &&
      !Number.isInteger(assigned_to)
    ) {
      res.status(400).json({
        message: "Invalid assigned_to value",
      });
      return;
    }

    const action = await updateIncidentAction(
      actionId,
      {
        incident_id,
        action_description,
        assigned_to,
        due_date,
        status,
      }
    );

    if (!action) {
      res.status(404).json({
        message: "Incident action not found",
      });
      return;
    }

    res.status(200).json(action);

  } catch (error) {
    console.error("Update incident action error:", error);

    res.status(500).json({
      message: "Failed to update incident action",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

// =====================================================
// DELETE INCIDENT ACTION
// =====================================================

export const removeIncidentAction = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const actionId =
      getId(req.params.actionId);

    const action =
      await deleteIncidentAction(actionId);


    if (!action) {

      res.status(404).json({
        message:
          "Incident action not found",
      });

      return;
    }


    res.status(200).json({
      message:
        "Incident action deleted successfully",

      action,
    });

  } catch (error) {

    console.error(
      "Delete incident action error:",
      error
    );

    res.status(400).json({
      message:
        "Invalid action ID",
    });
  }
};