import { z } from "zod";

const settingsSchema = z
  .object({
    waitingRoom: z
      .boolean()
      .optional(),

    requirePassword: z
      .boolean()
      .optional(),

    allowChat: z
      .boolean()
      .optional(),

    allowScreenShare: z
      .boolean()
      .optional(),

    allowParticipantUnmute: z
      .boolean()
      .optional(),
  })
  .optional();

export const createMeetingSchema =
  z.object({
    title: z
      .string()
      .trim()
      .min(3)
      .max(150),

    password: z
      .string()
      .min(4)
      .max(100)
      .optional(),

    scheduledAt: z
      .string()
      .datetime()
      .optional(),

    settings: settingsSchema,
  });

export const updateMeetingSchema =
  z.object({
    title: z
      .string()
      .trim()
      .min(3)
      .max(150)
      .optional(),

    password: z
      .string()
      .min(4)
      .max(100)
      .nullable()
      .optional(),

    scheduledAt: z
      .string()
      .datetime()
      .nullable()
      .optional(),

    settings: settingsSchema,
  });

export const joinMeetingSchema =
  z.object({
    password: z
      .string()
      .optional(),
  });