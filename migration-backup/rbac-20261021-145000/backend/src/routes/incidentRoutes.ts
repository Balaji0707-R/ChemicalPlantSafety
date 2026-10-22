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
import { authorize } from "../middleware/auth.js";

const router = Router();

// =====================================================
// INCIDENT ROUTES
// =====================================================

router.get("/", getIncidents);

router.get("/:id", getIncident);

router.post("/", authorize("ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "EMPLOYEE"), addIncident);

router.put("/:id", authorize("ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"), editIncident);

router.delete("/:id", authorize("ADMIN", "SAFETY_OFFICER"), removeIncident);


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
  authorize("ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"),
  addIncidentAction
);

// Update corrective action
router.put(
  "/actions/:actionId",
  authorize("ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"),
  editIncidentAction
);

// Delete corrective action
router.delete(
  "/actions/:actionId",
  authorize("ADMIN", "SAFETY_OFFICER"),
  removeIncidentAction
);

export default router;