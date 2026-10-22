import { Router } from "express";

import {
  getAllDocuments,
  getDocumentsByRequirement,
  uploadDocument,
  downloadDocument,
  removeDocument,
} from "../controllers/complianceDocumentController.js";

import {
  uploadComplianceDocument,
} from "../middleware/complianceDocumentUpload.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

// GET /api/compliance-documents
// Get all uploaded documents
router.get("/", getAllDocuments);

// GET /api/compliance-documents/requirement/:id
// Get documents for a specific compliance requirement
router.get(
  "/requirement/:id",
  getDocumentsByRequirement
);

// POST /api/compliance-documents
// Upload a PDF document
router.post(
  "/",
  authorize("ADMIN", "COMPLIANCE_OFFICER"),
  uploadComplianceDocument,
  uploadDocument
);

// GET /api/compliance-documents/:id/download
// Download a document
router.get(
  "/:id/download",
  downloadDocument
);

// DELETE /api/compliance-documents/:id
// Delete a document
router.delete(
  "/:id",
  authorize("ADMIN", "COMPLIANCE_OFFICER"),
  removeDocument
);

export default router;