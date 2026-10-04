import mongoose from "mongoose";

const meetingSettingsSchema =
  new mongoose.Schema(
    {
      waitingRoom: {
        type: Boolean,
        default: false,
      },

      requirePassword: {
        type: Boolean,
        default: false,
      },

      allowChat: {
        type: Boolean,
        default: true,
      },

      allowScreenShare: {
        type: Boolean,
        default: true,
      },

      allowParticipantUnmute: {
        type: Boolean,
        default: true,
      },
    },
    {
      _id: false,
    }
  );

const meetingSchema =
  new mongoose.Schema(
    {
      meetingId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 150,
      },

      passwordHash: {
        type: String,
        select: false,
      },

      scheduledAt: {
        type: Date,
        default: null,
        index: true,
      },

      status: {
        type: String,
        enum: [
          "scheduled",
          "active",
          "ended",
          "cancelled",
        ],
        default: "scheduled",
        index: true,
      },

      settings: {
        type: meetingSettingsSchema,
        default: () => ({}),
      },

      startedAt: {
        type: Date,
        default: null,
      },

      endedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

meetingSchema.index({
  host: 1,
  scheduledAt: -1,
});

meetingSchema.index({
  status: 1,
  scheduledAt: 1,
});

export default mongoose.model(
  "Meeting",
  meetingSchema
);