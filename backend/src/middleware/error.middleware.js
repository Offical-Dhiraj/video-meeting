export const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  const response = {
    success: false,
    message:
      statusCode === 500
        ? "Internal server error"
        : err.message,
    code: err.code || "INTERNAL_SERVER_ERROR"
  };

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};