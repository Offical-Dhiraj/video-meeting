import User from "../models/User.js";

import {
  verifyAccessToken,
} from "../utils/token.js";

import { AppError } from "../utils/AppError.js";

export const authenticate = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return next(
        new AppError(
          "Authentication required",
          401,
          "AUTH_REQUIRED"
        )
      );
    }

    const token =
      authHeader.split(" ")[1];

    const payload =
      verifyAccessToken(token);

    const user =
      await User.findById(
        payload.sub
      );

    if (!user) {
      return next(
        new AppError(
          "User account not found",
          401,
          "USER_NOT_FOUND"
        )
      );
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    return next(
      new AppError(
        "Invalid or expired access token",
        401,
        "INVALID_ACCESS_TOKEN"
      )
    );
  }
};

export const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          "Authentication required",
          401,
          "AUTH_REQUIRED"
        )
      );
    }

    if (
      !allowedRoles.includes(
        req.user.role
      )
    ) {
      return next(
        new AppError(
          "You do not have permission to perform this action",
          403,
          "FORBIDDEN"
        )
      );
    }

    next();
  };