import { env } from "../config/env.js";

export const setRefreshTokenCookie = (
  res,
  refreshToken
) => {
  const maxAge =
    env.REFRESH_TOKEN_EXPIRES_DAYS *
    24 *
    60 *
    60 *
    1000;

  res.cookie(
    env.COOKIE_NAME,
    refreshToken,
    {
      httpOnly: true,

      secure:
        env.NODE_ENV === "production",

      sameSite:
        env.NODE_ENV === "production"
          ? "none"
          : "lax",

      maxAge,

      path: "/api/auth",
    }
  );
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie(
    env.COOKIE_NAME,
    {
      httpOnly: true,

      secure:
        env.NODE_ENV === "production",

      sameSite:
        env.NODE_ENV === "production"
          ? "none"
          : "lax",

      path: "/api/auth",
    }
  );
};