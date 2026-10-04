import { Server } from "socket.io";

import { env } from "../config/env.js";

import {
  socketAuth,
} from "./socketAuth.middleware.js";

import {
  registerMeetingSocket,
  handleSocketDisconnect,
} from "./meeting.socket.js";

export const initializeSocket =
  (httpServer) => {
    const io = new Server(
      httpServer,
      {
        cors: {
          origin:
            env.CLIENT_URL,

          credentials: true,
        },

        transports: [
          "websocket",
          "polling",
        ],

        pingTimeout: 20000,

        pingInterval: 25000,
      }
    );

    /*
     * Authenticate every Socket.IO
     * connection before accepting it.
     */
    io.use(socketAuth);

    io.on(
      "connection",
      (socket) => {
        console.log(
          `🔌 Socket connected: ${socket.id} | User: ${socket.user.id}`
        );

        registerMeetingSocket(
          io,
          socket
        );

        socket.on(
          "disconnect",
          async (
            reason
          ) => {
            console.log(
              `🔌 Socket disconnected: ${socket.id} | Reason: ${reason}`
            );

            await handleSocketDisconnect(
              io,
              socket
            );
          }
        );
      }
    );

    return io;
  };