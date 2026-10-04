import bcrypt from "bcrypt";

import Meeting from "../models/Meeting.js";
import MeetingParticipant from "../models/MeetingParticipant.js";

import { generateMeetingId } from "../utils/meeting.js";

const MAX_MEETING_ID_ATTEMPTS = 5;

const createUniqueMeetingId =
  async () => {
    for (
      let attempt = 0;
      attempt < MAX_MEETING_ID_ATTEMPTS;
      attempt++
    ) {
      const meetingId =
        generateMeetingId();

      const exists =
        await Meeting.exists({
          meetingId,
        });

      if (!exists) {
        return meetingId;
      }
    }

    throw new Error(
      "Unable to generate unique meeting ID"
    );
  };

const sanitizeMeeting = (
  meeting
) => {
  return {
    id: meeting._id,
    meetingId:
      meeting.meetingId,
    title: meeting.title,
    host: meeting.host,
    scheduledAt:
      meeting.scheduledAt,
    status: meeting.status,
    settings:
      meeting.settings,
    startedAt:
      meeting.startedAt,
    endedAt:
      meeting.endedAt,
    createdAt:
      meeting.createdAt,
    updatedAt:
      meeting.updatedAt,
  };
};

/*
 * CREATE MEETING
 */
export const createMeeting =
  async (req, res) => {
    const {
      title,
      password,
      scheduledAt,
      settings,
    } = req.body;

    const meetingId =
      await createUniqueMeetingId();

    let passwordHash;

    if (password) {
      passwordHash =
        await bcrypt.hash(
          password,
          12
        );
    }

    const meeting =
      await Meeting.create({
        meetingId,

        host: req.user.id,

        title,

        passwordHash,

        scheduledAt:
          scheduledAt
            ? new Date(scheduledAt)
            : null,

        settings: {
          ...settings,

          requirePassword:
            Boolean(password),
        },
      });

    /*
     * Host is automatically recorded
     * as a participant.
     */
    await MeetingParticipant.create({
      meeting: meeting._id,

      user: req.user.id,

      role: "host",

      status: "joined",

      joinedAt: new Date(),
    });

    return res.status(201).json({
      success: true,

      message:
        "Meeting created successfully",

      data: {
        meeting:
          sanitizeMeeting(meeting),
      },
    });
  };

/*
 * GET MY MEETINGS
 */
export const getMyMeetings =
  async (req, res) => {
    const meetings =
      await Meeting.find({
        host: req.user.id,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.status(200).json({
      success: true,

      data: {
        meetings:
          meetings.map(
            sanitizeMeeting
          ),
      },
    });
  };

/*
 * GET SINGLE MEETING
 */
export const getMeeting =
  async (req, res) => {
    const {
      meetingId,
    } = req.params;

    const meeting =
      await Meeting.findOne({
        meetingId,
      })
        .populate(
          "host",
          "name email avatar"
        )
        .lean();

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message:
          "Meeting not found",
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        meeting:
          sanitizeMeeting(meeting),
      },
    });
  };

/*
 * UPDATE MEETING
 */
export const updateMeeting =
  async (req, res) => {
    const {
      meetingId,
    } = req.params;

    const meeting =
      await Meeting.findOne({
        meetingId,
      });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message:
          "Meeting not found",
      });
    }

    if (
      meeting.host.toString() !==
      req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the meeting host can update this meeting",
      });
    }

    if (
      meeting.status === "ended" ||
      meeting.status === "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This meeting can no longer be updated",
      });
    }

    const {
      title,
      password,
      scheduledAt,
      settings,
    } = req.body;

    if (title !== undefined) {
      meeting.title = title;
    }

    if (scheduledAt !== undefined) {
      meeting.scheduledAt =
        scheduledAt
          ? new Date(scheduledAt)
          : null;
    }

    if (settings) {
      meeting.settings = {
        ...meeting.settings.toObject(),
        ...settings,
      };
    }

    if (password !== undefined) {
      if (password === null) {
        meeting.passwordHash =
          undefined;

        meeting.settings.requirePassword =
          false;
      } else {
        meeting.passwordHash =
          await bcrypt.hash(
            password,
            12
          );

        meeting.settings.requirePassword =
          true;
      }
    }

    await meeting.save();

    return res.status(200).json({
      success: true,

      message:
        "Meeting updated successfully",

      data: {
        meeting:
          sanitizeMeeting(meeting),
      },
    });
  };

/*
 * START MEETING
 */
export const startMeeting =
  async (req, res) => {
    const {
      meetingId,
    } = req.params;

    const meeting =
      await Meeting.findOne({
        meetingId,
      });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message:
          "Meeting not found",
      });
    }

    if (
      meeting.host.toString() !==
      req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the meeting host can start the meeting",
      });
    }

    if (
      meeting.status === "active"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Meeting is already active",
      });
    }

    if (
      meeting.status === "ended" ||
      meeting.status === "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Meeting cannot be started",
      });
    }

    meeting.status = "active";
    meeting.startedAt = new Date();

    await meeting.save();

    return res.status(200).json({
      success: true,

      message:
        "Meeting started successfully",

      data: {
        meeting:
          sanitizeMeeting(meeting),
      },
    });
  };

/*
 * JOIN MEETING
 */
export const joinMeeting =
  async (req, res) => {
    const {
      meetingId,
    } = req.params;

    const {
      password,
    } = req.body;

    const meeting =
      await Meeting.findOne({
        meetingId,
      }).select(
        "+passwordHash"
      );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message:
          "Meeting not found",
      });
    }

    if (
      meeting.status ===
      "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This meeting has been cancelled",
      });
    }

    if (
      meeting.status === "ended"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This meeting has ended",
      });
    }

    /*
     * Host can always enter
     * without meeting password.
     */
    const isHost =
      meeting.host.toString() ===
      req.user.id;

    if (
      !isHost &&
      meeting.passwordHash
    ) {
      if (!password) {
        return res.status(401).json({
          success: false,
          message:
            "Meeting password is required",
        });
      }

      const passwordMatches =
        await bcrypt.compare(
          password,
          meeting.passwordHash
        );

      if (!passwordMatches) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid meeting password",
        });
      }
    }

    /*
     * If waiting room is enabled,
     * participant waits for host.
     */
    const shouldWait =
      !isHost &&
      meeting.settings
        .waitingRoom;

    const participant =
      await MeetingParticipant.create(
        {
          meeting:
            meeting._id,

          user:
            req.user.id,

          role: isHost
            ? "host"
            : "participant",

          status: shouldWait
            ? "waiting"
            : "joined",

          joinedAt: shouldWait
            ? null
            : new Date(),
        }
      );

    return res.status(200).json({
      success: true,

      message: shouldWait
        ? "Waiting for host approval"
        : "Joined meeting successfully",

      data: {
        meeting: {
          meetingId:
            meeting.meetingId,

          title:
            meeting.title,

          status:
            meeting.status,

          role: isHost
            ? "host"
            : "participant",
        },

        participant: {
          id:
            participant._id,

          status:
            participant.status,
        },
      },
    });
  };

/*
 * LEAVE MEETING
 */
export const leaveMeeting =
  async (req, res) => {
    const {
      meetingId,
    } = req.params;

    const meeting =
      await Meeting.findOne({
        meetingId,
      });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message:
          "Meeting not found",
      });
    }

    const participant =
      await MeetingParticipant
        .findOne({
          meeting:
            meeting._id,

          user:
            req.user.id,

          status: "joined",
        })
        .sort({
          joinedAt: -1,
        });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message:
          "Active meeting session not found",
      });
    }

    const leftAt =
      new Date();

    participant.leftAt =
      leftAt;

    participant.status =
      "left";

    if (participant.joinedAt) {
      participant.durationSeconds =
        Math.max(
          0,
          Math.floor(
            (leftAt -
              participant.joinedAt) /
              1000
          )
        );
    }

    await participant.save();

    return res.status(200).json({
      success: true,

      message:
        "Left meeting successfully",
    });
  };

/*
 * END MEETING
 */
export const endMeeting =
  async (req, res) => {
    const {
      meetingId,
    } = req.params;

    const meeting =
      await Meeting.findOne({
        meetingId,
      });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message:
          "Meeting not found",
      });
    }

    if (
      meeting.host.toString() !==
      req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the meeting host can end the meeting",
      });
    }

    if (
      meeting.status === "ended"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Meeting is already ended",
      });
    }

    const endedAt =
      new Date();

    meeting.status =
      "ended";

    meeting.endedAt =
      endedAt;

    await meeting.save();

    /*
     * Close all active participant
     * sessions.
     */
    const activeParticipants =
      await MeetingParticipant.find({
        meeting:
          meeting._id,

        status: "joined",
      });

    for (
      const participant of
      activeParticipants
    ) {
      participant.status =
        "left";

      participant.leftAt =
        endedAt;

      if (participant.joinedAt) {
        participant.durationSeconds =
          Math.max(
            0,
            Math.floor(
              (endedAt -
                participant.joinedAt) /
                1000
            )
          );
      }

      await participant.save();
    }

    return res.status(200).json({
      success: true,

      message:
        "Meeting ended successfully",
    });
  };

/*
 * CANCEL MEETING
 */
export const cancelMeeting =
  async (req, res) => {
    const {
      meetingId,
    } = req.params;

    const meeting =
      await Meeting.findOne({
        meetingId,
      });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message:
          "Meeting not found",
      });
    }

    if (
      meeting.host.toString() !==
      req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the meeting host can cancel this meeting",
      });
    }

    if (
      meeting.status ===
      "active"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Active meetings cannot be cancelled. End the meeting instead.",
      });
    }

    if (
      meeting.status ===
      "ended"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Ended meetings cannot be cancelled",
      });
    }

    meeting.status =
      "cancelled";

    await meeting.save();

    return res.status(200).json({
      success: true,

      message:
        "Meeting cancelled successfully",
    });
  };