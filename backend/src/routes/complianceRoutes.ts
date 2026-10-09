import { Router } from "express";

import {
  getComplianceRecords,
  getComplianceRecord,
  addComplianceRecord,
  editComplianceRecord,
  removeComplianceRecord,
} from "../controllers/complianceController.js";

const router = Router();

// GET all compliance records
router.get("/", getComplianceRecords);

// GET a compliance record by ID
router.get("/:id", getComplianceRecord);

// CREATE a compliance record
router.post("/", addComplianceRecord);

// UPDATE a compliance record
router.put("/:id", editComplianceRecord);

// DELETE a compliance record
router.delete("/:id", removeComplianceRecord);

export default router;