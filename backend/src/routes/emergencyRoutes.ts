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
  addEmergencyContact
);

router.put(
  "/contacts/:id",
  editEmergencyContact
);

router.delete(
  "/contacts/:id",
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
  addEmergencyProcedure
);

router.put(
  "/procedures/:id",
  editEmergencyProcedure
);

router.delete(
  "/procedures/:id",
  removeEmergencyProcedure
);

export default router;