import { Router } from "express";

import {
  getComplianceRecords,
  getComplianceRecord,
  addComplianceRecord,
  editComplianceRecord,
  removeComplianceRecord,
} from "../controllers/complianceController.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

// GET all compliance records
router.get("/", getComplianceRecords);

// GET a compliance record by ID
router.get("/:id", getComplianceRecord);

// CREATE a compliance record
router.post("/", authorize("ADMIN", "COMPLIANCE_OFFICER"), addComplianceRecord);

// UPDATE a compliance record
router.put("/:id", authorize("ADMIN", "COMPLIANCE_OFFICER"), editComplianceRecord);

// DELETE a compliance record
router.delete("/:id", authorize("ADMIN", "COMPLIANCE_OFFICER"), removeComplianceRecord);

export default router;