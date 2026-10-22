import mongoose from "mongoose";
import { env } from "./env.js";

export const connectMongoDB = async (): Promise<boolean> => {
  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("MongoDB connected successfully");
    console.log("Database:", mongoose.connection.name);
    return true;
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
};

export const testMongoDBConnection = async (): Promise<boolean> => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return false;
    }

    await mongoose.connection.db.admin().ping();
    return true;
  } catch {
    return false;
  }
};

export const disconnectMongoDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
