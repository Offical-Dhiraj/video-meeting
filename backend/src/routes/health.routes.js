import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (req, res) => {
  const databaseStatus =
    mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected";

  res.status(200).json({
    success: true,
    message: "MeetFlow backend is healthy",
    data: {
      service: "meetflow-backend",
      environment: process.env.NODE_ENV,
      database: databaseStatus,
      timestamp: new Date().toISOString()
    }
  });
});

export default router;