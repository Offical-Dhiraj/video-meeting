import crypto from "crypto";

const CHARACTERS =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateMeetingId = (
  length = 10
) => {
  let result = "";

  const randomBytes =
    crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    result +=
      CHARACTERS[
        randomBytes[i] %
          CHARACTERS.length
      ];
  }

  return result;
};