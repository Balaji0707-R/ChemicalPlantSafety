import express from "express";
import cors from "cors";

import { testDatabaseConnection } from "./config/database.js";
import { connectRedis } from "./config/redis.js";

import chemicalRoutes from "./routes/chemicalRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import inspectionRoutes from "./routes/inspectionRoutes.js";
import findingRoutes from "./routes/findingRoutes.js";
import incidentRoutes from "./routes/incidentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js";
import complianceRoutes from "./routes/complianceRoutes.js";
import complianceDocumentRoutes from "./routes/complianceDocumentRoutes.js";

const app = express();

// =========================
// MIDDLEWARE
// =========================

app.use(cors());
app.use(express.json());

// =========================
// API ROUTES
// =========================

app.use("/api/chemicals", chemicalRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/inspections", inspectionRoutes);

app.use("/api/findings", findingRoutes);

app.use("/api/incidents", incidentRoutes);

app.use("/api/users", userRoutes);

app.use("/api/emergency", emergencyRoutes);

app.use("/api/compliance", complianceRoutes);

app.use(
  "/api/compliance-documents",
  complianceDocumentRoutes
);

// =========================
// ROOT ROUTE
// =========================

app.get("/", (_req, res) => {
  res.json({
    message: "Chemical Plant Safety API is running",
  });
});

// =========================
// HEALTH CHECK
// =========================

app.get("/api/health", (_req, res) => {
  res.json({
    status: "OK",
    service: "Chemical Plant Safety Backend",
  });
});

// =========================
// SERVER
// =========================

const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});

// =========================
// DATABASE CONNECTION
// =========================

testDatabaseConnection();

// =========================
// REDIS CONNECTION
// =========================

connectRedis();

// =========================
// SERVER ERROR
// =========================

server.on("error", (error) => {
  console.error("Server error:", error);
});