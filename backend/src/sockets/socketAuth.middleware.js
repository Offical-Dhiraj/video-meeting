import User from "../models/User.js";
import Session from "../models/Session.js";

import {
  verifyAccessToken,
} from "../utils/token.js";

export const socketAuth =
  async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token;

      if (!token) {
        return next(
          new Error(
            "Authentication token required"
          )
        );
      }

      const payload =
        verifyAccessToken(token);

      if (
        !payload.sub ||
        !payload.sid
      ) {
        return next(
          new Error(
            "Invalid authentication token"
          )
        );
      }

      /*
       * Verify that the session still exists
       * and has not been revoked.
       */
      const session =
        await Session.findOne({
          _id: payload.sid,
          user: payload.sub,
          revokedAt: null,
          expiresAt: {
            $gt: new Date(),
          },
        });

      if (!session) {
        return next(
          new Error(
            "Session expired or revoked"
          )
        );
      }

      const user =
        await User.findById(
          payload.sub
        );

      if (!user) {
        return next(
          new Error(
            "User account not found"
          )
        );
      }

      /*
       * Attach authenticated user
       * information to socket.
       */
      socket.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      };

      socket.sessionId =
        payload.sid;

      next();
    } catch (error) {
      console.error(
        "Socket authentication failed:",
        error.message
      );

      next(
        new Error(
          "Socket authentication failed"
        )
      );
    }
  };