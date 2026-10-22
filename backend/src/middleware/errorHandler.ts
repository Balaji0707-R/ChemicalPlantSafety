import type { ErrorRequestHandler, RequestHandler } from "express";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error("Unhandled request error:", error);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
