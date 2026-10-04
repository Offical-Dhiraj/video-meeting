import Meeting from "../models/Meeting.js";
import Message from "../models/Message.js";

export const getMeetingMessages =
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

    const messages =
      await Message.find({
        meeting:
          meeting._id,
      })
        .populate(
          "sender",
          "name avatar"
        )
        .sort({
          createdAt: 1,
        })
        .limit(100)
        .lean();

    return res.status(200).json({
      success: true,

      data: {
        messages,
      },
    });
  };