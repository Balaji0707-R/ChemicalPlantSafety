import { Router } from "express";

import {
  getFindings,
  getInspectionFindings,
  getFinding,
  addFinding,
  editFinding,
  removeFinding,
} from "../controllers/findingController.js";

const router = Router();


// GET all findings
router.get("/", getFindings);


// GET findings belonging to an inspection
router.get(
  "/inspection/:inspectionId",
  getInspectionFindings
);


// GET one finding
router.get(
  "/:id",
  getFinding
);


// CREATE finding
router.post(
  "/",
  addFinding
);


// UPDATE finding
router.put(
  "/:id",
  editFinding
);


// DELETE finding
router.delete(
  "/:id",
  removeFinding
);


export default router;