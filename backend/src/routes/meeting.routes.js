import express from "express";

import {
  createMeeting,
  getMyMeetings,
  getMeeting,
  updateMeeting,
  startMeeting,
  joinMeeting,
  leaveMeeting,
  endMeeting,
  cancelMeeting,
} from "../controllers/meeting.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  validate,
} from "../middleware/validate.middleware.js";

import {
  createMeetingSchema,
  updateMeetingSchema,
  joinMeetingSchema,
} from "../validators/meeting.validator.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  validate(createMeetingSchema),
  createMeeting
);

router.get(
  "/my",
  getMyMeetings
);

router.get(
  "/:meetingId",
  getMeeting
);

router.patch(
  "/:meetingId",
  validate(updateMeetingSchema),
  updateMeeting
);

router.post(
  "/:meetingId/start",
  startMeeting
);

router.post(
  "/:meetingId/join",
  validate(joinMeetingSchema),
  joinMeeting
);

router.post(
  "/:meetingId/leave",
  leaveMeeting
);

router.post(
  "/:meetingId/end",
  endMeeting
);

router.delete(
  "/:meetingId",
  cancelMeeting
);

export default router;