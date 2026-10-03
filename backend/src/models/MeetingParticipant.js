import mongoose from "mongoose";

const meetingParticipantSchema = new mongoose.Schema(
  {
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    role: {
      type: String,
      enum: ["host", "participant"],
      default: "participant"
    },

    joinedAt: {
      type: Date,
      default: null
    },

    leftAt: {
      type: Date,
      default: null
    },

    durationSeconds: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

meetingParticipantSchema.index({
  meeting: 1,
  user: 1
});

meetingParticipantSchema.index({
  user: 1,
  createdAt: -1
});

meetingParticipantSchema.index({
  meeting: 1,
  joinedAt: -1
});

export const MeetingParticipant =
  mongoose.model(
    "MeetingParticipant",
    meetingParticipantSchema
  );