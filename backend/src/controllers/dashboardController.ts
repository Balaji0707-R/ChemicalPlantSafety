import type { Request, Response } from "express";
import { getDashboardStats } from "../services/dashboardService.js";
import redisClient from "../config/redis.js";

const DASHBOARD_CACHE_KEY = "dashboard:stats";
const DASHBOARD_CACHE_TTL = 30;

export const getDashboard = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    // Try to get dashboard statistics from Redis
    if (redisClient.isReady) {
      try {
        const cachedStats = await redisClient.get(DASHBOARD_CACHE_KEY);

        if (cachedStats) {
          console.log("Dashboard cache hit");

          res.status(200).json({
            success: true,
            data: JSON.parse(cachedStats),
          });

          return;
        }
      } catch (redisError) {
        console.error("Redis cache read failed:", redisError);
      }
    }

    // Cache miss or Redis unavailable: fetch from PostgreSQL
    console.log("Dashboard cache miss - fetching from PostgreSQL");

    const stats = await getDashboardStats();

    const dashboardData = {
      chemicals: Number(stats.chemicals),
      inspections: Number(stats.inspections),
      incidents: Number(stats.incidents),
      compliance: Number(stats.compliance),
      emergency_contacts: Number(stats.emergency_contacts),
    };

    // Store the result in Redis for 30 seconds
    if (redisClient.isReady) {
      try {
        await redisClient.setEx(
          DASHBOARD_CACHE_KEY,
          DASHBOARD_CACHE_TTL,
          JSON.stringify(dashboardData)
        );

        console.log("Dashboard statistics cached in Redis");
      } catch (redisError) {
        console.error("Redis cache write failed:", redisError);
      }
    }

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard statistics",
    });
  }
};