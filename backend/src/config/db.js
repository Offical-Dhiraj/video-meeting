import mongoose from "mongoose";
import { env } from "./env.js";
import { setServers } from "node:dns/promises"

export const connectDatabase = async () => {
  try {
    setServers(["1.1.1.1", "8.8.8.8"])

    const connection = await mongoose.connect(env.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    console.log(
      `MongoDB connected: ${connection.connection.host}`
    );
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);

    process.exit(1);
  }
};