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
import { API_ROLE_ACCESS } from "../auth/permissions.js";

const router = Router();

router.use(authorize(...API_ROLE_ACCESS.complianceRead));

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
  authorize(...API_ROLE_ACCESS.complianceWrite),
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
  authorize(...API_ROLE_ACCESS.complianceWrite),
  removeDocument
);

export default router;
