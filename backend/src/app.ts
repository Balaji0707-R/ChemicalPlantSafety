
import express from "express";
import cors from "cors";

import { env } from "./config/env.js";
import {
  pool,
  testDatabaseConnection,
} from "./config/database.js";
import {
  connectMongoDB,
  testMongoDBConnection,
  disconnectMongoDB,
} from "./config/mongodb.js";
import redisClient, { connectRedis } from "./config/redis.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import {
  authenticate,
  requireCsrf,
} from "./middleware/auth.js";

import chemicalRoutes from "./routes/chemicalRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import inspectionRoutes from "./routes/inspectionRoutes.js";
import findingRoutes from "./routes/findingRoutes.js";
import incidentRoutes from "./routes/incidentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js";
import complianceRoutes from "./routes/complianceRoutes.js";
import complianceDocumentRoutes from "./routes/complianceDocumentRoutes.js";
import chemicalStorageRoutes from "./routes/chemicalStorageRoutes.js";
import monitoringRoutes from "./routes/monitoringRoutes.js";

const app = express();

// =========================
// MIDDLEWARE
// =========================

app.use(cors({ origin: env.frontendOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// =========================
// ROOT
// =========================

app.get("/", (_req, res) => {
  res.json({
    message: "Chemical Plant Safety API is running",
  });
});

// =========================
// HEALTH CHECK
// =========================

app.get("/api/health", async (_req, res) => {
  const [postgresConnected, mongoConnected] = await Promise.all([
    testDatabaseConnection(),
    testMongoDBConnection(),
  ]);

  const redisConnected = redisClient.isReady;

  const healthy =
    postgresConnected && mongoConnected && redisConnected;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "OK" : "DEGRADED",
    service: "Chemical Plant Safety Backend",
    dependencies: {
      postgresql: postgresConnected ? "connected" : "unavailable",
      mongodb: mongoConnected ? "connected" : "unavailable",
      redis: redisConnected ? "connected" : "unavailable",
    },
  });
});

// =========================
// API ROUTES
// =========================

app.use("/api/auth", authRoutes);

app.use(authenticate, requireCsrf);

app.use("/api", chemicalStorageRoutes);
app.use("/api/monitoring", monitoringRoutes);
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

app.use(notFoundHandler);
app.use(errorHandler);

// =========================
// SERVER STARTUP
// =========================

const startServer = async (): Promise<void> => {
  // Connect MongoDB first.
  const mongoConnected = await connectMongoDB();

  if (!mongoConnected) {
    throw new Error(
      "MongoDB is required before the API can start"
    );
  }

  // Existing services still use PostgreSQL.
  const postgresConnected = await testDatabaseConnection();

  if (!postgresConnected) {
    await disconnectMongoDB();
    throw new Error(
      "PostgreSQL is required while legacy services remain"
    );
  }

  // Keep the existing Redis dependency.
  await connectRedis();

  const server = app.listen(env.port, () => {
    console.log(
      `Server running on http://localhost:${env.port}`
    );
  });

  server.on("error", (error) => {
    console.error("Server error:", error);
  });

  // =========================
  // GRACEFUL SHUTDOWN
  // =========================

  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.log(`Received ${signal}; shutting down`);

    server.close(async () => {
      try {
        if (redisClient.isOpen) {
          await redisClient.quit();
        }
      } catch (error: unknown) {
        console.error("Redis shutdown failed:", error);
      }

      try {
        await disconnectMongoDB();
      } catch (error: unknown) {
        console.error("MongoDB shutdown failed:", error);
      }

      try {
        await pool.end();
      } catch (error: unknown) {
        console.error("PostgreSQL shutdown failed:", error);
      }

      process.exit(0);
    });
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
};

// =========================
// START APPLICATION
// =========================

void startServer().catch((error: unknown) => {
  console.error("Server startup failed:", error);
  process.exitCode = 1;
});

export default app;
