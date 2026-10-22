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

const router = Router();

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
  authorize("ADMIN", "PLANT_MANAGER"),
  addEmergencyContact
);

router.put(
  "/contacts/:id",
  authorize("ADMIN", "PLANT_MANAGER"),
  editEmergencyContact
);

router.delete(
  "/contacts/:id",
  authorize("ADMIN", "PLANT_MANAGER"),
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
  authorize("ADMIN", "PLANT_MANAGER"),
  addEmergencyProcedure
);

router.put(
  "/procedures/:id",
  authorize("ADMIN", "PLANT_MANAGER"),
  editEmergencyProcedure
);

router.delete(
  "/procedures/:id",
  authorize("ADMIN", "PLANT_MANAGER"),
  removeEmergencyProcedure
);

export default router;