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
import { API_ROLE_ACCESS } from "../auth/permissions.js";

const router = Router();

router.use(authorize(...API_ROLE_ACCESS.incidentsRead));

// =====================================================
// INCIDENT ROUTES
// =====================================================

router.get("/", getIncidents);

router.get("/:id", getIncident);

router.post("/", authorize(...API_ROLE_ACCESS.incidentsCreate), addIncident);

router.put("/:id", authorize(...API_ROLE_ACCESS.incidentsUpdate), editIncident);

router.delete("/:id", authorize(...API_ROLE_ACCESS.incidentsDelete), removeIncident);


// =====================================================
// INCIDENT ACTION ROUTES
// =====================================================

// Get all actions for an incident
router.get(
  "/:incidentId/actions",
  authorize(...API_ROLE_ACCESS.incidentActionsRead),
  getIncidentActions
);

// Get one corrective action
router.get(
  "/actions/:actionId",
  authorize(...API_ROLE_ACCESS.incidentActionsRead),
  getIncidentAction
);

// Create corrective action
router.post(
  "/actions",
  authorize(...API_ROLE_ACCESS.incidentActionsWrite),
  addIncidentAction
);

// Update corrective action
router.put(
  "/actions/:actionId",
  authorize(...API_ROLE_ACCESS.incidentActionsWrite),
  editIncidentAction
);

// Delete corrective action
router.delete(
  "/actions/:actionId",
  authorize(...API_ROLE_ACCESS.incidentActionsDelete),
  removeIncidentAction
);

export default router;
