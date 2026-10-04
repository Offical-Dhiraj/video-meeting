import http from "http";

import app from "./app.js";
import { env } from "./config/env.js";
import connectDB from "./config/db.js";

import {
  initializeSocket,
} from "./sockets/index.js";

import "./models/User.js";
import "./models/Meeting.js";
import "./models/MeetingParticipant.js";
import "./models/Message.js";
import "./models/Session.js";

const server =
  http.createServer(app);

const io =
  initializeSocket(server);

const startServer = async () => {
  try {
    await connectDB();

    server.listen(
      env.PORT,
      () => {
        console.log(
          `🚀 MeetFlow API running on port ${env.PORT}`
        );

        console.log(
          `🔌 Socket.IO ready`
        );
      }
    );
  } catch (error) {
    console.error(
      "❌ Server startup failed:",
      error
    );

    process.exit(1);
  }
};

const gracefulShutdown = async (
  signal
) => {
  console.log(
    `${signal} received. Shutting down...`
  );

  io.close(() => {
    console.log(
      "Socket.IO server closed."
    );

    server.close(() => {
      console.log(
        "HTTP server closed."
      );

      process.exit(0);
    });
  });
};

process.on(
  "SIGTERM",
  () =>
    gracefulShutdown("SIGTERM")
);

process.on(
  "SIGINT",
  () =>
    gracefulShutdown("SIGINT")
);

startServer();