import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_ORIGIN: z.string().default("http://localhost:8081"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be set to a long random string"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be set to a long random string"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  // Email delivery (password reset). Optional — without it, reset links are
  // only logged to the server console (development-only behavior, see
  // utils/email.ts). This is NOT acceptable for real users; it exists so the
  // whole app runs with zero paid services during development.
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),

  // S3-compatible media storage. All optional — without these, media uploads
  // fall back to local disk storage on the server itself (see
  // modules/media/media.service.ts). Previously these were read by
  // media.service.ts without being declared here, which is an
  // environment-validation bug: TypeScript had no real type for them and a
  // typo'd variable name would fail silently instead of at startup. Fixed by
  // declaring them explicitly.
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().url().optional(),

  // Push notifications (Expo push service) need no separate credentials —
  // nothing to declare here. TURN relay for WebRTC calls, optional:
  TURN_URL: z.string().optional(),
  TURN_USERNAME: z.string().optional(),
  TURN_CREDENTIAL: z.string().optional(),
});

const parsed = envSchema.superRefine((value, ctx) => {
  const s3Fields = [value.S3_BUCKET, value.S3_ACCESS_KEY_ID, value.S3_SECRET_ACCESS_KEY];
  const hasAnyS3 = s3Fields.some(Boolean);
  const hasAllS3 = s3Fields.every(Boolean);
  if (hasAnyS3 && !hasAllS3) {
    ctx.addIssue({ code: "custom", path: ["S3_BUCKET"], message: "S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be provided together" });
  }
}).safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables — check .env against .env.example");
}

export const env = parsed.data;

// Fail loudly and immediately in production if storage/email fall back to
// dev-only behavior — better than silently degrading for real users.
if (env.NODE_ENV === "production") {
  const missing: string[] = [];
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    missing.push("S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY (media uploads will use local disk, which does not survive Railway redeploys)");
  }
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
    missing.push("GMAIL_USER / GMAIL_APP_PASSWORD (password reset emails will only be logged, not sent)");
  }
  if (missing.length > 0) {
    throw new Error("Production configuration incomplete:\n" + missing.map((m) => `   - ${m}`).join("\n"));
  }
}
