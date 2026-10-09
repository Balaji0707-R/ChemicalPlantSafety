import { Router } from "express";

import {
  getIncidents,
  getIncident,
  addIncident,
  editIncident,
  removeIncident,
  getIncidentActions,
  getIncidentAction,
  addIncidentAction,
  editIncidentAction,
  removeIncidentAction,
} from "../controllers/incidentController.js";

const router = Router();

// =====================================================
// INCIDENT ROUTES
// =====================================================

router.get("/", getIncidents);

router.get("/:id", getIncident);

router.post("/", addIncident);

router.put("/:id", editIncident);

router.delete("/:id", removeIncident);


// =====================================================
// INCIDENT ACTION ROUTES
// =====================================================

// Get all actions for an incident
router.get(
  "/:incidentId/actions",
  getIncidentActions
);

// Get one corrective action
router.get(
  "/actions/:actionId",
  getIncidentAction
);

// Create corrective action
router.post(
  "/actions",
  addIncidentAction
);

// Update corrective action
router.put(
  "/actions/:actionId",
  editIncidentAction
);

// Delete corrective action
router.delete(
  "/actions/:actionId",
  removeIncidentAction
);

export default router;