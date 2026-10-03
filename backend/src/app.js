import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import pino from "pino";

import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import { notFoundMiddleware } from "./middleware/notFound.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug"
});

app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger
  })
);

app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);

app.use(
  express.json({
    limit: "100kb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "100kb"
  })
);

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED"
  }
});

app.use(globalRateLimiter);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to MeetFlow API"
  });
});

app.use("/api/health", healthRoutes);

app.use(notFoundMiddleware);

app.use(errorMiddleware);

export default app;