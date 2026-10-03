import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(5000),

  MONGO_URI: z
    .string()
    .min(1, "MONGO_URI is required"),

  CLIENT_URL: z
    .url("CLIENT_URL must be a valid URL")
    .default("http://localhost:5173")
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment variables:");

  console.error(
    JSON.stringify(result.error.flatten().fieldErrors, null, 2)
  );

  process.exit(1);
}

export const env = result.data;