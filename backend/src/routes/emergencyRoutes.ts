import { Router } from "express";

import {
  getEmergencyContacts,
  getEmergencyContact,
  addEmergencyContact,
  editEmergencyContact,
  removeEmergencyContact,
  getEmergencyProcedures,
  getEmergencyProcedure,
  addEmergencyProcedure,
  editEmergencyProcedure,
  removeEmergencyProcedure,
} from "../controllers/emergencyController.js";
import { authorize } from "../middleware/auth.js";
import { API_ROLE_ACCESS } from "../auth/permissions.js";

const router = Router();

router.use(authorize(...API_ROLE_ACCESS.emergencyRead));

// =====================================================
// EMERGENCY CONTACTS
// =====================================================

router.get("/contacts", getEmergencyContacts);

router.get(
  "/contacts/:id",
  getEmergencyContact
);

router.post(
  "/contacts",
  authorize(...API_ROLE_ACCESS.emergencyWrite),
  addEmergencyContact
);

router.put(
  "/contacts/:id",
  authorize(...API_ROLE_ACCESS.emergencyWrite),
  editEmergencyContact
);

router.delete(
  "/contacts/:id",
  authorize(...API_ROLE_ACCESS.emergencyWrite),
  removeEmergencyContact
);

// =====================================================
// EMERGENCY PROCEDURES
// =====================================================

router.get(
  "/procedures",
  getEmergencyProcedures
);

router.get(
  "/procedures/:id",
  getEmergencyProcedure
);

router.post(
  "/procedures",
  authorize(...API_ROLE_ACCESS.emergencyWrite),
  addEmergencyProcedure
);

router.put(
  "/procedures/:id",
  authorize(...API_ROLE_ACCESS.emergencyWrite),
  editEmergencyProcedure
);

router.delete(
  "/procedures/:id",
  authorize(...API_ROLE_ACCESS.emergencyWrite),
  removeEmergencyProcedure
);

export default router;
