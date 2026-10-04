import { AppError } from "../utils/AppError.js";

export const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => issue.message)
        .join(", ");

      return next(
        new AppError(
          message,
          400,
          "VALIDATION_ERROR"
        )
      );
    }

    req.body = result.data;

    next();
  };
};