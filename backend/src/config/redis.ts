import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (error) => {
  console.error("Redis Client Error:", error.message);
});

redisClient.on("connect", () => {
  console.log("Connecting to Redis...");
});

redisClient.on("ready", () => {
  console.log("Redis connected and ready");
});

redisClient.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

export const connectRedis = async (): Promise<void> => {
  if (redisClient.isOpen) {
    return;
  }

  try {
    await redisClient.connect();
  } catch (error) {
    console.error("Redis connection failed:", error);
  }
};

export default redisClient;