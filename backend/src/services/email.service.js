import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const hasSMTP =
  env.SMTP_HOST &&
  env.SMTP_USER &&
  env.SMTP_PASSWORD;

const transporter = hasSMTP
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    })
  : null;

const sendEmail = async ({
  to,
  subject,
  html,
}) => {
  if (!transporter) {
    console.log("\n========== EMAIL DEBUG ==========");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("HTML:", html);
    console.log("=================================\n");

    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
  });
};

export const sendVerificationEmail = async ({
  email,
  name,
  verificationUrl,
}) => {
  await sendEmail({
    to: email,
    subject: "Verify your MeetFlow account",
    html: `
      <h2>Welcome to MeetFlow, ${name}</h2>

      <p>
        Please verify your email address to activate your account.
      </p>

      <p>
        <a href="${verificationUrl}">
          Verify Email
        </a>
      </p>

      <p>
        This link will expire in 30 minutes.
      </p>
    `,
  });
};

export const sendPasswordResetEmail = async ({
  email,
  name,
  resetUrl,
}) => {
  await sendEmail({
    to: email,
    subject: "Reset your MeetFlow password",
    html: `
      <h2>Password Reset</h2>

      <p>Hello ${name},</p>

      <p>
        We received a request to reset your MeetFlow password.
      </p>

      <p>
        <a href="${resetUrl}">
          Reset Password
        </a>
      </p>

      <p>
        This link will expire in 15 minutes.
      </p>
    `,
  });
};