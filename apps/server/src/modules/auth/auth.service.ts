import bcrypt from "bcryptjs";
import { prisma } from "../../db/prisma.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";
import { sendPasswordResetEmail } from "../../utils/email.js";
import type { SignupInput, LoginInput } from "./auth.schema.js";

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const PASSWORD_HASH_ROUNDS = 12;
const RESET_TOKEN_TTL_MINUTES = 30;

async function issueSession(userId: string, deviceId?: string) {
  const accessToken = signAccessToken({ userId });
  const refreshToken = signRefreshToken({ userId });
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  await prisma.refreshToken.create({
    data: { userId, tokenHash: refreshTokenHash, deviceId },
  });

  return { accessToken, refreshToken };
}

export async function signup(input: Omit<SignupInput, "confirmPassword">) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) {
    throw new AuthError("An account with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      displayName: input.displayName,
    },
  });

  const session = await issueSession(user.id, input.deviceId);
  return { user, ...session };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });

  // Deliberately identical error for "no such user" and "wrong password" —
  // distinguishing them lets an attacker enumerate which emails have
  // accounts.
  if (!user) {
    throw new AuthError("Incorrect email or password", 401);
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValid) {
    throw new AuthError("Incorrect email or password", 401);
  }

  const session = await issueSession(user.id, input.deviceId);
  return { user, ...session };
}

export async function refreshAccessToken(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthError("Invalid or expired refresh token", 401);
  }

  const storedTokens = await prisma.refreshToken.findMany({
    where: { userId: payload.userId, revokedAt: null },
  });

  const matchingToken = await Promise.all(
    storedTokens.map(async (t) => ({ t, match: await bcrypt.compare(refreshToken, t.tokenHash) }))
  ).then((results) => results.find((r) => r.match)?.t);

  if (!matchingToken) {
    throw new AuthError("Refresh token not recognized — please log in again", 401);
  }

  const newAccessToken = signAccessToken({ userId: payload.userId });
  return { accessToken: newAccessToken };
}

export async function logout(userId: string, refreshToken: string) {
  const storedTokens = await prisma.refreshToken.findMany({
    where: { userId, revokedAt: null },
  });

  for (const t of storedTokens) {
    if (await bcrypt.compare(refreshToken, t.tokenHash)) {
      await prisma.refreshToken.update({
        where: { id: t.id },
        data: { revokedAt: new Date() },
      });
      break;
    }
  }
}

export async function requestPasswordReset(email: string, appResetUrlBase: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Always respond as if the email was sent, whether or not the account
  // exists — otherwise this endpoint becomes an account-enumeration oracle.
  if (!user) return;

  // 6-digit code, same UX as a text OTP but delivered by email — stored
  // hashed like a password, single-use, short-lived.
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  const tokenHash = await bcrypt.hash(token, 10);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });

  await sendPasswordResetEmail(user.email, token, appResetUrlBase);
}

export async function confirmPasswordReset(email: string, token: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new AuthError("Invalid or expired reset code", 400);

  const candidates = await prisma.passwordResetToken.findMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  let matched: (typeof candidates)[number] | undefined;
  for (const c of candidates) {
    if (await bcrypt.compare(token, c.tokenHash)) {
      matched = c;
      break;
    }
  }

  if (!matched) throw new AuthError("Invalid or expired reset code", 400);

  const passwordHash = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: matched.id }, data: { usedAt: new Date() } }),
    // Invalidate all existing sessions on password change — standard
    // security practice so a stolen refresh token stops working.
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
