import { createClient } from "redis";
import { env } from "./env.js";

const redisClient = createClient({
  url: env.redisUrl,
  socket: {
    connectTimeout: 3000,
    reconnectStrategy: false,
  },
});

let reconnectTimer: NodeJS.Timeout | null = null;

const scheduleReconnect = (): void => {
  if (reconnectTimer || redisClient.isReady) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectRedis();
  }, 5000);
  reconnectTimer.unref();
};

redisClient.on("error", (error) => {
  console.error("Redis Client Error:", error.message);
  scheduleReconnect();
});

redisClient.on("connect", () => {
  console.log("Connecting to Redis...");
});

redisClient.on("ready", () => {
  console.log("Redis connected and ready");
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
});

redisClient.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

redisClient.on("end", () => {
  scheduleReconnect();
});

export const connectRedis = async (): Promise<boolean> => {
  if (redisClient.isReady) {
    return true;
  }

  try {
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }
    await redisClient.connect();
    return true;
  } catch (error) {
    console.error("Redis connection failed:", error instanceof Error ? error.message : error);
    scheduleReconnect();
    return false;
  }
};

export default redisClient;