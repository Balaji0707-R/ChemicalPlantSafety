import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

const uploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "compliance"
);

// Create the upload directory if it does not exist.
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (_req, file, callback) => {
    const uniqueName = `${randomUUID()}.pdf`;
    callback(null, uniqueName);
  },
});

const fileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  callback
) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (
    extension !== ".pdf" ||
    file.mimetype !== "application/pdf"
  ) {
    callback(new Error("Only PDF files are allowed."));
    return;
  }

  callback(null, true);
};

export const uploadComplianceDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
}).single("document");