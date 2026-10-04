import express from "express";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  getMeetingMessages,
} from "../controllers/message.controller.js";

const router =
  express.Router();

router.use(authenticate);

router.get(
  "/:meetingId",
  getMeetingMessages
);

export default router;