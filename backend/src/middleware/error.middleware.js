import { env } from "../config/env.js";

export const errorHandler = (
  err,
  req,
  res,
  next
) => {
  console.error("❌ Error:", err);

  const statusCode =
    err.statusCode || 500;

  const message =
    err.isOperational
      ? err.message
      : "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,

    ...(err.code && {
      code: err.code,
    }),

    ...(env.NODE_ENV !== "production" && {
      stack: err.stack,
    }),
  });
};