import mongoose from "mongoose";

const meetingParticipantSchema =
  new mongoose.Schema(
    {
      meeting: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Meeting",
        required: true,
        index: true,
      },

      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      role: {
        type: String,
        enum: ["host", "participant"],
        required: true,
      },

      status: {
        type: String,
        enum: [
          "waiting",
          "joined",
          "left",
          "rejected",
        ],
        default: "joined",
      },

      joinedAt: {
        type: Date,
        default: null,
      },

      leftAt: {
        type: Date,
        default: null,
      },

      durationSeconds: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

meetingParticipantSchema.index({
  meeting: 1,
  user: 1,
});

meetingParticipantSchema.index({
  user: 1,
  createdAt: -1,
});

meetingParticipantSchema.index({
  meeting: 1,
  joinedAt: -1,
});

export default mongoose.model(
  "MeetingParticipant",
  meetingParticipantSchema
);