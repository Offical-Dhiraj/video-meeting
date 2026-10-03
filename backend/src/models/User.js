import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 80
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false
    },

    avatar: {
      type: String,
      default: null,
      trim: true
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true
    },

    emailVerificationTokenHash: {
      type: String,
      select: false,
      default: null
    },

    emailVerificationExpiresAt: {
      type: Date,
      select: false,
      default: null
    },

    passwordResetTokenHash: {
      type: String,
      select: false,
      default: null
    },

    passwordResetExpiresAt: {
      type: Date,
      select: false,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const User = mongoose.model("User", userSchema);