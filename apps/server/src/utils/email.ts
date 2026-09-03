import nodemailer from "nodemailer";
import { logger } from "./logger.js";
import { env } from "../config/env.js";

let gmailTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getGmailTransporter() {
  if (!gmailTransporter && env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    gmailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    });
  }
  return gmailTransporter;
}

/**
 * Sends a password-reset email via Gmail SMTP (free — needs a Gmail App
 * Password, see .env.example). Without Gmail credentials configured, the
 * link is only logged to the server console — clearly a development-only
 * fallback, never presented to the user as "email sent" when it wasn't.
 */
export async function sendPasswordResetEmail(email: string, resetToken: string, appResetUrlBase: string) {
  const resetLink = `${appResetUrlBase}?token=${resetToken}`;
  const transporter = getGmailTransporter();

  if (!transporter) {
    logger.warn(
      { email, resetLink },
      "⚠️  No Gmail credentials configured (GMAIL_USER / GMAIL_APP_PASSWORD) — password reset link logged to console only, NOT sent. Do not rely on this in production."
    );
    return { sent: false as const };
  }

  await transporter.sendMail({
    from: `Sainn <${env.GMAIL_USER}>`,
    to: email,
    subject: "Reset your Sainn password",
    text: `Reset your password using this code: ${resetToken}\n\nThis code expires in 30 minutes. If you didn't request this, ignore this email.`,
    html: `<p>Use this code to reset your Sainn password:</p><h2 style="letter-spacing:4px">${resetToken}</h2><p>This code expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>`,
  });

  return { sent: true as const };
}
