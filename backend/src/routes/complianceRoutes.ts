import { Router } from "express";

import {
  getComplianceRecords,
  getComplianceRecord,
  addComplianceRecord,
  editComplianceRecord,
  removeComplianceRecord,
} from "../controllers/complianceController.js";
import { authorize } from "../middleware/auth.js";
import { API_ROLE_ACCESS } from "../auth/permissions.js";

const router = Router();

router.use(authorize(...API_ROLE_ACCESS.complianceRead));

// GET all compliance records
router.get("/", getComplianceRecords);

// GET a compliance record by ID
router.get("/:id", getComplianceRecord);

// CREATE a compliance record
router.post("/", authorize(...API_ROLE_ACCESS.complianceWrite), addComplianceRecord);

// UPDATE a compliance record
router.put("/:id", authorize(...API_ROLE_ACCESS.complianceWrite), editComplianceRecord);

// DELETE a compliance record
router.delete("/:id", authorize(...API_ROLE_ACCESS.complianceWrite), removeComplianceRecord);

export default router;
