import bcrypt from "bcrypt";
import { AUTH_CONSTANTS } from "../constants/auth.constants.js";

export const hashPassword = async (password) => {
  return bcrypt.hash(
    password,
    AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS
  );
};

export const comparePassword = async (
  password,
  passwordHash
) => {
  return bcrypt.compare(password, passwordHash);
};