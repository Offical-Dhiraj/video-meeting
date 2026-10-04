import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString("hex");
};

export const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

export const generateAccessToken = ({
  userId,
  sessionId,
  role,
}) => {
  return jwt.sign(
    {
      sub: userId,
      sid: sessionId,
      role,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(
    token,
    env.JWT_ACCESS_SECRET
  );
};