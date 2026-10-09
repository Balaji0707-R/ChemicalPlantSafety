import type { Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";

import {
  createComplianceDocument,
  getAllComplianceDocuments,
  getComplianceDocumentsByRequirement,
  getComplianceDocumentById,
  deleteComplianceDocument,
} from "../services/complianceDocumentService.js";

const uploadDirectory = path.resolve(
  process.cwd(),
  "uploads",
  "compliance"
);

// =====================================================
// GET ALL DOCUMENTS
// GET /api/compliance-documents
// =====================================================

export const getAllDocuments = async (
  _req: Request,
  res: Response
) => {
  try {
    const documents = await getAllComplianceDocuments();

    res.status(200).json(documents);
  } catch (error) {
    console.error("Get documents error:", error);

    res.status(500).json({
      message: "Failed to retrieve compliance documents.",
    });
  }
};

// =====================================================
// GET DOCUMENTS FOR A REQUIREMENT
// GET /api/compliance-documents/requirement/:id
// =====================================================

export const getDocumentsByRequirement = async (
  req: Request,
  res: Response
) => {
  try {
    const complianceId = Number(req.params.id);

    if (!Number.isInteger(complianceId) || complianceId <= 0) {
      res.status(400).json({
        message: "Invalid compliance requirement ID.",
      });
      return;
    }

    const documents =
      await getComplianceDocumentsByRequirement(complianceId);

    res.status(200).json(documents);
  } catch (error) {
    console.error("Get requirement documents error:", error);

    res.status(500).json({
      message: "Failed to retrieve documents for this requirement.",
    });
  }
};

// =====================================================
// UPLOAD DOCUMENT
// POST /api/compliance-documents
// =====================================================

export const uploadDocument = async (
  req: Request,
  res: Response
) => {
  const uploadedFile = req.file;

  try {
    const complianceId = Number(req.body.compliance_id);
    const documentName = String(
      req.body.document_name ?? ""
    ).trim();

    const uploadedByValue = req.body.uploaded_by;
    const uploadedBy =
      uploadedByValue === undefined ||
      uploadedByValue === ""
        ? null
        : Number(uploadedByValue);

    if (
      !Number.isInteger(complianceId) ||
      complianceId <= 0
    ) {
      res.status(400).json({
        message: "A valid compliance_id is required.",
      });
      return;
    }

    if (!documentName) {
      res.status(400).json({
        message: "Document name is required.",
      });
      return;
    }

    if (
      uploadedBy !== null &&
      (!Number.isInteger(uploadedBy) || uploadedBy <= 0)
    ) {
      res.status(400).json({
        message: "Invalid uploaded_by user ID.",
      });
      return;
    }

    if (!uploadedFile) {
      res.status(400).json({
        message: "Please select a PDF document to upload.",
      });
      return;
    }

    const document = await createComplianceDocument({
      compliance_id: complianceId,
      document_name: documentName,
      document_path: uploadedFile.filename,
      uploaded_by: uploadedBy,
    });

    res.status(201).json({
      message: "Compliance document uploaded successfully.",
      document,
    });
  } catch (error) {
    // Remove the uploaded file if database insertion fails.
    if (uploadedFile) {
      await fs.unlink(uploadedFile.path).catch(() => undefined);
    }

    console.error("Upload document error:", error);

    res.status(500).json({
      message: "Failed to upload compliance document.",
    });
  }
};

// =====================================================
// DOWNLOAD DOCUMENT
// GET /api/compliance-documents/:id/download
// =====================================================

export const downloadDocument = async (
  req: Request,
  res: Response
) => {
  try {
    const documentId = Number(req.params.id);

    if (!Number.isInteger(documentId) || documentId <= 0) {
      res.status(400).json({
        message: "Invalid document ID.",
      });
      return;
    }

    const document =
      await getComplianceDocumentById(documentId);

    if (!document) {
      res.status(404).json({
        message: "Compliance document not found.",
      });
      return;
    }

    const filename = path.basename(document.document_path);
    const filePath = path.resolve(uploadDirectory, filename);

    // Ensure the resolved file stays inside the upload directory.
    if (
      path.dirname(filePath) !== uploadDirectory ||
      filename !== document.document_path
    ) {
      res.status(400).json({
        message: "Invalid document path.",
      });
      return;
    }

    try {
      await fs.access(filePath);
    } catch {
      res.status(404).json({
        message: "The document file could not be found.",
      });
      return;
    }

    res.download(filePath, `${document.document_name}.pdf`);
  } catch (error) {
    console.error("Download document error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        message: "Failed to download compliance document.",
      });
    }
  }
};

// =====================================================
// DELETE DOCUMENT
// DELETE /api/compliance-documents/:id
// =====================================================

export const removeDocument = async (
  req: Request,
  res: Response
) => {
  try {
    const documentId = Number(req.params.id);

    if (!Number.isInteger(documentId) || documentId <= 0) {
      res.status(400).json({
        message: "Invalid document ID.",
      });
      return;
    }

    const document =
      await getComplianceDocumentById(documentId);

    if (!document) {
      res.status(404).json({
        message: "Compliance document not found.",
      });
      return;
    }

    const filename = path.basename(document.document_path);
    const filePath = path.resolve(uploadDirectory, filename);

    if (
      path.dirname(filePath) !== uploadDirectory ||
      filename !== document.document_path
    ) {
      res.status(400).json({
        message: "Invalid document path.",
      });
      return;
    }

    // Delete the database record first.
    const deleted = await deleteComplianceDocument(documentId);

    if (!deleted) {
      res.status(404).json({
        message: "Compliance document not found.",
      });
      return;
    }

    // Remove the stored file if it exists.
    await fs.unlink(filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        console.error("Could not remove document file:", error);
      }
    });

    res.status(200).json({
      message: "Compliance document deleted successfully.",
      document: deleted,
    });
  } catch (error) {
    console.error("Delete document error:", error);

    res.status(500).json({
      message: "Failed to delete compliance document.",
    });
  }
};