import Meeting from "../models/Meeting.js";
import MeetingParticipant from "../models/MeetingParticipant.js";
import Message from "../models/Message.js";

import {
  getMeetingRoom,
} from "./meetingRoom.js";

import {
  emitSocketError,
} from "./socketError.js";

const getParticipantData =
  (participant) => ({
    id: participant._id,
    user: {
      id: participant.user._id,
      name: participant.user.name,
      avatar: participant.user.avatar,
    },
    role: participant.role,
    status: participant.status,
    joinedAt: participant.joinedAt,
  });

export const registerMeetingSocket =
  (io, socket) => {
    /*
     * JOIN MEETING ROOM
     */
    socket.on(
      "meeting:join",
      async ({
        meetingId,
      } = {}) => {
        try {
          if (!meetingId) {
            return emitSocketError(
              socket,
              "Meeting ID is required",
              "MEETING_ID_REQUIRED"
            );
          }

          const meeting =
            await Meeting.findOne({
              meetingId,
            });

          if (!meeting) {
            return emitSocketError(
              socket,
              "Meeting not found",
              "MEETING_NOT_FOUND"
            );
          }

          if (
            meeting.status ===
            "cancelled"
          ) {
            return emitSocketError(
              socket,
              "Meeting has been cancelled",
              "MEETING_CANCELLED"
            );
          }

          if (
            meeting.status === "ended"
          ) {
            return emitSocketError(
              socket,
              "Meeting has ended",
              "MEETING_ENDED"
            );
          }

          /*
           * Find participant created
           * during REST join API.
           */
          const participant =
            await MeetingParticipant
              .findOne({
                meeting:
                  meeting._id,

                user:
                  socket.user.id,
              })
              .sort({
                createdAt: -1,
              })
              .populate(
                "user",
                "name avatar"
              );

          if (!participant) {
            return emitSocketError(
              socket,
              "Join the meeting through the API before connecting to the room",
              "PARTICIPANT_NOT_FOUND"
            );
          }

          /*
           * Waiting room participant
           * cannot enter the room yet.
           */
          if (
            participant.status ===
            "waiting"
          ) {
            socket.emit(
              "participant:waiting",
              {
                meetingId,
                message:
                  "Waiting for host approval",
              }
            );

            return;
          }

          if (
            participant.status ===
            "left"
          ) {
            return emitSocketError(
              socket,
              "Your meeting session has ended",
              "PARTICIPANT_LEFT"
            );
          }

          /*
           * Join Socket.IO room.
           */
          const room =
            getMeetingRoom(
              meetingId
            );

          await socket.join(room);

          /*
           * Store meeting information
           * on socket for disconnect handling.
           */
          socket.meetingId =
            meetingId;

          socket.meetingObjectId =
            meeting._id.toString();

          socket.participantId =
            participant._id.toString();

          /*
           * Get current participants.
           */
          const participants =
            await MeetingParticipant
              .find({
                meeting:
                  meeting._id,

                status: "joined",
              })
              .populate(
                "user",
                "name avatar"
              )
              .sort({
                joinedAt: 1,
              });

          /*
           * Tell joining client that
           * it successfully entered.
           */
          socket.emit(
            "meeting:joined",
            {
              success: true,

              meeting: {
                meetingId:
                  meeting.meetingId,

                title:
                  meeting.title,

                status:
                  meeting.status,
              },

              participantId:
                participant._id,

              participants:
                participants.map(
                  getParticipantData
                ),
            }
          );

          /*
           * Notify everyone else.
           */
          socket
            .to(room)
            .emit(
              "participant:joined",
              {
                participant:
                  getParticipantData(
                    participant
                  ),
              }
            );
        } catch (error) {
          console.error(
            "meeting:join error:",
            error
          );

          emitSocketError(
            socket,
            "Unable to join meeting",
            "JOIN_MEETING_ERROR"
          );
        }
      }
    );

    /*
     * LEAVE MEETING
     */
    socket.on(
      "meeting:leave",
      async () => {
        await leaveMeeting(
          io,
          socket
        );
      }
    );

    /*
     * SEND CHAT MESSAGE
     */
    socket.on(
      "chat:send",
      async ({
        content,
      } = {}) => {
        try {
          if (
            !socket.meetingId
          ) {
            return emitSocketError(
              socket,
              "You are not inside a meeting",
              "NOT_IN_MEETING"
            );
          }

          if (
            !content ||
            typeof content !==
              "string"
          ) {
            return emitSocketError(
              socket,
              "Message content is required",
              "MESSAGE_REQUIRED"
            );
          }

          const trimmedContent =
            content.trim();

          if (
            trimmedContent.length ===
            0
          ) {
            return emitSocketError(
              socket,
              "Message cannot be empty",
              "EMPTY_MESSAGE"
            );
          }

          if (
            trimmedContent.length >
            2000
          ) {
            return emitSocketError(
              socket,
              "Message cannot exceed 2000 characters",
              "MESSAGE_TOO_LONG"
            );
          }

          const meeting =
            await Meeting.findOne({
              meetingId:
                socket.meetingId,

              status: {
                $in: [
                  "scheduled",
                  "active",
                ],
              },
            });

          if (!meeting) {
            return emitSocketError(
              socket,
              "Meeting is no longer available",
              "MEETING_UNAVAILABLE"
            );
          }

          /*
           * Verify participant is still
           * allowed to communicate.
           */
          const participant =
            await MeetingParticipant
              .findOne({
                meeting:
                  meeting._id,

                user:
                  socket.user.id,

                status: "joined",
              });

          if (!participant) {
            return emitSocketError(
              socket,
              "You are not an active participant",
              "NOT_ACTIVE_PARTICIPANT"
            );
          }

          if (
            !meeting.settings
              .allowChat
          ) {
            return emitSocketError(
              socket,
              "Chat is disabled for this meeting",
              "CHAT_DISABLED"
            );
          }

          const message =
            await Message.create({
              meeting:
                meeting._id,

              sender:
                socket.user.id,

              content:
                trimmedContent,
            });

          await message.populate(
            "sender",
            "name avatar"
          );

          const messageData = {
            id: message._id,

            meetingId:
              socket.meetingId,

            sender: {
              id:
                message.sender._id,

              name:
                message.sender.name,

              avatar:
                message.sender.avatar,
            },

            content:
              message.content,

            createdAt:
              message.createdAt,
          };

          io.to(
            getMeetingRoom(
              socket.meetingId
            )
          ).emit(
            "chat:new-message",
            messageData
          );
        } catch (error) {
          console.error(
            "chat:send error:",
            error
          );

          emitSocketError(
            socket,
            "Unable to send message",
            "CHAT_SEND_ERROR"
          );
        }
      }
    );

    /*
     * HOST APPROVES WAITING PARTICIPANT
     */
    socket.on(
      "meeting:approve-participant",
      async ({
        participantId,
      } = {}) => {
        try {
          if (
            !socket.meetingId
          ) {
            return emitSocketError(
              socket,
              "You are not inside a meeting",
              "NOT_IN_MEETING"
            );
          }

          const meeting =
            await Meeting.findOne({
              meetingId:
                socket.meetingId,
            });

          if (!meeting) {
            return emitSocketError(
              socket,
              "Meeting not found",
              "MEETING_NOT_FOUND"
            );
          }

          if (
            meeting.host.toString() !==
            socket.user.id
          ) {
            return emitSocketError(
              socket,
              "Only the host can approve participants",
              "HOST_ONLY"
            );
          }

          const participant =
            await MeetingParticipant
              .findOne({
                _id: participantId,

                meeting:
                  meeting._id,

                status: "waiting",
              })
              .populate(
                "user",
                "name avatar"
              );

          if (!participant) {
            return emitSocketError(
              socket,
              "Waiting participant not found",
              "PARTICIPANT_NOT_FOUND"
            );
          }

          participant.status =
            "joined";

          participant.joinedAt =
            new Date();

          await participant.save();

          const room =
            getMeetingRoom(
              socket.meetingId
            );

          io.to(room).emit(
            "participant:approved",
            {
              participant:
                getParticipantData(
                  participant
                ),
            }
          );
        } catch (error) {
          console.error(
            "approve participant error:",
            error
          );

          emitSocketError(
            socket,
            "Unable to approve participant",
            "APPROVAL_ERROR"
          );
        }
      }
    );

    /*
     * HOST REJECTS WAITING PARTICIPANT
     */
    socket.on(
      "meeting:reject-participant",
      async ({
        participantId,
      } = {}) => {
        try {
          if (
            !socket.meetingId
          ) {
            return emitSocketError(
              socket,
              "You are not inside a meeting",
              "NOT_IN_MEETING"
            );
          }

          const meeting =
            await Meeting.findOne({
              meetingId:
                socket.meetingId,
            });

          if (!meeting) {
            return emitSocketError(
              socket,
              "Meeting not found",
              "MEETING_NOT_FOUND"
            );
          }

          if (
            meeting.host.toString() !==
            socket.user.id
          ) {
            return emitSocketError(
              socket,
              "Only the host can reject participants",
              "HOST_ONLY"
            );
          }

          const participant =
            await MeetingParticipant
              .findOne({
                _id: participantId,

                meeting:
                  meeting._id,

                status: "waiting",
              })
              .populate(
                "user",
                "name avatar"
              );

          if (!participant) {
            return emitSocketError(
              socket,
              "Waiting participant not found",
              "PARTICIPANT_NOT_FOUND"
            );
          }

          participant.status =
            "rejected";

          participant.leftAt =
            new Date();

          await participant.save();

          io.to(
            getMeetingRoom(
              socket.meetingId
            )
          ).emit(
            "participant:rejected",
            {
              participantId:
                participant._id,

              userId:
                participant.user._id,
            }
          );
        } catch (error) {
          console.error(
            "reject participant error:",
            error
          );

          emitSocketError(
            socket,
            "Unable to reject participant",
            "REJECTION_ERROR"
          );
        }
      }
    );
  };

/*
 * Common leave/disconnect logic.
 */
const leaveMeeting = async (
  io,
  socket
) => {
  try {
    if (
      !socket.meetingId ||
      !socket.meetingObjectId
    ) {
      return;
    }

    const participant =
      await MeetingParticipant
        .findOne({
          _id:
            socket.participantId,

          meeting:
            socket.meetingObjectId,

          user:
            socket.user.id,

          status: "joined",
        });

    if (participant) {
      const leftAt =
        new Date();

      participant.status =
        "left";

      participant.leftAt =
        leftAt;

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

      const room =
        getMeetingRoom(
          socket.meetingId
        );

      socket
        .to(room)
        .emit(
          "participant:left",
          {
            participantId:
              participant._id,

            userId:
              socket.user.id,
          }
        );

      await socket.leave(room);
    }

    socket.meetingId =
      undefined;

    socket.meetingObjectId =
      undefined;

    socket.participantId =
      undefined;
  } catch (error) {
    console.error(
      "leave meeting error:",
      error
    );
  }
};

export const handleSocketDisconnect =
  async (
    io,
    socket
  ) => {
    await leaveMeeting(
      io,
      socket
    );
  };