import User from "../models/User.js";
import Session from "../models/Session.js";

import {
  generateRandomToken,
  hashToken,
  generateAccessToken,
} from "../utils/token.js";

import {
  hashPassword,
  comparePassword,
} from "../utils/password.js";

import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../utils/cookie.js";

import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email.service.js";

import { env } from "../config/env.js";

const createSession = async ({
  user,
  req,
  res,
}) => {
  const refreshToken = generateRandomToken(48);

  const refreshTokenHash =
    hashToken(refreshToken);

  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() +
      env.REFRESH_TOKEN_EXPIRES_DAYS
  );

  const session = await Session.create({
    user: user._id,

    refreshTokenHash,

    deviceInfo:
      req.headers["sec-ch-ua"] ||
      "Unknown Device",

    userAgent:
      req.headers["user-agent"],

    ipAddress:
      req.ip,

    expiresAt,
  });

  setRefreshTokenCookie(
    res,
    refreshToken
  );

  return session;
};

const getSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  isEmailVerified:
    user.isEmailVerified,
});

export const register = async (
  req,
  res
) => {
  const {
    name,
    email,
    password,
  } = req.body;

  const existingUser =
    await User.findOne({ email });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message:
        "An account with this email already exists",
    });
  }

  const passwordHash =
    await hashPassword(password);

  const verificationToken =
    generateRandomToken(32);

  const verificationTokenHash =
    hashToken(verificationToken);

  const verificationExpiresAt =
    new Date(
      Date.now() +
        30 * 60 * 1000
    );

  const user = await User.create({
    name,
    email,
    passwordHash,

    emailVerificationTokenHash:
      verificationTokenHash,

    emailVerificationExpiresAt:
      verificationExpiresAt,
  });

  const verificationUrl =
    `${env.CLIENT_URL}/verify-email?token=${verificationToken}`;

  await sendVerificationEmail({
    email: user.email,
    name: user.name,
    verificationUrl,
  });

  return res.status(201).json({
    success: true,
    message:
      "Registration successful. Please verify your email.",
  });
};

export const verifyEmail = async (
  req,
  res
) => {
  const {
    token,
  } = req.body;

  const tokenHash =
    hashToken(token);

  const user =
    await User.findOne({
      emailVerificationTokenHash:
        tokenHash,

      emailVerificationExpiresAt: {
        $gt: new Date(),
      },
    }).select(
      "+emailVerificationTokenHash +emailVerificationExpiresAt"
    );

  if (!user) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid or expired verification token",
    });
  }

  user.isEmailVerified = true;

  user.emailVerificationTokenHash =
    undefined;

  user.emailVerificationExpiresAt =
    undefined;

  await user.save();

  return res.status(200).json({
    success: true,
    message:
      "Email verified successfully",
  });
};

export const login = async (
  req,
  res
) => {
  const {
    email,
    password,
  } = req.body;

  const user =
    await User.findOne({ email })
      .select("+passwordHash");

  if (!user) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid email or password",
    });
  }

  const passwordMatches =
    await comparePassword(
      password,
      user.passwordHash
    );

  if (!passwordMatches) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid email or password",
    });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message:
        "Please verify your email before logging in",
    });
  }

  const session =
    await createSession({
      user,
      req,
      res,
    });

  const accessToken =
    generateAccessToken({
      userId: user._id.toString(),
      sessionId:
        session._id.toString(),
      role: user.role,
    });

  return res.status(200).json({
    success: true,

    data: {
      user: getSafeUser(user),
      accessToken,
    },
  });
};

export const refresh = async (
  req,
  res
) => {
  const refreshToken =
    req.cookies?.[env.COOKIE_NAME];

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message:
        "Refresh token is missing",
    });
  }

  const refreshTokenHash =
    hashToken(refreshToken);

  const session =
    await Session.findOne({
      refreshTokenHash,
    }).select(
      "+refreshTokenHash"
    );

  if (!session) {
    clearRefreshTokenCookie(res);

    return res.status(401).json({
      success: false,
      message:
        "Invalid refresh token",
    });
  }

  if (
    session.revokedAt ||
    session.expiresAt <= new Date()
  ) {
    clearRefreshTokenCookie(res);

    return res.status(401).json({
      success: false,
      message:
        "Refresh session has expired or been revoked",
    });
  }

  const user =
    await User.findById(
      session.user
    );

  if (!user) {
    await Session.findByIdAndUpdate(
      session._id,
      {
        revokedAt: new Date(),
      }
    );

    clearRefreshTokenCookie(res);

    return res.status(401).json({
      success: false,
      message:
        "User account no longer exists",
    });
  }

  /*
   * Refresh Token Rotation
   */

  const newRefreshToken =
    generateRandomToken(48);

  const newRefreshTokenHash =
    hashToken(newRefreshToken);

  const newExpiresAt =
    new Date();

  newExpiresAt.setDate(
    newExpiresAt.getDate() +
      env.REFRESH_TOKEN_EXPIRES_DAYS
  );

  session.refreshTokenHash =
    newRefreshTokenHash;

  session.expiresAt =
    newExpiresAt;

  session.lastUsedAt =
    new Date();

  await session.save();

  setRefreshTokenCookie(
    res,
    newRefreshToken
  );

  const accessToken =
    generateAccessToken({
      userId: user._id.toString(),
      sessionId:
        session._id.toString(),
      role: user.role,
    });

  return res.status(200).json({
    success: true,

    data: {
      accessToken,
      user: getSafeUser(user),
    },
  });
};

export const logout = async (
  req,
  res
) => {
  const refreshToken =
    req.cookies?.[env.COOKIE_NAME];

  if (refreshToken) {
    const refreshTokenHash =
      hashToken(refreshToken);

    await Session.findOneAndUpdate(
      {
        refreshTokenHash,
      },
      {
        revokedAt: new Date(),
      }
    );
  }

  clearRefreshTokenCookie(res);

  return res.status(200).json({
    success: true,
    message:
      "Logged out successfully",
  });
};

export const logoutAll = async (
  req,
  res
) => {
  await Session.updateMany(
    {
      user: req.user.id,
      revokedAt: null,
    },
    {
      revokedAt: new Date(),
    }
  );

  clearRefreshTokenCookie(res);

  return res.status(200).json({
    success: true,
    message:
      "All sessions have been logged out",
  });
};

export const forgotPassword = async (
  req,
  res
) => {
  const {
    email,
  } = req.body;

  const user =
    await User.findOne({
      email,
    });

  /*
   * Always return the same response
   * to prevent email enumeration.
   */

  if (!user) {
    return res.status(200).json({
      success: true,
      message:
        "If an account exists, a password reset email has been sent",
    });
  }

  const resetToken =
    generateRandomToken(32);

  const resetTokenHash =
    hashToken(resetToken);

  const resetExpiresAt =
    new Date(
      Date.now() +
        15 * 60 * 1000
    );

  user.passwordResetTokenHash =
    resetTokenHash;

  user.passwordResetExpiresAt =
    resetExpiresAt;

  await user.save();

  const resetUrl =
    `${env.CLIENT_URL}/reset-password?token=${resetToken}`;

  await sendPasswordResetEmail({
    email: user.email,
    name: user.name,
    resetUrl,
  });

  return res.status(200).json({
    success: true,
    message:
      "If an account exists, a password reset email has been sent",
  });
};

export const resetPassword = async (
  req,
  res
) => {
  const {
    token,
    password,
  } = req.body;

  const tokenHash =
    hashToken(token);

  const user =
    await User.findOne({
      passwordResetTokenHash:
        tokenHash,

      passwordResetExpiresAt: {
        $gt: new Date(),
      },
    }).select(
      "+passwordResetTokenHash +passwordResetExpiresAt"
    );

  if (!user) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid or expired password reset token",
    });
  }

  user.passwordHash =
    await hashPassword(password);

  user.passwordResetTokenHash =
    undefined;

  user.passwordResetExpiresAt =
    undefined;

  await user.save();

  /*
   * Password change invalidates
   * all existing sessions.
   */

  await Session.updateMany(
    {
      user: user._id,
      revokedAt: null,
    },
    {
      revokedAt: new Date(),
    }
  );

  return res.status(200).json({
    success: true,
    message:
      "Password reset successfully. Please log in again.",
  });
};

export const getMe = async (
  req,
  res
) => {
  const user =
    await User.findById(
      req.user.id
    );

  return res.status(200).json({
    success: true,
    data: {
      user: getSafeUser(user),
    },
  });
};