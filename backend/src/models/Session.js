import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    refreshTokenHash: {
      type: String,
      required: true,
      select: false
    },

    deviceInfo: {
      type: String,
      maxlength: 500,
      default: null
    },

    userAgent: {
      type: String,
      maxlength: 1000,
      default: null
    },

    ipAddress: {
      type: String,
      maxlength: 100,
      default: null
    },

    expiresAt: {
      type: Date,
      required: true
    },

    revokedAt: {
      type: Date,
      default: null,
      index: true
    },

    lastUsedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

sessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export const Session = mongoose.model(
  "Session",
  sessionSchema
);